import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, type DbCredentials } from "../src/client";

// Requires the local docker mariadb: `docker compose up -d` in packages/db
const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const TEST_DB = "serfel_test";

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

describe("createDb", () => {
  it("connects and runs a query (ssl disabled for local docker)", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    const result = await db.execute(sql`SELECT 1 AS one`);
    expect((result as unknown as [{ one: number }[], unknown])[0][0].one).toBe(1);
    await pool.end();
  });

  it("applies the migration journal to a fresh database", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    await migrate(db, { migrationsFolder: "migrations" });
    const result = await db.execute(
      sql`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ${TEST_DB}`
    );
    const count = Number((result as unknown as [{ c: unknown }[], unknown])[0][0].c);
    expect(count).toBeGreaterThan(0);
    await pool.end();
  }, 60_000);
});
