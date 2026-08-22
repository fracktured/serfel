import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import {
  t10MUsuario, t10MCliente, t20MProducto, t40MVenta, t40MProductoVenta, t40MNotaCredito,
  t40MFoliosElectronicos, type Db,
} from "@serfel/db";
import {
  TIPO_DOCTO_FACTURA_ELECTRONICA, TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
  type VentaCreditableDto, type NcLineaDto,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

async function montoYaCreditado(db: DbOrTx, idVenta: number): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${t40MNotaCredito.precioTotal}), 0)` })
    .from(t40MNotaCredito)
    .where(eq(t40MNotaCredito.idVenta, idVenta));
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
