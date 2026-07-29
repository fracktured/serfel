import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  t40MRuta,
  t40MRutaLocalCliente,
  t40MVenta,
  t40MProductoVenta,
  t30MPedido,
  t30MProductoPedido,
  t20MProducto,
  t20MPorcion,
  t20PUnidadMedida,
  t20PTipoProducto,
  t10MUsuario,
  type Db,
} from "@serfel/db";
import { ESTADO_ACTIVO, type CargoTipo, type RutaDto, type RutaSelection } from "@serfel/shared";
import type { CargoListData, DetailRow } from "./types";

const ESTADO_FINALIZADO = 3;
const NO_ENTREGADO = 0;
const ESTADO_PEDIDO_VIGENTE = 1;

export async function listActiveRutas(db: Db): Promise<RutaDto[]> {
  return db
    .select({
      idRuta: t40MRuta.idRuta,
      nomRuta: t40MRuta.nomRuta,
      idUsuario: t40MRuta.idUsuario,
      numDia: t40MRuta.numDia,
      idEstado: t40MRuta.idEstado,
    })
    .from(t40MRuta)
    .where(eq(t40MRuta.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t40MRuta.nomRuta));
}

async function fetchDetail(db: Db, idRutas: number[]): Promise<DetailRow[]> {
  return db
    .select({
      idProducto: t40MProductoVenta.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      nomUm: t20PUnidadMedida.nomUm,
      nomTipoProducto: t20PTipoProducto.nomTipoProducto,
      sumCantidad: sql<string>`SUM(${t40MProductoVenta.cantidad})`,
      subtotal: sql<string>`SUM(${t40MProductoVenta.cantidad} * (${t40MProductoVenta.precio} - ${t40MProductoVenta.precio} * ${t40MProductoVenta.porcenDesc} / 100))`,
    })
    .from(t40MProductoVenta)
    .innerJoin(
      t40MVenta,
      and(
        eq(t40MVenta.idVenta, t40MProductoVenta.idVenta),
        eq(t40MVenta.entregado, NO_ENTREGADO),
        eq(t40MVenta.idEstado, ESTADO_FINALIZADO)
      )
    )
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t40MVenta.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .innerJoin(t20MProducto, eq(t20MProducto.idProducto, t40MProductoVenta.idProducto))
    .innerJoin(t20PUnidadMedida, eq(t20PUnidadMedida.idUm, t20MProducto.idUm))
    .innerJoin(t20PTipoProducto, eq(t20PTipoProducto.idTipoProducto, t20MProducto.idTipoProducto))
    .groupBy(
      t40MProductoVenta.idProducto,
      t20MProducto.codSerfel,
      t20MProducto.nomProducto,
      t20PUnidadMedida.nomUm,
      t20PTipoProducto.nomTipoProducto
    )
    .orderBy(asc(t20PTipoProducto.nomTipoProducto), asc(t20MProducto.nomProducto));
}

async function fetchPorciones(
  db: Db,
  idRutas: number[]
): Promise<{ idProducto: number; numero: number }[]> {
  return db
    .select({ idProducto: t20MPorcion.idProducto, numero: t20MPorcion.numero })
    .from(t20MPorcion)
    .innerJoin(
      t40MVenta,
      and(
        eq(t40MVenta.idVenta, t20MPorcion.idVenta),
        eq(t40MVenta.entregado, NO_ENTREGADO),
        eq(t40MVenta.idEstado, ESTADO_FINALIZADO)
      )
    )
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t40MVenta.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .orderBy(asc(t20MPorcion.idProducto), asc(t20MPorcion.numero));
}

async function fetchTotals(
  db: Db,
  idRutas: number[]
): Promise<{ numFacturas: number | string; total: string | null }> {
  const rows = await db
    .select({
      numFacturas: sql<number>`COUNT(${t40MVenta.idVenta})`,
      total: sql<string | null>`SUM(${t40MVenta.precioTotal})`,
    })
    .from(t40MVenta)
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t40MVenta.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .where(and(eq(t40MVenta.entregado, NO_ENTREGADO), eq(t40MVenta.idEstado, ESTADO_FINALIZADO)));
  return rows[0] ?? { numFacturas: 0, total: null };
}

