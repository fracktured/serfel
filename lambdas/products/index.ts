import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import { createApp } from "./app";

const sm = new SecretsManagerClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  if (!secret.SecretString) {
    throw new Error("DB secret has no SecretString");
  }
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, {
    ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") },
  }).db;
  return cachedDb;
}

interface JwtEnv {
  event?: {
    requestContext?: {
      authorizer?: { jwt?: { claims?: Record<string, unknown> } };
    };
  };
}

const app = createApp({
  getDb,
  getIdUsuario: (c) => {
    const claims = (c.env as JwtEnv).event?.requestContext?.authorizer?.jwt?.claims;
    const parsed = Number(claims?.["custom:id_usuario"]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
});

export const handler = handle(app);
