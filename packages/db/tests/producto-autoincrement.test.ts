import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, type DbCredentials } from "../src/client";
import {
  t99PEstado,
  t10PTipoUsuario,
  t10MUsuario,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t20MProducto,
} from "../src/schema";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const TEST_DB = "serfel_test_autoinc";

const creds: DbCredentials = {
  host: ROOT.host,
  port: ROOT.port,
  username: ROOT.user,
  password: ROOT.password,
  dbname: TEST_DB,
};

beforeAll(async () => {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await conn.query(`CREATE DATABASE ${TEST_DB}`);
  await conn.end();
});

afterAll(async () => {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await conn.end();
});

describe("20_m_producto id_producto AUTO_INCREMENT", () => {
  it("assigns ids on insert without an explicit id_producto", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    try {
      await migrate(db, { migrationsFolder: "migrations" });

      // minimal FK seed
      await db.insert(t99PEstado).values([
        { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
        { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
      ]);
      await db.insert(t10PTipoUsuario).values({
        idTipoUsuario: 1, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador",
      });
      await db.insert(t10MUsuario).values({
        idUsuario: 1, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Test",
        apellPatUsuario: "User", apellMatUsuario: "X", password: "unused",
        idTipoUsuario: 1, direccionUsuario: "-", idUsuarioMod: 1,
        ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
      });
      await db.insert(t20PMarca).values({ idMarca: 1, nomMarca: "SOPROLE" });
      await db.insert(t20PTipoProducto).values({
        idTipoProducto: 1, nomTipoProducto: "YOGURT",
        idUsuarioMod: 1, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
      });
      await db.insert(t20PUnidadMedida).values({ idUm: 1, nomUm: "UNI" });

      const base = {
        nomProducto: "P1", descProducto: "", codBarraProducto: "",
        idTipoProducto: 1, idMarca: 1, idUm: 1, idUsuarioMod: 1,
        ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
        codSerfel: 100, impuesto: 0, usaPorciones: 0,
      };
      // $returningId() does not work with table-level PK constraints (this
      // schema's introspected style) — read mysql2's ResultSetHeader.insertId.
      const [first] = await db.insert(t20MProducto).values(base);
      const [second] = await db
        .insert(t20MProducto)
        .values({ ...base, nomProducto: "P2", codSerfel: 101 });

      expect(first.insertId).toBeGreaterThan(0);
      expect(second.insertId).toBe(first.insertId + 1);
    } finally {
      await pool.end();
    }
  });
});
