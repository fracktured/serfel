import { and, asc, eq, ne, sql } from "drizzle-orm";
import {
  t40MListaPrecio, t10MUsuario, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO,
  type ListaPrecioDto, type ListaPrecioInput,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const NOW = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const listaColumns = {
  idListaPrecio: t40MListaPrecio.idListaPrecio,
  nombre: t40MListaPrecio.nomListaPrecio,
  idEstado: t40MListaPrecio.idEstado,
};

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

async function getListaDto(db: DbOrTx, id: number): Promise<ListaPrecioDto> {
  const rows = await (db as Db).select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.idListaPrecio, id));
  if (rows.length === 0) {
    throw new AppError("LISTA_NO_ENCONTRADA", 404, `Lista de precio ${id} no existe`);
  }
  return rows[0];
}

export async function listListas(db: Db): Promise<ListaPrecioDto[]> {
  return db.select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t40MListaPrecio.nomListaPrecio));
}

async function findByName(tx: DbOrTx, nombre: string) {
  const rows = await (tx as Db).select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.nomListaPrecio, nombre));
  return rows[0] ?? null;
}

export async function createLista(
  db: Db, input: ListaPrecioInput, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    const existing = await findByName(tx, input.nombre);
    if (existing && existing.idEstado === ESTADO_ACTIVO) {
      throw new AppError("NOMBRE_EN_USO", 409, `La lista "${input.nombre}" ya existe`);
    }
    if (existing && existing.idEstado === ESTADO_INACTIVO) {
      await tx.update(t40MListaPrecio)
        .set({ idEstado: ESTADO_ACTIVO, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
        .where(eq(t40MListaPrecio.idListaPrecio, existing.idListaPrecio));
      return getListaDto(tx, existing.idListaPrecio);
    }
    const [{ next }] = await tx
      .select({ next: sql<number>`COALESCE(MAX(${t40MListaPrecio.idListaPrecio}), 0) + 1` })
      .from(t40MListaPrecio);
    await tx.insert(t40MListaPrecio).values({
      idListaPrecio: next, nomListaPrecio: input.nombre,
      idUsuarioMod: idUsuario, ultFechaMod: NOW(), idEstado: ESTADO_ACTIVO,
    });
    return getListaDto(tx, next);
  });
}

export async function updateLista(
  db: Db, id: number, input: ListaPrecioInput, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    await getListaDto(tx, id); // 404 if missing
    const clash = await (tx as Db).select({ id: t40MListaPrecio.idListaPrecio })
      .from(t40MListaPrecio)
      .where(and(
        eq(t40MListaPrecio.idEstado, ESTADO_ACTIVO),
        eq(t40MListaPrecio.nomListaPrecio, input.nombre),
        ne(t40MListaPrecio.idListaPrecio, id),
      ));
    if (clash.length > 0) {
      throw new AppError("NOMBRE_EN_USO", 409, `La lista "${input.nombre}" ya existe`);
    }
    await tx.update(t40MListaPrecio)
      .set({ nomListaPrecio: input.nombre, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
      .where(eq(t40MListaPrecio.idListaPrecio, id));
    return getListaDto(tx, id);
  });
}

export async function deactivateLista(
  db: Db, id: number, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    const current = await getListaDto(tx, id);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx.update(t40MListaPrecio)
      .set({ idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
      .where(eq(t40MListaPrecio.idListaPrecio, id));
    return getListaDto(tx, id);
  });
}
