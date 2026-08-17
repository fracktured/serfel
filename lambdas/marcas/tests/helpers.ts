import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb, migrateSchemaOnly, type Db,
  t99PEstado, t10PTipoUsuario, t10MUsuario,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);

export const SEED = { idUsuario: 1, tipoAdmin: 1, tipoVendedor: 2, idUsuarioVendedor: 2 } as const;

export async function setupTestDb(
  dbName: string
): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false }
  );
  await migrateSchemaOnly(db, MIGRATIONS);

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

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}
