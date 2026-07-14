import mysql, { type Pool, type SslOptions } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";

export interface DbCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  dbname: string;
}

export interface CreateDbOptions {
  /** TLS options passed to mysql2. `false` disables TLS (local docker only). */
  ssl?: SslOptions | false;
}

/**
 * Connection factory for Lambda use: instantiate at module level (outside the
 * handler) so warm invocations reuse the pool. connectionLimit is 1 by design
 * (see master plan §2.5 — no RDS Proxy, low per-function concurrency).
 */
export function createDb(
  creds: DbCredentials,
  opts: CreateDbOptions = {}
): { db: MySql2Database<typeof schema>; pool: Pool } {
  const pool = mysql.createPool({
    host: creds.host,
    port: creds.port,
    user: creds.username,
    password: creds.password,
    database: creds.dbname,
    connectionLimit: 1,
    ...(opts.ssl !== undefined && opts.ssl !== false ? { ssl: opts.ssl } : {}),
  });
  const db = drizzle(pool, { schema, mode: "default" });
  return { db, pool };
}
