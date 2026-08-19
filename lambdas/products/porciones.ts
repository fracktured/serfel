import { eq, sql } from "drizzle-orm";
import { t20MPorcion, t40MVenta, type Db } from "@serfel/db";
import type {
  PorcionDto,
  PorcionesListDto,
  PorcionInput,
  PorcionesQuery,
} from "@serfel/shared";
import { AppError } from "./errors";

/** A piece is available when it is not tied to a venta (null or 0). */
export function isDisponible(idVenta: number | null): boolean {
  return idVenta === null || idVenta === 0;
}

/** Next physical label: top piece by (grupo desc, numero desc) + 1, wrapping at 100. */
export function nextNumero(porciones: { grupo: number; numero: number }[]): number {
  if (porciones.length === 0) return 1;
  const top = [...porciones].sort(
    (a, b) => b.grupo - a.grupo || b.numero - a.numero
  )[0];
  const n = top.numero + 1;
  return n > 100 ? 1 : n;
}

/** True when a Disponible piece already uses this numero (blocks creation). */
export function numeroOcupado(
  porciones: { numero: number; idVenta: number | null }[],
  numero: number
): boolean {
  return porciones.some((p) => p.numero === numero && isDisponible(p.idVenta));
}

/** Grupo for a new piece: bump to maxGrupo + 1 when the numero already sits in the max grupo. */
export function pickGrupo(
  porciones: { grupo: number; numero: number }[],
  numero: number
): number {
  if (porciones.length === 0) return 1;
  const maxGrupo = Math.max(...porciones.map((p) => p.grupo));
  const existsInMax = porciones.some(
    (p) => p.grupo === maxGrupo && p.numero === numero
  );
  return existsInMax ? maxGrupo + 1 : maxGrupo;
}

/** drizzle transaction object — same query API as Db for our purposes. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

interface PorcionRow {
  idPorcion: number;
  idProducto: number;
  grupo: number;
  numero: number;
  cantidad: string;
  fecha: string;
  idVenta: number | null;
  numDoctoEmitido: number | null;
}

function toDto(r: PorcionRow): PorcionDto {
  return {
    idPorcion: r.idPorcion,
    idProducto: r.idProducto,
    grupo: r.grupo,
    numero: r.numero,
    cantidad: Number(r.cantidad),
    fecha: r.fecha,
    disponibilidad: isDisponible(r.idVenta) ? "disponible" : "asignado",
    idVenta: r.idVenta,
    numDoctoEmitido: r.numDoctoEmitido,
  };
}

const porcionColumns = {
  idPorcion: t20MPorcion.idPorcion,
  idProducto: t20MPorcion.idProducto,
  grupo: t20MPorcion.grupo,
  numero: t20MPorcion.numero,
  cantidad: t20MPorcion.cantidad,
  fecha: t20MPorcion.fecha,
  idVenta: t20MPorcion.idVenta,
  numDoctoEmitido: t40MVenta.numDoctoEmitido,
};

/** All rows for a product, newest batch first, with joined venta doc number. */
async function rowsForProducto(
  db: DbOrTx,
  idProducto: number
): Promise<PorcionRow[]> {
  return (db as Db)
    .select(porcionColumns)
    .from(t20MPorcion)
    .leftJoin(t40MVenta, eq(t20MPorcion.idVenta, t40MVenta.idVenta))
    .where(eq(t20MPorcion.idProducto, idProducto))
    .orderBy(sql`${t20MPorcion.grupo} desc, ${t20MPorcion.numero} desc`)
    .limit(100) as Promise<PorcionRow[]>;
}

export async function listPorciones(
  db: Db,
  idProducto: number,
  query: PorcionesQuery
): Promise<PorcionesListDto> {
  const all = await rowsForProducto(db, idProducto);
  let porciones = all.map(toDto);
  if (query.numero !== undefined) {
    porciones = porciones.filter((p) => p.numero === query.numero);
  }
  if (query.factura !== undefined) {
    porciones = porciones.filter((p) => p.numDoctoEmitido === query.factura);
  }
  if (query.disponibilidad && query.disponibilidad !== "todas") {
    porciones = porciones.filter((p) => p.disponibilidad === query.disponibilidad);
  }
  return { porciones, nextNumero: nextNumero(all) };
}

export async function createPorcion(
  db: Db,
  idProducto: number,
  input: PorcionInput,
  idUsuario: number
): Promise<PorcionDto> {
  return db.transaction(async (tx) => {
    const existing = await rowsForProducto(tx, idProducto);
    if (numeroOcupado(existing, input.numero)) {
      throw new AppError(
        "NUMERO_OCUPADO",
        409,
        `El número ${input.numero} ya está ocupado por otra porción disponible`
      );
    }
    const grupo = pickGrupo(existing, input.numero);
    const [header] = await tx.insert(t20MPorcion).values({
      idProducto,
      fecha: nowDateTime(),
      grupo,
      numero: input.numero,
      cantidad: String(input.cantidad),
      idVenta: null,
      idUsuario,
    });
    const [row] = await rowsForProducto(tx, idProducto).then((rows) =>
      rows.filter((r) => r.idPorcion === header.insertId)
    );
    return toDto(row);
  });
}

export async function deletePorcion(
  db: Db,
  idPorcion: number
): Promise<{ ok: true }> {
  return db.transaction(async (tx) => {
    const [row] = await (tx as Db)
      .select({ idVenta: t20MPorcion.idVenta })
      .from(t20MPorcion)
      .where(eq(t20MPorcion.idPorcion, idPorcion))
      .limit(1);
    if (!row) {
      throw new AppError("PORCION_NO_ENCONTRADA", 404, `Porción ${idPorcion} no existe`);
    }
    if (!isDisponible(row.idVenta)) {
      throw new AppError(
        "PORCION_VENDIDA",
        409,
        "La porción está asignada a una venta y no puede eliminarse"
      );
    }
    await tx.delete(t20MPorcion).where(eq(t20MPorcion.idPorcion, idPorcion));
    return { ok: true as const };
  });
}
