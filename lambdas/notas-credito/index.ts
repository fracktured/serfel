import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import type { EmisorEvent, EmisorResult } from "@serfel/shared";
import { createApp } from "./app";

const sm = new SecretsManagerClient({});
const lambda = new LambdaClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  if (!secret.SecretString) throw new Error("DB secret has no SecretString");
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, { ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") } }).db;
  return cachedDb;
}

async function invokeEmisor(event: EmisorEvent): Promise<EmisorResult> {
  const out = await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMISOR_FN_ARN,
    Payload: Buffer.from(JSON.stringify(event)),
  }));
  if (!out.Payload) return { ok: false, error: "emisor sin respuesta" };
  return JSON.parse(Buffer.from(out.Payload).toString("utf8")) as EmisorResult;
}

interface JwtEnv { event?: { requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } } }; }

const app = createApp({
  getDb, invokeEmisor,
  getIdUsuario: (c) => {
    const claims = (c.env as JwtEnv).event?.requestContext?.authorizer?.jwt?.claims;
    const parsed = Number(claims?.["custom:id_usuario"]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
});

export const handler = handle(app);
