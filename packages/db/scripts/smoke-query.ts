import { createDb } from "../src/client";
import * as schema from "../src/schema";

const password = process.env.DB_PASS;
if (!password) throw new Error("Set DB_PASS (see Task 11 Step 2)");

const { db, pool } = createDb(
  { host: "127.0.0.1", port: 3306, username: "serfeladmin", password, dbname: "serfel" },
  { ssl: { rejectUnauthorized: false } } // tunnel: hostname won't match cert
);

const rows = await db.select().from(schema.t20MProducto).limit(5);
console.log(`${rows.length} rows from t20MProducto (20_m_producto):`);
console.dir(rows, { depth: 1 });
await pool.end();