async function fetchDetailPedido(db: Db, idRutas: number[]): Promise<DetailRow[]> {
  return db
    .select({
      idProducto: t30MProductoPedido.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      nomUm: t20PUnidadMedida.nomUm,
      nomTipoProducto: t20PTipoProducto.nomTipoProducto,
      sumCantidad: sql<string>`SUM(${t30MProductoPedido.cantidad})`,
      subtotal: sql<string>`SUM(${t30MProductoPedido.cantidad} * (${t30MProductoPedido.precio} - ${t30MProductoPedido.precio} * ${t30MProductoPedido.porcenDesc} / 100))`,
    })
    .from(t30MProductoPedido)
    .innerJoin(
      t30MPedido,
      and(
        eq(t30MPedido.idPedido, t30MProductoPedido.idPedido),
        eq(t30MPedido.idEstado, ESTADO_PEDIDO_VIGENTE)
      )
    )
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t30MPedido.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .innerJoin(t20MProducto, eq(t20MProducto.idProducto, t30MProductoPedido.idProducto))
    .innerJoin(t20PUnidadMedida, eq(t20PUnidadMedida.idUm, t20MProducto.idUm))
    .innerJoin(t20PTipoProducto, eq(t20PTipoProducto.idTipoProducto, t20MProducto.idTipoProducto))
    .groupBy(
      t30MProductoPedido.idProducto,
      t20MProducto.codSerfel,
      t20MProducto.nomProducto,
      t20PUnidadMedida.nomUm,
      t20PTipoProducto.nomTipoProducto
    )
    .orderBy(asc(t20PTipoProducto.nomTipoProducto), asc(t20MProducto.nomProducto));
}

async function fetchTotalsPedido(
  db: Db,
  idRutas: number[]
): Promise<{ numFacturas: number | string; total: string | null }> {
  const rows = await db
    .select({
      numFacturas: sql<number>`COUNT(${t30MPedido.idPedido})`,
      total: sql<string | null>`SUM(${t30MPedido.precioTotal})`,
    })
    .from(t30MPedido)
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t30MPedido.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .where(eq(t30MPedido.idEstado, ESTADO_PEDIDO_VIGENTE));
  return rows[0] ?? { numFacturas: 0, total: null };
}

/**
 * Faithful port of the legacy display quirk: the summed DECIMAL(18,3) string
 * has its last character dropped, truncating to 2 decimals ("5.000" -> "5.00").
 */
function truncateLastChar(value: string): string {
  return value.slice(0, -1);
}

export function assembleCargoList(
  rutas: RutaSelection,
  detail: DetailRow[],
  porciones: { idProducto: number; numero: number }[],
  totals: { numFacturas: number | string; total: string | null }
): CargoListData {
  const obsByProducto = new Map<number, number[]>();
  for (const p of porciones) {
    const arr = obsByProducto.get(p.idProducto) ?? [];
    arr.push(p.numero);
    obsByProducto.set(p.idProducto, arr);
  }
  const rows = detail.map((d) => ({
    idProducto: d.idProducto,
    codSerfel: d.codSerfel,
    nomProducto: d.nomProducto,
    nomUm: d.nomUm,
    nomTipoProducto: d.nomTipoProducto,
    sumCantidad: truncateLastChar(String(d.sumCantidad)),
    subtotal: parseInt(String(d.subtotal), 10) || 0,
    obs: obsByProducto.get(d.idProducto) ?? [],
  }));
  return {
    nomRutas: rutas.map((r) => r.nomRuta).join(", "),
    rows,
    totals: {
      numFacturas: Number(totals.numFacturas) || 0,
      total: totals.total === null ? 0 : parseInt(String(totals.total), 10) || 0,
    },
  };
}

export async function getCargoListData(
  db: Db,
  rutas: RutaSelection,
  tipo: CargoTipo
): Promise<CargoListData> {
  const idRutas = rutas.map((r) => r.idRuta);
  if (tipo === "pedidos") {
    const [detail, totals] = await Promise.all([
      fetchDetailPedido(db, idRutas),
      fetchTotalsPedido(db, idRutas),
    ]);
    // Pedidos have no porcion link, so obs is always [].
    return assembleCargoList(rutas, detail, [], totals);
  }
  const [detail, porciones, totals] = await Promise.all([
    fetchDetail(db, idRutas),
    fetchPorciones(db, idRutas),
    fetchTotals(db, idRutas),
  ]);
  return assembleCargoList(rutas, detail, porciones, totals);
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}
