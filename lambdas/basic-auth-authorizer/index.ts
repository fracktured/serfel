import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { verifyBasicAuth } from "./verify";

const sm = new SecretsManagerClient({});
let cached: { username: string; password: string } | null = null;

async function getExpected() {
  if (cached) return cached;
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.BASIC_AUTH_SECRET_ARN })
  );
  cached = JSON.parse(secret.SecretString!) as { username: string; password: string };
  return cached;
}

// HTTP API v2 simple-response authorizer.
export async function handler(event: {
  headers?: Record<string, string | undefined>;
}): Promise<{ isAuthorized: boolean }> {
  const header = event.headers?.authorization ?? event.headers?.Authorization;
  const expected = await getExpected();
  return { isAuthorized: verifyBasicAuth(header, expected) };
}
