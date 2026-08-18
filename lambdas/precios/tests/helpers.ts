import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb, migrateSchemaOnly, type Db,
  t99PEstado, t10PTipoUsuario, t10MUsuario,
  t20PMarca, t20PUnidadMedida, t20PTipoProducto, t20MProducto,
  t99PIva, t99PImpuesto, t40MListaPrecio,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));

export const SEED = {
  idUsuario: 1, tipoAdmin: 1, tipoVendedor: 2, idUsuarioVendedor: 2,
  // productos
  prodBarato: 101, prodCaro: 102,
  iva: 19, impuestoExtraId: 1, impuestoExtraValor: 20,
} as const;

export async function setupPreciosTestDb(
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
    { idUsuario: SEED.idUsuario, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin Test",
      apellPatUsuario: "User", apellMatUsuario: "X", password: "unused", idTipoUsuario: SEED.tipoAdmin,
      direccionUsuario: "-", idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1 },
    { idUsuario: SEED.idUsuarioVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vendedor Test",
      apellPatUsuario: "User", apellMatUsuario: "Y", password: "unused", idTipoUsuario: SEED.tipoVendedor,
      direccionUsuario: "-", idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1 },
  ]);

  // pricing prerequisites
  await db.insert(t99PIva).values([{ iva: SEED.iva }]);
  await db.insert(t99PImpuesto).values([
    { idImpuesto: SEED.impuestoExtraId, nomImpuesto: "IABA", valor: SEED.impuestoExtraValor, idImpIss: 0 },
  ]);
  await db.insert(t20PMarca).values([{ idMarca: 1, nomMarca: "MARCA", descMarca: "", idEstado: 1 }]);
  await db.insert(t20PUnidadMedida).values([{ idUm: 1, nomUm: "UN" }]);
  await db.insert(t20PTipoProducto).values([{ idTipoProducto: 0, nomTipoProducto: "SIN TIPO", descTipoProducto: "",
    idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1 }]);
  await db.insert(t20MProducto).values([
    { idProducto: SEED.prodBarato, nomProducto: "Barato", descProducto: "", codBarraProducto: "",
      idTipoProducto: 0, idMarca: 1, idUm: 1, idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
      idEstado: 1, costoProm: "900.00", ultFechaCompra: null, codSerfel: 101, impuesto: 0, usaPorciones: 0 },
    { idProducto: SEED.prodCaro, nomProducto: "Caro", descProducto: "", codBarraProducto: "",
      idTipoProducto: 0, idMarca: 1, idUm: 1, idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
      idEstado: 1, costoProm: "5000.00", ultFechaCompra: null, codSerfel: 102, impuesto: SEED.impuestoExtraId, usaPorciones: 0 },
  ]);

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}

/** Helper to seed a lista directly (bypasses createLista) for grid tests. */
export async function seedLista(db: Db, id: number, nombre: string, idEstado = 1): Promise<void> {
  await db.insert(t40MListaPrecio).values({
    idListaPrecio: id, nomListaPrecio: nombre, idUsuarioMod: SEED.idUsuario,
    ultFechaMod: "2026-01-01 00:00:00", idEstado,
  });
}
