import { and, asc, eq, ne, notExists, sql } from "drizzle-orm";
import {
  t10MUsuario,
  t10MEmpresa,
  t10MCliente,
  t10MLocalCliente,
  t20MProducto,
  t30MPedido,
  t30MProductoPedido,
  t40MVenta,
  t40MProductoVenta,
  t50MStock,
  t99PImpuesto,
  type Db,
} from "@serfel/db";
import {
  BODEGA_CENTRAL,
  ESTADO_ACTIVO,
  ESTADO_ANULADO,
  ESTADO_FINALIZADO,
  IMPUESTO_ESPEC,
  IMPUESTO_IVA,
  TIPO_DOCTO_FACTURA,
  type EmpresaDto,
  type PedidoPendienteDto,
  type PrefacturaBatchInput,
  type PrefacturaBatchResult,
  type PrefacturaResultItem,
} from "@serfel/shared";
import { AppError } from "./errors";

/** drizzle transaction object — same query API as Db for our purposes. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function listEmpresas(db: Db): Promise<EmpresaDto[]> {
  // 10_m_empresa PK is composite (rut_empresa, ult_fecha_mod): a rut can have
  // multiple rows. Return one row per rut — the latest by ult_fecha_mod.
  const latest = db
    .select({
      rutEmpresa: t10MEmpresa.rutEmpresa,
      maxFecha: sql<string>`MAX(${t10MEmpresa.ultFechaMod})`.as("max_fecha"),
    })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.idEstado, ESTADO_ACTIVO))
    .groupBy(t10MEmpresa.rutEmpresa)
    .as("latest");

  const rows = await db
    .select({
      rutEmpresa: t10MEmpresa.rutEmpresa,
      dv: t10MEmpresa.dvEmpresa,
      razonSocial: t10MEmpresa.razonSocial,
    })
    .from(t10MEmpresa)
    .innerJoin(
      latest,
      and(
        eq(t10MEmpresa.rutEmpresa, latest.rutEmpresa),
        eq(t10MEmpresa.ultFechaMod, latest.maxFecha)
      )
    )
    .where(eq(t10MEmpresa.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t10MEmpresa.razonSocial));
  return rows;
}

function fullName(nom: string, ap: string | null, am: string | null): string {
  return [nom, ap ?? "", am ?? ""].join(" ").replace(/\s+/g, " ").trim();
}

export async function listPendientes(db: Db): Promise<PedidoPendienteDto[]> {
  const rows = await db
    .select({
      idPedido: t30MPedido.idPedido,
      fecha: t30MPedido.fechaPedido,
      precioTotal: t30MPedido.precioTotal,
      rutCliente: t10MCliente.rutCliente,
      dvCliente: t10MCliente.dvCliente,
      nomFantasia: t10MCliente.nomFantasia,
      nomLocal: t10MLocalCliente.nomLocalCliente,
      nomContacto: t10MLocalCliente.nomContacto,
      apellPatContacto: t10MLocalCliente.apellPatContacto,
      apellMatContacto: t10MLocalCliente.apellMatContacto,
      nomVendedor: t10MUsuario.nomUsuario,
      apellPatVendedor: t10MUsuario.apellPatUsuario,
      apellMatVendedor: t10MUsuario.apellMatUsuario,
    })
    .from(t30MPedido)
    .innerJoin(t10MLocalCliente, eq(t30MPedido.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .innerJoin(t10MCliente, eq(t10MLocalCliente.rutCliente, t10MCliente.rutCliente))
    .innerJoin(t10MUsuario, eq(t30MPedido.idUsuario, t10MUsuario.idUsuario))
    .where(
      and(
        eq(t30MPedido.idEstado, ESTADO_ACTIVO),
        notExists(
          db
            .select({ x: sql`1` })
            .from(t40MVenta)
            .where(
              and(
                eq(t40MVenta.idPedido, t30MPedido.idPedido),
                ne(t40MVenta.idEstado, ESTADO_ANULADO)
              )
            )
        )
      )
    )
    .orderBy(asc(t30MPedido.idPedido));

  return rows.map((r) => ({
    idPedido: r.idPedido,
    fecha: r.fecha,
    rutCliente: r.rutCliente,
    dvCliente: r.dvCliente,
    nomFantasia: r.nomFantasia,
    nomLocal: r.nomLocal,
    contacto: fullName(r.nomContacto ?? "", r.apellPatContacto, r.apellMatContacto),
    vendedor: fullName(r.nomVendedor, r.apellPatVendedor, r.apellMatVendedor),
    precioTotal: r.precioTotal,
  }));
}

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const subTotal = (cantidad: number, precio: number) => Math.round(cantidad * precio);
const montoDescSubTotal = (st: number, porcenDesc: number) => Math.round((st * porcenDesc) / 100);
const subTotalConDesc = (st: number, porcenDesc: number) => st - montoDescSubTotal(st, porcenDesc);

/** Thrown inside a pedido's transaction to abort + roll back with a reason. */
class PedidoError extends Error {}

