import { and, asc, eq, ne, gt, sql } from "drizzle-orm";
import {
  t10MCliente, t40MListaPrecio, t40MRuta, t40MRutaLocalCliente, t10MLocalCliente,
  t40MVenta, t40MNotaCredito, t10MUsuario, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO, formatRut, parseRut,
  type EstadoFilter, type ClienteCreateInput, type ClienteUpdateInput,
  type ClienteDto, type ClienteLookupsDto,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const VENTA_PENDIENTE = 2; // legacy: venta pending payment

const dtoColumns = {
  rutCliente: t10MCliente.rutCliente,
  dvCliente: t10MCliente.dvCliente,
  razonSocial: t10MCliente.razonSocial,
  nomFantasia: t10MCliente.nomFantasia,
  telefono: t10MCliente.telefonoCliente,
  direccion: t10MCliente.direccionCliente,
  comuna: t10MCliente.comuna,
  ciudad: t10MCliente.ciudad,
  email: t10MCliente.emailCliente,
  idListaPrecio: t10MCliente.idListaPrecio,
  nomListaPrecio: t40MListaPrecio.nomListaPrecio,
  permiteVentaDeuda: t10MCliente.permiteVentaDeuda,
  idEstado: t10MCliente.idEstado,
};

type Row = {
  rutCliente: number; dvCliente: string; razonSocial: string; nomFantasia: string;
  telefono: string | null; direccion: string; comuna: string; ciudad: string;
  email: string | null; idListaPrecio: number; nomListaPrecio: string;
  permiteVentaDeuda: number; idEstado: number;
};

function toDto(r: Row, dias: number[], ultFactura: number | null, ultNotaCredito: number | null): ClienteDto {
  return {
    ...r,
    permiteVentaDeuda: r.permiteVentaDeuda === 1,
    rut: formatRut(r.rutCliente, r.dvCliente),
    dias, ultFactura, ultNotaCredito,
  };
}

function clienteQuery(db: DbOrTx) {
  return (db as Db)
    .select(dtoColumns)
    .from(t10MCliente)
    .innerJoin(t40MListaPrecio, eq(t10MCliente.idListaPrecio, t40MListaPrecio.idListaPrecio));
}

async function getRow(db: DbOrTx, rut: number): Promise<Row> {
  const rows = await clienteQuery(db).where(eq(t10MCliente.rutCliente, rut));
  if (rows.length === 0) throw new AppError("CLIENTE_NO_ENCONTRADO", 404, `Cliente ${rut} no existe`);
  return rows[0] as Row;
}

/** Single-row DTO with its derived columns (used after writes). */
async function getDto(db: DbOrTx, rut: number): Promise<ClienteDto> {
  const row = await getRow(db, rut);
  const [dias, fact, nc] = await Promise.all([
    routeDiasForRut(db, rut), ultFacturaForRut(db, rut), ultNotaCreditoForRut(db, rut),
  ]);
  return toDto(row, dias, fact, nc);
}

async function routeDiasForRut(db: DbOrTx, rut: number): Promise<number[]> {
  const rows = await (db as Db)
    .select({ numDia: t40MRuta.numDia })
    .from(t40MRuta)
    .innerJoin(t40MRutaLocalCliente, eq(t40MRuta.idRuta, t40MRutaLocalCliente.idRuta))
    .innerJoin(t10MLocalCliente, eq(t40MRutaLocalCliente.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .where(and(eq(t10MLocalCliente.rutCliente, rut), gt(t40MRuta.idEstado, 0)));
  return [...new Set(rows.map((r) => r.numDia))].sort((a, b) => a - b);
}

async function ultFacturaForRut(db: DbOrTx, rut: number): Promise<number | null> {
  const rows = await (db as Db)
    .select({ num: t40MVenta.numDoctoEmitido })
    .from(t40MVenta)
    .where(and(eq(t40MVenta.rutCliente, rut), gt(t40MVenta.idEstado, 0)));
  return rows.length ? Math.max(...rows.map((r) => r.num)) : null;
}

async function ultNotaCreditoForRut(db: DbOrTx, rut: number): Promise<number | null> {
  const rows = await (db as Db)
    .select({ num: t40MNotaCredito.numNotaCredito })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(and(eq(t40MVenta.rutCliente, rut), gt(t40MNotaCredito.idEstado, 0)));
  return rows.length ? Math.max(...rows.map((r) => r.num)) : null;
}

export async function getClienteLookups(db: Db): Promise<ClienteLookupsDto> {
  const listasPrecio = await db
    .select({ id: t40MListaPrecio.idListaPrecio, nombre: t40MListaPrecio.nomListaPrecio })
    .from(t40MListaPrecio)
    .orderBy(asc(t40MListaPrecio.nomListaPrecio));
  return { listasPrecio };
}

export async function listClientes(db: Db, estado: EstadoFilter): Promise<ClienteDto[]> {
  const q = clienteQuery(db);
  const rows = (await (estado === "todos"
    ? q
    : q.where(eq(t10MCliente.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO))
  ).orderBy(asc(t10MCliente.razonSocial))) as Row[];

  // Derived columns as 3 grouped queries, merged in JS by rut_cliente.
  const diasRows = await db
    .select({ rut: t10MLocalCliente.rutCliente, numDia: t40MRuta.numDia })
    .from(t40MRuta)
    .innerJoin(t40MRutaLocalCliente, eq(t40MRuta.idRuta, t40MRutaLocalCliente.idRuta))
    .innerJoin(t10MLocalCliente, eq(t40MRutaLocalCliente.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .where(gt(t40MRuta.idEstado, 0))
    .groupBy(t10MLocalCliente.rutCliente, t40MRuta.numDia);
  const factRows = await db
    .select({ rut: t40MVenta.rutCliente, num: sql<number>`MAX(${t40MVenta.numDoctoEmitido})` })
    .from(t40MVenta).where(gt(t40MVenta.idEstado, 0))
    .groupBy(t40MVenta.rutCliente);
  const ncRows = await db
    .select({ rut: t40MVenta.rutCliente, num: sql<number>`MAX(${t40MNotaCredito.numNotaCredito})` })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(gt(t40MNotaCredito.idEstado, 0))
    .groupBy(t40MVenta.rutCliente);

  const dias = new Map<number, Set<number>>();
  for (const r of diasRows) (dias.get(r.rut) ?? dias.set(r.rut, new Set()).get(r.rut)!).add(r.numDia);
  const maxBy = (rows: { rut: number; num: number }[]) => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.rut, Math.max(m.get(r.rut) ?? 0, r.num));
    return m;
  };
  const fact = maxBy(factRows);
  const nc = maxBy(ncRows);

  return rows.map((r) => toDto(
    r,
    [...(dias.get(r.rutCliente) ?? new Set<number>())].sort((a, b) => a - b),
    fact.get(r.rutCliente) ?? null,
    nc.get(r.rutCliente) ?? null,
  ));
}

async function assertRazonSocialUnique(tx: DbOrTx, razonSocial: string, excludeRut: number | null): Promise<void> {
  const clash = await (tx as Db).select({ rut: t10MCliente.rutCliente })
    .from(t10MCliente)
    .where(excludeRut === null
      ? eq(t10MCliente.razonSocial, razonSocial)
      : and(eq(t10MCliente.razonSocial, razonSocial), ne(t10MCliente.rutCliente, excludeRut)));
  if (clash.length > 0) throw new AppError("RAZON_SOCIAL_EN_USO", 409, `La razón social "${razonSocial}" ya está registrada`);
}

function writeValues(input: ClienteUpdateInput, idUsuario: number) {
  return {
    razonSocial: input.razonSocial,
    nomFantasia: input.nomFantasia,
    telefonoCliente: input.telefono,
    direccionCliente: input.direccion,
    comuna: input.comuna,
    ciudad: input.ciudad,
    emailCliente: input.email,
    idListaPrecio: input.idListaPrecio,
    permiteVentaDeuda: input.permiteVentaDeuda ? 1 : 0,
    idUsuarioMod: idUsuario,
    ultFechaMod: nowDateTime(),
  };
}

export async function createCliente(
  db: Db, input: ClienteCreateInput, idUsuario: number,
): Promise<{ kind: "created"; dto: ClienteDto } | { kind: "inactive"; rut: number }> {
  const parsed = parseRut(input.rut)!; // validated by Zod
  return db.transaction(async (tx) => {
    const existing = await (tx as Db).select({ rut: t10MCliente.rutCliente, estado: t10MCliente.idEstado })
      .from(t10MCliente).where(eq(t10MCliente.rutCliente, parsed.rut));
    if (existing.length > 0) {
      if (existing[0].estado === ESTADO_ACTIVO) throw new AppError("RUT_EN_USO", 409, `El RUT ${input.rut} ya está registrado y activo`);
      return { kind: "inactive" as const, rut: existing[0].rut };
    }
    await assertRazonSocialUnique(tx, input.razonSocial, null);
    await tx.insert(t10MCliente).values({
      rutCliente: parsed.rut, dvCliente: parsed.dv, ...writeValues(input, idUsuario), idEstado: ESTADO_ACTIVO,
    });
    return { kind: "created" as const, dto: await getDto(tx, parsed.rut) };
  });
}

export async function updateCliente(db: Db, rut: number, input: ClienteUpdateInput, idUsuario: number): Promise<ClienteDto> {
  return db.transaction(async (tx) => {
    await getRow(tx, rut); // 404 if missing
    await assertRazonSocialUnique(tx, input.razonSocial, rut);
    await tx.update(t10MCliente).set(writeValues(input, idUsuario)).where(eq(t10MCliente.rutCliente, rut));
    return getDto(tx, rut);
  });
}

export async function activateCliente(db: Db, rut: number, input: ClienteUpdateInput, idUsuario: number): Promise<ClienteDto> {
  return db.transaction(async (tx) => {
    await getRow(tx, rut);
    await assertRazonSocialUnique(tx, input.razonSocial, rut);
    await tx.update(t10MCliente).set({ ...writeValues(input, idUsuario), idEstado: ESTADO_ACTIVO }).where(eq(t10MCliente.rutCliente, rut));
    return getDto(tx, rut);
  });
}

export async function deactivateCliente(db: Db, rut: number, idUsuario: number): Promise<ClienteDto> {
  return db.transaction(async (tx) => {
    const current = await getDto(tx, rut);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    const pending = await (tx as Db).select({ id: t40MVenta.idVenta })
      .from(t40MVenta)
      .where(and(eq(t40MVenta.rutCliente, rut), eq(t40MVenta.idEstado, VENTA_PENDIENTE)));
    if (pending.length > 0) {
      throw new AppError("CLIENTE_CON_VENTAS_PENDIENTES", 409, "El cliente tiene ventas en proceso de pago y no puede eliminarse");
    }
    await tx.update(t10MCliente).set({ idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: nowDateTime() })
      .where(eq(t10MCliente.rutCliente, rut));
    return getDto(tx, rut);
  });
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}
