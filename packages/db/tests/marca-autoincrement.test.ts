import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { createDb, type DbCredentials } from "../src/client";
import { migrateSchemaOnly } from "../src/test-migrate";
import { t20PMarca } from "../src/schema";
import { eq } from "drizzle-orm";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const TEST_DB = "serfel_test_marca_autoinc";

const creds: DbCredentials = {
  host: ROOT.host, port: ROOT.port, username: ROOT.user,
  password: ROOT.password, dbname: TEST_DB,
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

describe("20_p_marca AUTO_INCREMENT + id_estado", () => {
  it("auto-assigns id_marca and defaults id_estado to 1", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    try {
      await migrateSchemaOnly(db, "migrations");

      const [first] = await db.insert(t20PMarca).values({ nomMarca: "SOPROLE" });
      const [second] = await db.insert(t20PMarca).values({ nomMarca: "NESTLE" });

      expect(first.insertId).toBeGreaterThan(0);
      expect(second.insertId).toBe(first.insertId + 1);

      const rows = await db
        .select({ idEstado: t20PMarca.idEstado })
        .from(t20PMarca)
        .where(eq(t20PMarca.idMarca, first.insertId));
      expect(rows[0].idEstado).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