/**
 * Batch pre-invoicing. Each pedido runs in its own transaction so a failure
 * rolls back only that pedido; every pedido is processed and reported.
 * Ported from lambdas/node-app-1/src/services/venta.service.ts.
 */
export async function prefacturarBatch(
  db: Db,
  input: PrefacturaBatchInput,
  idUsuario: number
): Promise<PrefacturaBatchResult> {
  // Tax rates loaded once for the whole batch.
  const impuestos = await db
    .select({ id: t99PImpuesto.idImpuesto, valor: t99PImpuesto.valor })
    .from(t99PImpuesto);
  const rateOf = (id: number): number | null => {
    const row = impuestos.find((i) => i.id === id);
    return row ? row.valor : null;
  };
  const ivaValor = rateOf(IMPUESTO_IVA);
  const especValor = rateOf(IMPUESTO_ESPEC);
  if (ivaValor === null) throw new AppError("VALIDACION", 500, "IVA no existe");
  if (especValor === null) throw new AppError("VALIDACION", 500, "ESPEC no existe");

  const uniqueIds = [...new Set(input.idPedidos)];
  const resultados: PrefacturaResultItem[] = [];

  for (const idPedido of uniqueIds) {
    const mensajes: string[] = [];
    try {
      const idVenta = await db.transaction(async (tx) => {
        return prefacturarUno(tx, idPedido, input.rutEmpresa, idUsuario, ivaValor, especValor, rateOf, mensajes);
      });
      resultados.push({ idPedido, status: "facturado", idVenta, mensajes });
    } catch (err) {
      if (err instanceof PedidoError) {
        resultados.push({ idPedido, status: "error", mensajes, error: err.message });
      } else {
        resultados.push({
          idPedido,
          status: "error",
          mensajes,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }
  }

  return {
    resultados,
    facturados: resultados.filter((r) => r.status === "facturado").length,
    errores: resultados.filter((r) => r.status === "error").length,
  };
}

async function prefacturarUno(
  tx: Tx,
  idPedido: number,
  rutEmpresa: number,
  idUsuario: number,
  ivaValor: number,
  especValor: number,
  rateOf: (idImpuesto: number) => number | null,
  mensajes: string[]
): Promise<number> {
  // Guard: no existing non-anulada venta (re-checked inside the txn).
  const existente = await tx
    .select({ idVenta: t40MVenta.idVenta, num: t40MVenta.numDoctoEmitido })
    .from(t40MVenta)
    .where(and(eq(t40MVenta.idPedido, idPedido), ne(t40MVenta.idEstado, ESTADO_ANULADO)))
    .limit(1);
  if (existente.length > 0) {
    throw new PedidoError(
      `Pedido [${idPedido}] se encuentra asociado a Venta [${existente[0].idVenta}] factura n° ${existente[0].num}`
    );
  }

  const pedidoRows = await tx
    .select({ idEstado: t30MPedido.idEstado, idLocalCliente: t30MPedido.idLocalCliente, idUsuario: t30MPedido.idUsuario })
    .from(t30MPedido)
    .where(eq(t30MPedido.idPedido, idPedido))
    .limit(1);
  if (pedidoRows.length === 0) throw new PedidoError(`Pedido [${idPedido}] no existe`);
  const pedido = pedidoRows[0];
  if (pedido.idEstado !== ESTADO_ACTIVO) throw new PedidoError(`Pedido [${idPedido}] no se encuentra activo`);

  // Guard: reject porcionado products.
  const porcion = await tx
    .select({ x: sql`1` })
    .from(t30MProductoPedido)
    .innerJoin(t20MProducto, eq(t30MProductoPedido.idProducto, t20MProducto.idProducto))
    .where(and(eq(t30MProductoPedido.idPedido, idPedido), eq(t20MProducto.usaPorciones, 1)))
    .limit(1);
  if (porcion.length > 0) throw new PedidoError(`Pedido [${idPedido}] contiene productos porcionados`);

  // Line items joined with their producto (impuesto) and central-bodega stock.
  // Deliberately a plain read (no SELECT ... FOR UPDATE), matching legacy behavior;
  // correctness relies on batches being processed sequentially (connectionLimit 1) —
  // a lost-update race is only possible under concurrent batch submissions.
  const lineas = await tx
    .select({
      idProducto: t30MProductoPedido.idProducto,
      cantidad: t30MProductoPedido.cantidad,
      porcenDesc: t30MProductoPedido.porcenDesc,
      precioNeto: t30MProductoPedido.precioNeto,
      codSerfel: t20MProducto.codSerfel,
      impuesto: t20MProducto.impuesto,
      stock: t50MStock.cantidad,
    })
    .from(t30MProductoPedido)
    .innerJoin(t20MProducto, eq(t30MProductoPedido.idProducto, t20MProducto.idProducto))
    .leftJoin(
      t50MStock,
      and(eq(t50MStock.idProducto, t30MProductoPedido.idProducto), eq(t50MStock.idBodega, BODEGA_CENTRAL))
    )
    .where(eq(t30MProductoPedido.idPedido, idPedido));

  let montoNetoTotal = 0;
  let montoILA = 0;
  let montoESPEC = 0;
  const ventaLines: { idProducto: number; cantidad: number; precioNeto: number; porcenDesc: number }[] = [];

  for (const l of lineas) {
    if (l.stock === null) {
      mensajes.push(`Pedido [${idPedido}] producto [${l.codSerfel}] no tiene stock`);
      continue;
    }
    const cantStock = Number(l.stock);
    if (cantStock === 0) {
      mensajes.push(`Pedido [${idPedido}] producto [${l.codSerfel}] no tiene stock disponible`);
      continue;
    }
    let cantidad = Number(l.cantidad);
    if (cantStock < cantidad) {
      mensajes.push(`Pedido [${idPedido}] se altero cantidad de producto [${l.codSerfel}] de ${cantidad} a ${cantStock}`);
      cantidad = cantStock;
    }
    const st = subTotal(cantidad, l.precioNeto);
    const stDesc = subTotalConDesc(st, l.porcenDesc);
    montoNetoTotal += stDesc;
    if (l.impuesto === IMPUESTO_ESPEC) {
      montoESPEC += Math.round((stDesc * especValor) / 100);
    } else if (l.impuesto > 0) {
      const rate = rateOf(l.impuesto);
      if (rate !== null) montoILA += Math.round((stDesc * rate) / 100);
    }
    ventaLines.push({ idProducto: l.idProducto, cantidad, precioNeto: l.precioNeto, porcenDesc: l.porcenDesc });
  }

  const localRows = await tx
    .select({ rutCliente: t10MLocalCliente.rutCliente, idFormaPago: t10MLocalCliente.idFormaPago })
    .from(t10MLocalCliente)
    .where(eq(t10MLocalCliente.idLocalCliente, pedido.idLocalCliente))
    .limit(1);
  if (localRows.length === 0) throw new PedidoError(`Local [${pedido.idLocalCliente}] no existe`);
  const local = localRows[0];

  const clienteRows = await tx
    .select({ idListaPrecio: t10MCliente.idListaPrecio })
    .from(t10MCliente)
    .where(eq(t10MCliente.rutCliente, local.rutCliente))
    .limit(1);
  if (clienteRows.length === 0) throw new PedidoError(`Cliente [${local.rutCliente}] no existe`);
  const cliente = clienteRows[0];

  const empresaTarget = await tx
    .select({ x: sql`1` })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.rutEmpresa, rutEmpresa))
    .limit(1);
  if (empresaTarget.length === 0) throw new PedidoError(`Empresa [${rutEmpresa}] no existe`);

  const iva = Math.round((montoNetoTotal * ivaValor) / 100);
  const now = nowDateTime();
  const [header] = await tx.insert(t40MVenta).values({
    idPedido,
    idUsuarioMod: idUsuario,
    fechaVenta: now,
    ultFechaMod: now,
    rutCliente: local.rutCliente,
    idLocalCliente: pedido.idLocalCliente,
    idTipoDoctoEmitido: TIPO_DOCTO_FACTURA,
    numDoctoEmitido: 0,
    idFormaPago: local.idFormaPago,
    idUsuarioVenta: pedido.idUsuario,
    idListaPrecio: cliente.idListaPrecio,
    idEstado: ESTADO_FINALIZADO,
    rutEmpresa,
    iva,
    espec: montoESPEC,
    iaba: montoILA,
    subTotal: montoNetoTotal,
    precioTotal: montoNetoTotal + montoESPEC + montoILA + iva,
  });
  const idVenta = header.insertId;

  // Internal company: cliente rut also present in the empresa table -> no stock decrement.
  const clienteInterno = await tx
    .select({ x: sql`1` })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.rutEmpresa, local.rutCliente))
    .limit(1);
  const esInterno = clienteInterno.length > 0;

  for (const vl of ventaLines) {
    await tx.insert(t40MProductoVenta).values({
      idVenta,
      idProducto: vl.idProducto,
      cantidad: vl.cantidad.toString(),
      precio: vl.precioNeto,
      porcenDesc: vl.porcenDesc,
      precioNeto: vl.precioNeto,
    });
    if (!esInterno) {
      await tx
        .update(t50MStock)
        .set({ cantidad: sql`${t50MStock.cantidad} - ${vl.cantidad}` })
        .where(and(eq(t50MStock.idBodega, BODEGA_CENTRAL), eq(t50MStock.idProducto, vl.idProducto)));
    }
  }

  await tx.update(t30MPedido).set({ idEstado: ESTADO_FINALIZADO }).where(eq(t30MPedido.idPedido, idPedido));
  return idVenta;
}
