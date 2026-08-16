import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb,
  migrateSchemaOnly,
  type Db,
  t99PEstado,
  t10PTipoUsuario,
  t10MUsuario,
  t40MListaPrecio,
  t10MCliente,
  t10MLocalCliente,
  t10PTipoDocto,
  t40PFormaPago,
  t10MEmpresa,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };

const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);

export const SEED = {
  idAdmin: 1,
  tipoAdmin: 1,
  tipoVendedor: 2,
  idListaPrecio: 1,
  rutCliente: 1,
  idLocalCliente: 1,
  idTipoDocto: 1,
  rutEmpresa: 1,
  /** id_estado for a venta/pedido pending payment (legacy: v.id_estado = 2). */
  idEstadoPendiente: 2,
} as const;

export async function setupTestDb(
  dbName: string
): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    {
      host: ROOT.host,
      port: ROOT.port,
      username: ROOT.user,
      password: ROOT.password,
      dbname: dbName,
    },
    { ssl: false }
  );
  await migrateSchemaOnly(db, MIGRATIONS);

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
    { idEstado: SEED.idEstadoPendiente, nomEstado: "Pendiente", descEstado: "Pendiente de pago" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    {
      idUsuario: SEED.idAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin",
      apellPatUsuario: "Uno", apellMatUsuario: "X", password: "seed", idTipoUsuario: SEED.tipoAdmin,
      telefonoUsuario: "1", direccionUsuario: "-", emailUsuario: "admin@serfel.cl", numUsuario: 0,
      idUsuarioMod: SEED.idAdmin, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
  ]);

  // Rows needed to satisfy FK chains for the deactivate-guard pedido/venta test.
  await db.insert(t40MListaPrecio).values({
    idListaPrecio: SEED.idListaPrecio, nomListaPrecio: "Base",
    idUsuarioMod: SEED.idAdmin, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
  });
  await db.insert(t10MCliente).values({
    rutCliente: SEED.rutCliente, dvCliente: "9", razonSocial: "Cliente Test",
    idListaPrecio: SEED.idListaPrecio, idUsuarioMod: SEED.idAdmin,
    ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
  });
  await db.insert(t40PFormaPago).values({ idFormaPago: 7, nomFormaPago: "CREDITO", descFormaPago: "Pago a credito" }).onDuplicateKeyUpdate({ set: { nomFormaPago: "CREDITO" } });
  await db.insert(t10MLocalCliente).values({
    idLocalCliente: SEED.idLocalCliente, rutCliente: SEED.rutCliente, nomLocalCliente: "Local Test",
    idUsuarioMod: SEED.idAdmin, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
  });
  await db.insert(t10PTipoDocto).values({
    idTipoDocto: SEED.idTipoDocto, nomTipoDocto: "Factura", descTipoDocto: "Factura",
  });
  await db.insert(t10MEmpresa).values({
    rutEmpresa: SEED.rutEmpresa, dvEmpresa: "9", razonSocial: "Empresa Test",
    nomFantasia: "Empresa Test", direccionEmpresa: "Calle 1", idUsuarioMod: SEED.idAdmin,
    ultFechaMod: "2026-01-01 00:00:00", idEstado: 1, giro: "Ventas",
    codActividadEconomica: 0, comuna: "Santiago", ciudad: "Santiago",
    rutRepresentanteLegal: SEED.rutEmpresa, dvRepresentanteLegal: "9",
    fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}
