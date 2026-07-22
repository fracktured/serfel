import { privateSubnetIds, sgLambdaId } from "../vpc";
import { dbSecretArn } from "../database";
import { basicAuthorizerFn } from "./basic-auth";

const healthFn = new sst.aws.Function("RehostHealthFn", {
  handler: "lambdas/rehost-health/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: { function: { name: "serfel-dev-rehost-health" } },
});

// Separate HTTP API from the products/Cognito API (design §5).
const nodeApi = new sst.aws.ApiGatewayV2("RehostNodeApi", {
  cors: { allowOrigins: ["*"], allowMethods: ["*"], allowHeaders: ["authorization", "content-type"] },
  transform: { api: { name: "serfel-dev-rehost-node-api" } },
});

const basicAuth = nodeApi.addAuthorizer({
  name: "basic-auth",
  lambda: {
    function: basicAuthorizerFn.arn,
    // simple response ({isAuthorized}); short TTL keeps rotated creds fresh.
    response: "simple",
    identitySources: ["$request.header.Authorization"],
    ttl: "0 seconds",
  },
});

// Register methods explicitly (leave OPTIONS unrouted for CORS preflight),
// mirroring infra/api.ts.
for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /api/node/{proxy+}`, healthFn.arn, {
    auth: { lambda: basicAuth.id },
  });
}

export const nodeApiUrl = nodeApi.url;
