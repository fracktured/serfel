import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb,
  migrateSchemaOnly,
  type Db,
  t99PEstado,
  t99PImpuesto,
  t10PTipoUsuario,
  t10MUsuario,
  t40MListaPrecio,
  t10PTipoDocto,
  t40PFormaPago,
  t10MEmpresa,
  t10MCliente,
  t10MLocalCliente,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t20MProducto,
  t40MVenta,
  t40MProductoVenta,
  t40MNotaCredito,
  t40MFoliosElectronicos,
} from "@serfel/db";
import { TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA } from "@serfel/shared";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));
const NOW = "2026-01-01 00:00:00";

export const SEED = {
  usuarioAdmin: 1,
  tipoAdmin: 1,
  empresaTarget: 76000000,
  cliente: 55000000,
  localNorte: 500,
  marca: 1,
  tipoBebidas: 1,
  um: 1,
  prodAgua: 1,
  ESTADO_ACTIVO: 1,
} as const;

let pool: Pool | undefined;
let db: Db | undefined;
let nextIdVenta = 1;

/**
 * Boots a fresh test database with the base fixture graph (empresa, cliente,
 * local, producto) needed by seedVenta. No teardown handle is returned —
 * matches the brief's single-call beforeAll usage; the docker-compose DB is
 * disposable across test runs.
 */
export async function makeTestDb(): Promise<Db> {
  const dbName = "serfel_notas_credito_service";
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const created = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false }
  );
  db = created.db;
  pool = created.pool;
  await migrateSchemaOnly(db, MIGRATIONS);

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
  ]);
  await db.insert(t99PImpuesto).values([
    { idImpuesto: 2, nomImpuesto: "ESPEC", valor: 13 },
    { idImpuesto: 3, nomImpuesto: "IVA", valor: 19 },
  ]);
  await db.insert(t10PTipoUsuario).values({
    idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador",
  });
  await db.insert(t10MUsuario).values({
    idUsuario: SEED.usuarioAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin",
    apellPatUsuario: "Perez", apellMatUsuario: "Soto", password: "unused", idTipoUsuario: SEED.tipoAdmin,
    direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t40MListaPrecio).values({
    idListaPrecio: 1, nomListaPrecio: "GENERAL", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t10PTipoDocto).values([
    { idTipoDocto: 1, nomTipoDocto: "FACTURA", descTipoDocto: "Factura" },
    { idTipoDocto: 9, nomTipoDocto: "FACTURA_ELECTRONICA", descTipoDocto: "Factura Electronica" },
  ]);
  await db.insert(t40PFormaPago).values({ idFormaPago: 7, nomFormaPago: "CREDITO", descFormaPago: "Pago a credito" }).onDuplicateKeyUpdate({ set: { nomFormaPago: "CREDITO" } });

  await db.insert(t10MEmpresa).values({
    rutEmpresa: SEED.empresaTarget, dvEmpresa: "0", razonSocial: "SERFEL", nomFantasia: "SERFEL",
    direccionEmpresa: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, giro: "-",
    codActividadEconomica: 1, comuna: "-", ciudad: "-", rutRepresentanteLegal: 1, dvRepresentanteLegal: "0",
    fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });
  await db.insert(t10MCliente).values({
    rutCliente: SEED.cliente, dvCliente: "0", razonSocial: "CLIENTE", nomFantasia: "Fantasia Norte",
    idListaPrecio: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t10MLocalCliente).values({
    idLocalCliente: SEED.localNorte, rutCliente: SEED.cliente, nomLocalCliente: "Local Norte",
    nomContacto: "Juan", apellPatContacto: "Lopez", apellMatContacto: "Vega", idVendedor: SEED.usuarioAdmin,
    idFormaPago: 7, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t20PMarca).values({ idMarca: SEED.marca, nomMarca: "MARCA" });
  await db.insert(t20PTipoProducto).values({
    idTipoProducto: SEED.tipoBebidas, nomTipoProducto: "BEBIDAS", idUsuarioMod: SEED.usuarioAdmin,
    ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t20PUnidadMedida).values({ idUm: SEED.um, nomUm: "UNI" });
  await db.insert(t20MProducto).values({
    idProducto: SEED.prodAgua, nomProducto: "Agua", descProducto: "", codBarraProducto: "",
    idTipoProducto: SEED.tipoBebidas, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin,
    ultFechaMod: NOW, idEstado: 1, codSerfel: 100, impuesto: 0, usaPorciones: 0,
  });

  return db;
}

/**
 * Inserts one 40_m_venta + a single 40_m_producto_venta line against the
 * base fixture graph created by makeTestDb, and returns the new idVenta.
 */
export async function seedVenta(
  targetDb: Db,
  opts: { idTipoDoctoEmitido: number; idFolio: number; precioTotal: number }
): Promise<number> {
  const idVenta = nextIdVenta++;
  await targetDb.insert(t40MVenta).values({
    idVenta,
    idListaPrecio: 1,
    idUsuarioVenta: SEED.usuarioAdmin,
    numDoctoEmitido: 1,
    idTipoDoctoEmitido: opts.idTipoDoctoEmitido,
    rutEmpresa: SEED.empresaTarget,
    rutCliente: SEED.cliente,
    idLocalCliente: SEED.localNorte,
    idFolio: opts.idFolio,
    fechaVenta: NOW,
    idUsuarioMod: SEED.usuarioAdmin,
    ultFechaMod: NOW,
    idEstado: SEED.ESTADO_ACTIVO,
    precioTotal: opts.precioTotal,
  });
  await targetDb.insert(t40MProductoVenta).values({
    idVenta,
    idProducto: SEED.prodAgua,
    cantidad: "1.000",
    precio: opts.precioTotal,
    porcenDesc: 0,
    precioNeto: opts.precioTotal,
  });
  return idVenta;
}

/**
 * Inserts one 40_m_nota_credito row against an existing venta (from seedVenta)
 * and returns the new idNotaCredito. id_nota_credito is AUTO_INCREMENT — the
 * DB assigns it, callers must not hand-assign. Kept minimal but satisfies the
 * FKs (existing venta, existing usuario, existing estado). Reused by Task 8.
 */
export async function seedNota(
  targetDb: Db,
  opts: { idVenta: number; precioTotal: number; idUsuario?: number; esNotaCredElectronica?: 0 | 1 }
): Promise<number> {
  const [header] = await targetDb.insert(t40MNotaCredito).values({
    idVenta: opts.idVenta,
    idTipoDoctoEmitido: TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
    idUsuario: opts.idUsuario ?? SEED.usuarioAdmin,
    fechaNotaCredito: NOW,
    precioTotal: opts.precioTotal,
    idEstado: SEED.ESTADO_ACTIVO,
    esNotaCredElectronica: opts.esNotaCredElectronica ?? 1,
  });
  return header.insertId;
}

/**
 * Inserts one 40_m_folios_electronicos range row (the manual folio registry).
 * Used by resolveNextFolio tests to seed a per-empresa/tipo-docto range.
 */
export async function seedFolioRange(
  targetDb: Db,
  opts: { rutEmpresa: number; idTipoDocto: number; folioDesde: number; folioHasta: number; ultFolio: number }
): Promise<void> {
  await targetDb.insert(t40MFoliosElectronicos).values({
    fechaCreacion: NOW,
    rutEmpresa: opts.rutEmpresa,
    idTipoDocto: opts.idTipoDocto,
    folioDesde: opts.folioDesde,
    folioHasta: opts.folioHasta,
    ultFolio: opts.ultFolio,
  });
}

export async function teardownTestDb(): Promise<void> {
  await pool?.end();
}
