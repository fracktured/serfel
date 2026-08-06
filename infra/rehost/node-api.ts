import { privateSubnetIds, sgLambdaId } from "../vpc";
import { dbSecretArn } from "../database";
import { basicAuthorizerFn } from "./basic-auth";
import { stackTags } from "../tags";

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
  transform: {
    function: { name: "serfel-dev-rehost-health", tags: stackTags("serfel-rehost") },
    logGroup: { tags: stackTags("serfel-rehost") },
  },
});

// Separate HTTP API from the products/Cognito API (design §5).
const nodeApi = new sst.aws.ApiGatewayV2("RehostNodeApi", {
  cors: { allowOrigins: ["*"], allowMethods: ["*"], allowHeaders: ["authorization", "content-type"] },
  transform: { api: { name: "serfel-dev-rehost-node-api", tags: stackTags("serfel-rehost") } },
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

// Ported node-app-1 (sales): the Express app is wrapped as a Lambda and does
// its own Basic Auth against 10_m_usuario, so NO API Gateway authorizer. Its
// router mounts at /sales/. Sequelize + its mysql2 dialect can't be
// esbuild-bundled (dynamic require), so install them into the bundle.
const salesFn = new sst.aws.Function("RehostSalesFn", {
  handler: "lambdas/node-app-1/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "512 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  nodejs: { install: ["sequelize", "mysql2"] },
  transform: {
    function: { name: "serfel-dev-rehost-sales", tags: stackTags("serfel-rehost") },
    logGroup: { tags: stackTags("serfel-rehost") },
  },
});

for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /sales/{proxy+}`, salesFn.arn);
}

// Coproad tenant: SAME source as salesFn, deployed again with the schema
// overridden to `coproad`. The adapter strips the /coproad prefix so the
// Express app (mounted at /sales/) matches unchanged.
const salesCoproadFn = new sst.aws.Function("RehostSalesCoproadFn", {
  handler: "lambdas/node-app-1/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "512 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn, DB_SCHEMA_OVERRIDE: "coproad" },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  nodejs: { install: ["sequelize", "mysql2"] },
  transform: {
    function: { name: "serfel-dev-rehost-sales-coproad", tags: stackTags("coproad-rehost") },
    logGroup: { tags: stackTags("coproad-rehost") },
  },
});

for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /coproad/sales/{proxy+}`, salesCoproadFn.arn);
}

// Ported node-app-2 (orders): same wrap as sales; app does its own Basic Auth,
// router mounts at /orders/. No API Gateway authorizer.
const ordersFn = new sst.aws.Function("RehostOrdersFn", {
  handler: "lambdas/node-app-2/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "512 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  nodejs: { install: ["sequelize", "mysql2"] },
  transform: {
    function: { name: "serfel-dev-rehost-orders", tags: stackTags("serfel-rehost") },
    logGroup: { tags: stackTags("serfel-rehost") },
  },
});

for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /orders/{proxy+}`, ordersFn.arn);
}

// Coproad tenant: SAME source as ordersFn, deployed again with the schema
// overridden to `coproad`. The adapter strips the /coproad prefix so the
// Express app (mounted at /orders/) matches unchanged.
const ordersCoproadFn = new sst.aws.Function("RehostOrdersCoproadFn", {
  handler: "lambdas/node-app-2/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "512 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn, DB_SCHEMA_OVERRIDE: "coproad" },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  nodejs: { install: ["sequelize", "mysql2"] },
  transform: {
    function: { name: "serfel-dev-rehost-orders-coproad", tags: stackTags("coproad-rehost") },
    logGroup: { tags: stackTags("coproad-rehost") },
  },
});

for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /coproad/orders/{proxy+}`, ordersCoproadFn.arn);
}

export const nodeApiUrl = nodeApi.url;
