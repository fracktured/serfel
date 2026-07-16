import { readFileSync } from "node:fs";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { sql } from "drizzle-orm";
import { createDb, type DbCredentials } from "@serfel/db";

const sm = new SecretsManagerClient({});

export const handler = async (): Promise<{
  ok: boolean;
  migrationsInJournalTable: number;
}> => {
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  if (!secret.SecretString) {
    throw new Error("DB secret has no SecretString");
  }
  const creds = JSON.parse(secret.SecretString) as DbCredentials;

  const { db, pool } = createDb(creds, {
    ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") },
  });

  try {
    await migrate(db, { migrationsFolder: "migrations" });
    const result = await db.execute(
      sql`SELECT COUNT(*) AS c FROM ${sql.identifier("__drizzle_migrations")}`
    );
    const count = Number(
      (result as unknown as [{ c: unknown }[], unknown])[0][0].c
    );
    return { ok: true, migrationsInJournalTable: count };
  } finally {
    await pool.end();
  }
};
