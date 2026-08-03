import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { stackTags } from "../tags";

// Placeholder credentials for dev; rotate to the real Express-app credentials
// (design §12 carry-forward) before Plans 4–5 go live.
const basicAuthSecret = new aws.secretsmanager.Secret("rehost-basic-auth", {
  name: "serfel-dev-rehost-basic-auth",
  description: "Basic Auth credentials for rehosted node APIs",
  tags: stackTags("serfel-rehost"),
});
new aws.secretsmanager.SecretVersion("rehost-basic-auth-v", {
  secretId: basicAuthSecret.id,
  secretString: pulumi.jsonStringify({ username: "serfel", password: "changeme-in-secrets-manager" }),
});

export const basicAuthorizerFn = new sst.aws.Function("RehostBasicAuthFn", {
  handler: "lambdas/basic-auth-authorizer/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "10 seconds",
  memory: "128 MB",
  environment: { BASIC_AUTH_SECRET_ARN: basicAuthSecret.arn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [basicAuthSecret.arn] }],
  transform: { function: { name: "serfel-dev-rehost-basic-auth", tags: stackTags("serfel-rehost") } },
});

export const basicAuthSecretArn = basicAuthSecret.arn;
