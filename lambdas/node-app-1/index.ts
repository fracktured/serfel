import serverlessExpress from "@codegenie/serverless-express";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { stripCoproadPrefix } from "@serfel/shared";

const sm = new SecretsManagerClient({});
let cached: ReturnType<typeof serverlessExpress> | undefined;

async function bootstrap() {
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  const c = JSON.parse(secret.SecretString!) as {
    host: string; username: string; password: string; dbname: string;
  };
  // Sequelize (src/config/bd.sequelize.ts) reads these at import time.
  process.env.DB_HOST = c.host;
  process.env.DB_USER = c.username;
  process.env.DB_PWD = c.password;   // note: DB_PWD, not DB_PASS
  process.env.DB_NAME = process.env.DB_SCHEMA_OVERRIDE ?? c.dbname; // serfel by default; "coproad" for the Coproad Function
  const app = (await import("./src/app")).default;
  return serverlessExpress({ app });
}

interface HttpV2Event {
  rawPath?: string;
  requestContext?: { http?: { path?: string } };
}

export const handler = async (event: HttpV2Event, context: unknown) => {
  cached ??= await bootstrap();
  if (typeof event.rawPath === "string") {
    event.rawPath = stripCoproadPrefix(event.rawPath);
  }
  if (typeof event.requestContext?.http?.path === "string") {
    event.requestContext.http.path = stripCoproadPrefix(event.requestContext.http.path);
  }
  return (cached as (e: unknown, c: unknown) => unknown)(event, context);
};
