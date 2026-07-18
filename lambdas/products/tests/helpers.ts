import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import { migrate } from "drizzle-orm/mysql2/migrator";
import {
  createDb,
  type Db,
  t99PEstado,
  t10PTipoUsuario,
  t10MUsuario,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t99PImpuesto,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };

const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);

export const SEED = {
  idUsuario: 1,
  idUsuarioVendedor: 2,
  tipoAdmin: 1,
  tipoVendedor: 2,
  marcaSoprole: 1,
  marcaNestle: 2,
  tipoYogurt: 1,
  umUni: 1,
  umLt: 2,
  impSinAdicional: 0,
  impIva: 3,
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
  await migrate(db, { migrationsFolder: MIGRATIONS });

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    {
      idUsuario: SEED.idUsuario, rutUsuario: 11111111, dvUsuario: "1",
      nomUsuario: "Admin Test", apellPatUsuario: "User", apellMatUsuario: "X",
      password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-",
      idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
    {
      idUsuario: SEED.idUsuarioVendedor, rutUsuario: 22222222, dvUsuario: "2",
      nomUsuario: "Vendedor Test", apellPatUsuario: "User", apellMatUsuario: "Y",
      password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-",
      idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
  ]);
  await db.insert(t20PMarca).values([
    { idMarca: SEED.marcaSoprole, nomMarca: "SOPROLE" },
    { idMarca: SEED.marcaNestle, nomMarca: "NESTLE" },
  ]);
  await db.insert(t20PTipoProducto).values({
    idTipoProducto: SEED.tipoYogurt, nomTipoProducto: "YOGURT",
    idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
  });
  await db.insert(t20PUnidadMedida).values([
    { idUm: SEED.umUni, nomUm: "UNI" },
    { idUm: SEED.umLt, nomUm: "LT" },
  ]);
  // id 0 "Sin Imp. Adicional" is seeded by migration 0002 (applied above);
  // only add the extra IVA row the tests exercise.
  await db.insert(t99PImpuesto).values([
    { idImpuesto: SEED.impIva, nomImpuesto: "IVA", valor: 19, idImpIss: 14 },
  ]);

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}
