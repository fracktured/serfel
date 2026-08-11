import { createHash } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import {
  t10MUsuario, t10PTipoUsuario, t30MPedido, t40MVenta, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO, formatRut, modulesForTipo, parseRut,
  type EstadoFilter, type MeDto, type UsuarioCreateInput, type UsuarioDto,
  type UsuarioLookupsDto, type UsuarioUpdateInput,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

/** Legacy stores hex_md5(password) computed client-side; reproduce it here. */
export function md5hex(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const dtoColumns = {
  idUsuario: t10MUsuario.idUsuario,
  rutUsuario: t10MUsuario.rutUsuario,
  dvUsuario: t10MUsuario.dvUsuario,
  nomUsuario: t10MUsuario.nomUsuario,
  apellPatUsuario: t10MUsuario.apellPatUsuario,
  apellMatUsuario: t10MUsuario.apellMatUsuario,
  idTipoUsuario: t10MUsuario.idTipoUsuario,
  nomTipoUsuario: t10PTipoUsuario.nomTipoUsuario,
  telefonoUsuario: t10MUsuario.telefonoUsuario,
  direccionUsuario: t10MUsuario.direccionUsuario,
  emailUsuario: t10MUsuario.emailUsuario,
  numUsuario: t10MUsuario.numUsuario,
  idEstado: t10MUsuario.idEstado,
};

type Row = {
  idUsuario: number; rutUsuario: number; dvUsuario: string; nomUsuario: string;
  apellPatUsuario: string; apellMatUsuario: string; idTipoUsuario: number;
  nomTipoUsuario: string; telefonoUsuario: string | null; direccionUsuario: string;
  emailUsuario: string | null; numUsuario: number; idEstado: number;
};

function toDto(r: Row): UsuarioDto {
  return {
    ...r,
    rut: formatRut(r.rutUsuario, r.dvUsuario),
    nombreCompleto: `${r.apellPatUsuario} ${r.apellMatUsuario} ${r.nomUsuario}`,
    tieneCognito: false,
  };
}

function usuarioQuery(db: DbOrTx) {
  return (db as Db)
    .select(dtoColumns)
    .from(t10MUsuario)
    .innerJoin(t10PTipoUsuario, eq(t10MUsuario.idTipoUsuario, t10PTipoUsuario.idTipoUsuario));
}

async function getDto(db: DbOrTx, id: number): Promise<UsuarioDto> {
  const rows = await usuarioQuery(db).where(eq(t10MUsuario.idUsuario, id));
  if (rows.length === 0) {
    throw new AppError("USUARIO_NO_ENCONTRADO", 404, `Usuario ${id} no existe`);
  }
  return toDto(rows[0]);
}

export async function getUsuarioLookups(db: Db): Promise<UsuarioLookupsDto> {
  const tiposUsuario = await db
    .select({ id: t10PTipoUsuario.idTipoUsuario, nombre: t10PTipoUsuario.nomTipoUsuario })
    .from(t10PTipoUsuario)
    .orderBy(asc(t10PTipoUsuario.nomTipoUsuario));
  return { tiposUsuario };
}

export async function listUsuarios(db: Db, estado: EstadoFilter): Promise<UsuarioDto[]> {
  const q = usuarioQuery(db);
  const rows = await (estado === "todos"
    ? q
    : q.where(eq(t10MUsuario.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO))
  ).orderBy(asc(t10MUsuario.apellPatUsuario));
  return rows.map(toDto);
}

/** num/email uniqueness against other users. excludeId lets update/activate ignore self. */
async function assertUnique(
  tx: DbOrTx, numUsuario: number | null,
  emailUsuario: string, excludeId: number | null
): Promise<void> {
  const notSelf = (col: typeof t10MUsuario.numUsuario | typeof t10MUsuario.emailUsuario, val: number | string) =>
    excludeId === null ? eq(col as any, val) : and(eq(col as any, val), ne(t10MUsuario.idUsuario, excludeId));

  if (numUsuario !== null && numUsuario !== 0) {
    // Only active users hold a num_usuario; one freed by a deactivated user is reusable.
    const clash = await (tx as Db).select({ id: t10MUsuario.idUsuario })
      .from(t10MUsuario).where(and(notSelf(t10MUsuario.numUsuario, numUsuario), eq(t10MUsuario.idEstado, ESTADO_ACTIVO)));
    if (clash.length > 0) throw new AppError("NUM_EN_USO", 409, `El número ${numUsuario} ya está en uso`);
  }
  const emailClash = await (tx as Db).select({ id: t10MUsuario.idUsuario })
    .from(t10MUsuario).where(notSelf(t10MUsuario.emailUsuario, emailUsuario));
  if (emailClash.length > 0) throw new AppError("EMAIL_EN_USO", 409, `El email ${emailUsuario} ya está en uso`);
}

export async function createUsuario(
  db: Db, input: UsuarioCreateInput, idUsuario: number
): Promise<{ kind: "created"; dto: UsuarioDto } | { kind: "inactive"; idUsuario: number }> {
  const parsed = parseRut(input.rut)!; // validated by Zod
  return db.transaction(async (tx) => {
    const existing = await (tx as Db).select({ id: t10MUsuario.idUsuario, estado: t10MUsuario.idEstado })
      .from(t10MUsuario).where(eq(t10MUsuario.rutUsuario, parsed.rut));
    if (existing.length > 0) {
      if (existing[0].estado === ESTADO_ACTIVO) {
        throw new AppError("RUT_EN_USO", 409, `El RUT ${input.rut} ya está registrado y activo`);
      }
      return { kind: "inactive" as const, idUsuario: existing[0].id };
    }
    await assertUnique(tx, input.numUsuario, input.emailUsuario, null);
    const [header] = await tx.insert(t10MUsuario).values({
      rutUsuario: parsed.rut,
      dvUsuario: parsed.dv,
      nomUsuario: input.nomUsuario,
      apellPatUsuario: input.apellPatUsuario,
      apellMatUsuario: input.apellMatUsuario,
      password: md5hex(input.password),
      idTipoUsuario: input.idTipoUsuario,
      telefonoUsuario: input.telefonoUsuario,
      direccionUsuario: input.direccionUsuario,
      emailUsuario: input.emailUsuario,
      numUsuario: input.numUsuario ?? 0,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      idEstado: ESTADO_ACTIVO,
    });
    return { kind: "created" as const, dto: await getDto(tx, header.insertId) };
  });
}

export async function activateUsuario(
  db: Db, id: number, input: UsuarioCreateInput, idUsuario: number
): Promise<UsuarioDto> {
  return db.transaction(async (tx) => {
    await getDto(tx, id); // 404 if missing
    await assertUnique(tx, input.numUsuario, input.emailUsuario, id);
    await tx.update(t10MUsuario).set({
      nomUsuario: input.nomUsuario,
      apellPatUsuario: input.apellPatUsuario,
      apellMatUsuario: input.apellMatUsuario,
      password: md5hex(input.password),
      idTipoUsuario: input.idTipoUsuario,
      telefonoUsuario: input.telefonoUsuario,
      direccionUsuario: input.direccionUsuario,
      emailUsuario: input.emailUsuario,
      numUsuario: input.numUsuario ?? 0,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      idEstado: ESTADO_ACTIVO,
    }).where(eq(t10MUsuario.idUsuario, id));
    return getDto(tx, id);
  });
}

export async function updateUsuario(
  db: Db, id: number, input: UsuarioUpdateInput, idUsuario: number
): Promise<UsuarioDto> {
  return db.transaction(async (tx) => {
    await getDto(tx, id);
    await assertUnique(tx, input.numUsuario, input.emailUsuario, id);
    await tx.update(t10MUsuario).set({
      nomUsuario: input.nomUsuario,
      apellPatUsuario: input.apellPatUsuario,
      apellMatUsuario: input.apellMatUsuario,
      idTipoUsuario: input.idTipoUsuario,
      telefonoUsuario: input.telefonoUsuario,
      direccionUsuario: input.direccionUsuario,
      emailUsuario: input.emailUsuario,
      numUsuario: input.numUsuario ?? 0,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      ...(input.password ? { password: md5hex(input.password) } : {}),
    }).where(eq(t10MUsuario.idUsuario, id));
    return getDto(tx, id);
  });
}

export async function deactivateUsuario(
  db: Db, id: number, idUsuario: number
): Promise<UsuarioDto> {
  return db.transaction(async (tx) => {
    const current = await getDto(tx, id);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    const pending = await (tx as Db)
      .select({ id: t40MVenta.idVenta })
      .from(t40MVenta)
      .innerJoin(t30MPedido, eq(t40MVenta.idPedido, t30MPedido.idPedido))
      .where(and(eq(t30MPedido.idUsuario, id), eq(t40MVenta.idEstado, 2)));
    if (pending.length > 0) {
      throw new AppError("USUARIO_CON_VENTAS_PENDIENTES", 409,
        "El usuario tiene ventas en proceso de pago y no puede eliminarse");
    }
    await tx.update(t10MUsuario).set({
      idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: nowDateTime(),
    }).where(eq(t10MUsuario.idUsuario, id));
    return getDto(tx, id);
  });
}

export async function getUsuarioForCognito(db: Db, id: number): Promise<{ email: string }> {
  const dto = await getDto(db, id);
  if (!dto.emailUsuario) {
    throw new AppError("USUARIO_SIN_EMAIL", 400, "El usuario no tiene email; no se puede crear en Cognito");
  }
  return { email: dto.emailUsuario };
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function getMe(db: Db, idUsuario: number): Promise<MeDto> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario, nomUsuario: t10MUsuario.nomUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  if (rows.length === 0) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no existe en el sistema");
  return { idUsuario, idTipoUsuario: rows[0].idTipoUsuario, nomUsuario: rows[0].nomUsuario, modulos: modulesForTipo(rows[0].idTipoUsuario) };
}
