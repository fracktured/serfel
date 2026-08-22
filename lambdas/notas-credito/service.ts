import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import {
  t10MUsuario, t10MCliente, t20MProducto, t40MVenta, t40MProductoVenta, t40MNotaCredito,
  t40MFoliosElectronicos, t40MProdNotaCredito, t50MStock, t99PImpuesto, type Db,
} from "@serfel/db";
import {
  TIPO_DOCTO_FACTURA_ELECTRONICA, TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
  COD_REF_ANULA, computeNcTotales, buildFlatFile,
  ESTADO_FINALIZADO, IMPUESTO_IVA, IMPUESTO_ESPEC, BODEGA_CENTRAL, DTE_NOTA_CREDITO_ELECTRONICA,
  type VentaCreditableDto, type NcLineaDto, type EmitirNcInput, type EmitirNcResultDto,
  type EmisorEvent, type EmisorResult, type NotaCreditoListItemDto,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

/** 99_p_estado: 2 = "En Proceso" — the NC sits here until the emisor confirms the DTE. */
const ESTADO_PENDIENTE = 2;

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

/**
 * Sums only successfully-emitted NCs (esNotaCredElectronica = 1) against a venta.
 * A PENDIENTE/failed draft (esNotaCredElectronica = 0) must NOT count — otherwise
 * a failed emisor call would permanently lock the venta out of retry via the
 * over-credit guard.
 */
async function montoYaCreditado(db: DbOrTx, idVenta: number): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${t40MNotaCredito.precioTotal}), 0)` })
    .from(t40MNotaCredito)
    .where(and(eq(t40MNotaCredito.idVenta, idVenta), eq(t40MNotaCredito.esNotaCredElectronica, 1)));
  return Number(rows[0]?.total ?? 0);
}

async function lineasDeVenta(db: DbOrTx, idVenta: number): Promise<NcLineaDto[]> {
  const rows = await db
    .select({
      idProducto: t40MProductoVenta.idProducto,
      codSerfel: t20MProducto.codSerfel,
      descripcion: t20MProducto.nomProducto,
      cantidad: t40MProductoVenta.cantidad,
      precio: t40MProductoVenta.precio,
      porcenDesc: t40MProductoVenta.porcenDesc,
      impuesto: t20MProducto.impuesto,
    })
    .from(t40MProductoVenta)
    .innerJoin(t20MProducto, eq(t40MProductoVenta.idProducto, t20MProducto.idProducto))
    .where(eq(t40MProductoVenta.idVenta, idVenta));
  return rows.map((r) => ({
    idProducto: r.idProducto, codSerfel: r.codSerfel, descripcion: r.descripcion,
    cantidad: Number(r.cantidad), precio: r.precio, porcenDesc: r.porcenDesc, impuesto: r.impuesto,
  }));
}

async function ventaHeader(db: DbOrTx, idVenta: number) {
  const rows = await db
    .select({
      idVenta: t40MVenta.idVenta, idFolio: t40MVenta.idFolio, numDoctoEmitido: t40MVenta.numDoctoEmitido,
      fechaVenta: t40MVenta.fechaVenta, rutEmpresa: t40MVenta.rutEmpresa, rutCliente: t40MVenta.rutCliente,
      precioTotal: t40MVenta.precioTotal, idTipoDoctoEmitido: t40MVenta.idTipoDoctoEmitido,
      nomCliente: t10MCliente.nomFantasia,
    })
    .from(t40MVenta)
    .innerJoin(t10MCliente, eq(t40MVenta.rutCliente, t10MCliente.rutCliente))
    .where(eq(t40MVenta.idVenta, idVenta))
    .limit(1);
  return rows[0] ?? null;
}

export async function getVentaCreditable(db: Db, idVenta: number): Promise<VentaCreditableDto | null> {
  const h = await ventaHeader(db, idVenta);
  if (!h || h.idTipoDoctoEmitido !== TIPO_DOCTO_FACTURA_ELECTRONICA) return null;
  const [lineas, creditado] = await Promise.all([lineasDeVenta(db, idVenta), montoYaCreditado(db, idVenta)]);
  return {
    idVenta: h.idVenta, idFolio: h.idFolio, numDoctoEmitido: h.numDoctoEmitido, fechaVenta: h.fechaVenta,
    rutEmpresa: h.rutEmpresa, rutCliente: h.rutCliente, nomCliente: h.nomCliente,
    precioTotal: h.precioTotal, montoYaCreditado: creditado, lineas,
  };
}

export async function resolveNextFolio(tx: Tx, rutEmpresa: number): Promise<number> {
  const ranges = await tx
    .select()
    .from(t40MFoliosElectronicos)
    .where(and(
      eq(t40MFoliosElectronicos.rutEmpresa, rutEmpresa),
      eq(t40MFoliosElectronicos.idTipoDocto, TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA),
    ))
    .orderBy(desc(t40MFoliosElectronicos.id))
    .limit(1);
  if (ranges.length === 0) {
    throw new AppError("VALIDACION", 409, `No hay rango de folios de nota de crédito para la empresa ${rutEmpresa}`);
  }
  const r = ranges[0];

  // Highest folio already reserved by a pendiente/emitida NC within this range.
  const usados = await tx
    .select({ maxFolio: sql<number>`COALESCE(MAX(${t40MNotaCredito.idFolio}), 0)` })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(and(
      eq(t40MVenta.rutEmpresa, rutEmpresa),
      gte(t40MNotaCredito.idFolio, r.folioDesde),
      lte(t40MNotaCredito.idFolio, r.folioHasta),
    ));
  const maxUsado = Number(usados[0]?.maxFolio ?? 0);
  const next = Math.max(r.folioDesde, r.ultFolio + 1, maxUsado + 1);
  if (next > r.folioHasta) {
    throw new AppError("VALIDACION", 409, `Rango de folios agotado para la empresa ${rutEmpresa}`);
  }
  return next;
}

export async function searchVentasCreditables(db: Db, q: string): Promise<VentaCreditableDto[]> {
  const trimmed = q.trim();
  const rows = await db
    .select({ idVenta: t40MVenta.idVenta })
    .from(t40MVenta)
    .where(and(
      eq(t40MVenta.idTipoDoctoEmitido, TIPO_DOCTO_FACTURA_ELECTRONICA),
      like(sql`CAST(${t40MVenta.idFolio} AS CHAR)`, `%${trimmed}%`),
    ))
    .limit(50);
  const out: VentaCreditableDto[] = [];
  for (const r of rows) {
    const v = await getVentaCreditable(db, r.idVenta);
    if (v) out.push(v);
  }
  return out;
}

/**
 * Emits a nota de crédito against an electronic-invoice venta.
 *
 * Flow: over-credit guard → compute totales → resolve+commit the folio →
 * insert the NC (PENDIENTE) + its prod rows in a committed txn → build the
 * flat file → invoke the emisor. On emisor failure the NC stays PENDIENTE
 * (retryable) and neither ult_folio nor stock move. On success, a final txn
 * marks the NC FINALIZADO/electrónica, bumps ult_folio, and restitutes stock.
 * 40_m_venta / 40_m_producto_venta are never touched.
 */
export async function emitirNotaCredito(
  db: Db,
  invokeEmisor: (e: EmisorEvent) => Promise<EmisorResult>,
  input: EmitirNcInput,
  idUsuario: number,
): Promise<EmitirNcResultDto> {
  const venta = await getVentaCreditable(db, input.idVenta);
  if (!venta) throw new AppError("VALIDACION", 400, "La venta no existe o no es Factura Electrónica");
  if (venta.montoYaCreditado >= venta.precioTotal) {
    throw new AppError("VALIDACION", 409, "La factura ya fue acreditada en su totalidad");
  }

  // Impuesto rates (IVA / ESPEC / IABA-by-id) used by computeNcTotales.
  const impuestos = await db.select({ id: t99PImpuesto.idImpuesto, valor: t99PImpuesto.valor }).from(t99PImpuesto);
  const rateMap = new Map(impuestos.map((i) => [i.id, i.valor]));
  const ivaValor = rateMap.get(IMPUESTO_IVA) ?? 0;
  const especValor = rateMap.get(IMPUESTO_ESPEC) ?? 0;
  const rateOf = (id: number) => rateMap.get(id) ?? null;

  // Each input line inherits its impuesto from the original venta line for the same producto.
  const ventaLineaByProd = new Map(venta.lineas.map((l) => [l.idProducto, l]));
  const calcLineas = input.lineas.map((l) => ({
    cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc,
    impuesto: ventaLineaByProd.get(l.idProducto)?.impuesto ?? 0,
  }));
  const totales = computeNcTotales(calcLineas, { ivaValor, especValor, rateOf });

  // Reuse an existing PENDIENTE draft for this venta (a prior failed emisor call),
  // instead of resolving a new folio and inserting a second NC row. This keeps the
  // "retryable, same folio, no gaps" promise: the failed draft's folio is reused
  // rather than abandoned, and the venta isn't left permanently blocked.
  const now = nowDateTime();
  const pendiente = await db
    .select({ idNotaCredito: t40MNotaCredito.idNotaCredito, idFolio: t40MNotaCredito.idFolio })
    .from(t40MNotaCredito)
    .where(and(
      eq(t40MNotaCredito.idVenta, venta.idVenta),
      eq(t40MNotaCredito.idEstado, ESTADO_PENDIENTE),
      eq(t40MNotaCredito.esNotaCredElectronica, 0),
    ))
    .orderBy(desc(t40MNotaCredito.idNotaCredito))
    .limit(1);

  let idFolio: number;
  let idNotaCredito: number;
  if (pendiente.length > 0) {
    // Reuse: same idNotaCredito + idFolio, refresh totales/líneas/motivo.
    idFolio = pendiente[0].idFolio;
    idNotaCredito = pendiente[0].idNotaCredito;
    await db.transaction(async (tx) => {
      await tx.update(t40MNotaCredito).set({
        iva: totales.iva, iaba: totales.iaba, espec: totales.espec, subTotal: totales.subTotal,
        idMotivo: input.idMotivo, precioTotal: totales.precioTotal,
        idUsuarioMod: idUsuario, ultFechaMod: now,
      }).where(eq(t40MNotaCredito.idNotaCredito, idNotaCredito));
      await tx.delete(t40MProdNotaCredito).where(eq(t40MProdNotaCredito.idNotaCredito, idNotaCredito));
      for (const l of input.lineas) {
        await tx.insert(t40MProdNotaCredito).values({
          idNotaCredito, idProducto: l.idProducto,
          cantidad: l.cantidad.toString(), precio: l.precio, porcenDesc: l.porcenDesc,
        });
      }
    });
  } else {
    // No reusable draft: resolve+commit a new folio, then insert the NC (PENDIENTE) + its
    // líneas — committed before the external emisor call, so a failed invocation leaves a
    // retryable pendiente row instead of nothing.
    idFolio = await db.transaction((tx) => resolveNextFolio(tx, venta.rutEmpresa));
    idNotaCredito = await db.transaction(async (tx) => {
      const [header] = await tx.insert(t40MNotaCredito).values({
        idVenta: venta.idVenta,
        numNotaCredito: idFolio,
        idTipoDoctoEmitido: TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
        rutEmpresa: venta.rutEmpresa,
        iva: totales.iva, iaba: totales.iaba, espec: totales.espec, subTotal: totales.subTotal,
        idMotivo: input.idMotivo, idUsuario, fechaNotaCredito: now, precioTotal: totales.precioTotal,
        idEstado: ESTADO_PENDIENTE, esNotaCredElectronica: 0,
        idUsuarioMod: idUsuario, ultFechaMod: now, idFolio,
      });
      const idNc = header.insertId;
      for (const l of input.lineas) {
        await tx.insert(t40MProdNotaCredito).values({
          idNotaCredito: idNc, idProducto: l.idProducto,
          cantidad: l.cantidad.toString(), precio: l.precio, porcenDesc: l.porcenDesc,
        });
      }
      return idNc;
    });
  }

  // Build the flat file for facturación.cl and emit.
  const flat = buildFlatFile({
    folio: idFolio,
    fecha: now.slice(0, 10),
    rutReceptor: String(venta.rutCliente), rsReceptor: venta.nomCliente,
    giroReceptor: "", dirReceptor: "", comReceptor: "", ciuReceptor: "", emailReceptor: "",
    totales,
    lineas: input.lineas.map((l) => {
      const vl = ventaLineaByProd.get(l.idProducto);
      const bruto = Math.round(l.cantidad * l.precio);
      return {
        codigo: vl ? String(vl.codSerfel) : String(l.idProducto),
        descripcion: vl?.descripcion ?? "",
        cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc,
        valor: bruto - Math.round((bruto * l.porcenDesc) / 100),
      };
    }),
    referencia: {
      folioRef: venta.idFolio, fchRef: venta.fechaVenta.slice(0, 10),
      codRef: input.codRef, razonRef: String(input.idMotivo),
    },
  });

  const emitResult = await invokeEmisor({
    op: "procesar",
    rutEmpresa: String(venta.rutEmpresa),
    flatFileBase64: Buffer.from(flat, "utf8").toString("base64"),
  });
  if (!emitResult.ok) {
    // NC stays PENDIENTE (retryable): do not touch ult_folio or stock.
    throw new AppError("VALIDACION", 502, `facturación.cl rechazó la NC: ${emitResult.error ?? "desconocido"}`);
  }

  // Success: mark electrónica, bump ult_folio, and restitute stock — one committed txn.
  await db.transaction(async (tx) => {
    await tx.update(t40MNotaCredito).set({
      esNotaCredElectronica: 1, idEstado: ESTADO_FINALIZADO,
      urlPdfOriginal: emitResult.urlPdfOriginal ?? "", urlPdfCedible: emitResult.urlPdfCedible ?? "",
      idUsuarioMod: idUsuario, ultFechaMod: nowDateTime(),
    }).where(eq(t40MNotaCredito.idNotaCredito, idNotaCredito));

    await tx.update(t40MFoliosElectronicos)
      .set({ ultFolio: idFolio })
      .where(and(
        eq(t40MFoliosElectronicos.rutEmpresa, venta.rutEmpresa),
        eq(t40MFoliosElectronicos.idTipoDocto, TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA),
        sql`${t40MFoliosElectronicos.ultFolio} < ${idFolio}`,
      ));

    // Stock restitution: a full anulación restitutes every line regardless of
    // intent; a corrige-montos NC restitutes a line only when its explicit
    // restituirStock flag says the goods physically came back (a price-only
    // correction must not move stock even though cantidad is positive).
    for (const l of input.lineas) {
      if (input.codRef === COD_REF_ANULA || l.restituirStock) {
        await tx.update(t50MStock)
          .set({ cantidad: sql`${t50MStock.cantidad} + ${l.cantidad}` })
          .where(and(eq(t50MStock.idBodega, BODEGA_CENTRAL), eq(t50MStock.idProducto, l.idProducto)));
      }
    }
  });

  return {
    idNotaCredito, idFolio, esElectronica: true,
    urlPdfOriginal: emitResult.urlPdfOriginal ?? "", urlPdfCedible: emitResult.urlPdfCedible ?? "",
  };
}

export async function listNotasCredito(db: Db): Promise<NotaCreditoListItemDto[]> {
  const rows = await db
    .select({
      idNotaCredito: t40MNotaCredito.idNotaCredito, idVenta: t40MNotaCredito.idVenta,
      idFolio: t40MNotaCredito.idFolio, numNotaCredito: t40MNotaCredito.numNotaCredito,
      fechaNotaCredito: t40MNotaCredito.fechaNotaCredito, precioTotal: t40MNotaCredito.precioTotal,
      esElectronica: t40MNotaCredito.esNotaCredElectronica,
      rutCliente: t40MVenta.rutCliente, nomCliente: t10MCliente.nomFantasia,
    })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .innerJoin(t10MCliente, eq(t40MVenta.rutCliente, t10MCliente.rutCliente))
    .orderBy(desc(t40MNotaCredito.idNotaCredito))
    .limit(200);
  return rows.map((r) => ({
    idNotaCredito: r.idNotaCredito, idVenta: r.idVenta, idFolio: r.idFolio, numNotaCredito: r.numNotaCredito,
    rutCliente: r.rutCliente, nomCliente: r.nomCliente, fechaNotaCredito: r.fechaNotaCredito,
    precioTotal: r.precioTotal, esElectronica: r.esElectronica === 1,
  }));
}

export async function getPdfLinks(
  db: Db, invokeEmisor: (e: EmisorEvent) => Promise<EmisorResult>, idNotaCredito: number,
): Promise<{ urlPdfOriginal: string; urlPdfCedible: string }> {
  const rows = await db
    .select({ idFolio: t40MNotaCredito.idFolio, rutEmpresa: t40MNotaCredito.rutEmpresa })
    .from(t40MNotaCredito).where(eq(t40MNotaCredito.idNotaCredito, idNotaCredito)).limit(1);
  if (rows.length === 0) throw new AppError("VALIDACION", 404, "Nota de crédito no encontrada");
  const { idFolio, rutEmpresa } = rows[0];
  const [orig, ced] = await Promise.all([
    invokeEmisor({ op: "obtenerlink", rutEmpresa: String(rutEmpresa), folio: idFolio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: false }),
    invokeEmisor({ op: "obtenerlink", rutEmpresa: String(rutEmpresa), folio: idFolio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: true }),
  ]);
  return { urlPdfOriginal: orig.url ?? "", urlPdfCedible: ced.url ?? "" };
}
