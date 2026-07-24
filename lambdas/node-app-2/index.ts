import serverlessExpress from "@codegenie/serverless-express";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

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
  process.env.DB_NAME = c.dbname;    // = "serfel"
  const app = (await import("./src/app")).default;
  return serverlessExpress({ app });
}

export const handler = async (event: unknown, context: unknown) => {
  cached ??= await bootstrap();
  return (cached as (e: unknown, c: unknown) => unknown)(event, context);
};
