import { asc, eq, and, ne } from "drizzle-orm";
import { t20PMarca, t10MUsuario, type Db } from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO,
  type EstadoFilter, type MarcaDto, type MarcaInput,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const marcaColumns = {
  idMarca: t20PMarca.idMarca,
  nomMarca: t20PMarca.nomMarca,
  descMarca: t20PMarca.descMarca,
  idEstado: t20PMarca.idEstado,
};

async function getMarcaDto(db: DbOrTx, idMarca: number): Promise<MarcaDto> {
  const rows = await (db as Db)
    .select(marcaColumns)
    .from(t20PMarca)
    .where(eq(t20PMarca.idMarca, idMarca));
  if (rows.length === 0) {
    throw new AppError("MARCA_NO_ENCONTRADA", 404, `Marca ${idMarca} no existe`);
  }
  return rows[0];
}

/** Uniqueness among ACTIVE marcas only (case-insensitive via default collation). */
async function assertUnique(
  tx: DbOrTx, nomMarca: string, excludeIdMarca: number | null
): Promise<void> {
  const conditions = [
    eq(t20PMarca.idEstado, ESTADO_ACTIVO),
    eq(t20PMarca.nomMarca, nomMarca),
  ];
  if (excludeIdMarca !== null) {
    conditions.push(ne(t20PMarca.idMarca, excludeIdMarca));
  }
  const clashes = await (tx as Db)
    .select({ idMarca: t20PMarca.idMarca })
    .from(t20PMarca)
    .where(and(...conditions));
  if (clashes.length > 0) {
    throw new AppError(
      "NOMBRE_EN_USO", 409,
      `El nombre "${nomMarca}" ya está en uso por otra marca activa`
    );
  }
}

export async function listMarcas(db: Db, estado: EstadoFilter): Promise<MarcaDto[]> {
  const query = db.select(marcaColumns).from(t20PMarca);
  const filtered =
    estado === "todos"
      ? query
      : query.where(
          eq(t20PMarca.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO)
        );
  return filtered.orderBy(asc(t20PMarca.nomMarca));
}

export async function createMarca(db: Db, input: MarcaInput): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    await assertUnique(tx, input.nomMarca, null);
    const [header] = await tx.insert(t20PMarca).values({
      nomMarca: input.nomMarca,
      descMarca: input.descMarca,
      idEstado: ESTADO_ACTIVO,
    });
    return getMarcaDto(tx, header.insertId);
  });
}

export async function updateMarca(
  db: Db, idMarca: number, input: MarcaInput
): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    await getMarcaDto(tx, idMarca); // 404 if missing
    await assertUnique(tx, input.nomMarca, idMarca);
    await tx
      .update(t20PMarca)
      .set({ nomMarca: input.nomMarca, descMarca: input.descMarca })
      .where(eq(t20PMarca.idMarca, idMarca));
    return getMarcaDto(tx, idMarca);
  });
}

export async function deactivateMarca(db: Db, idMarca: number): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    const current = await getMarcaDto(tx, idMarca);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx
      .update(t20PMarca)
      .set({ idEstado: ESTADO_INACTIVO })
      .where(eq(t20PMarca.idMarca, idMarca));
    return getMarcaDto(tx, idMarca);
  });
}

export async function restoreMarca(db: Db, idMarca: number): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    const current = await getMarcaDto(tx, idMarca);
    if (current.idEstado === ESTADO_ACTIVO) return current;
    await assertUnique(tx, current.nomMarca, idMarca);
    await tx
      .update(t20PMarca)
      .set({ idEstado: ESTADO_ACTIVO })
      .where(eq(t20PMarca.idMarca, idMarca));
    return getMarcaDto(tx, idMarca);
  });
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}
