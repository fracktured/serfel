import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { createDb, type Db, type DbCredentials } from "@serfel/db";

const sm = new SecretsManagerClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  const creds = JSON.parse(secret.SecretString!) as DbCredentials;
  cachedDb = createDb(creds, { ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") } }).db;
  return cachedDb;
}

const app = new Hono().basePath("/api/node");
app.get("/health", async (c) => {
  let db = "unchecked";
  try {
    await (await getDb()).execute("SELECT 1");
    db = "reachable";
  } catch {
    db = "unreachable";
  }
  return c.json({ status: "ok", app: "rehost-health", db });
});

export const handler = handle(app);
