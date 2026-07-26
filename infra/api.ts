import { privateSubnetIds, sgLambdaId } from "./vpc";
import { dbSecretArn } from "./database";
import { userPoolClientId, userPoolEndpoint } from "./auth";

const productsFn = new sst.aws.Function("ProductsFn", {
  handler: "lambdas/products/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: {
    privateSubnets: privateSubnetIds,
    securityGroups: [sgLambdaId],
  },
  environment: {
    DB_SECRET_ARN: dbSecretArn,
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] },
  ],
  copyFiles: [
    { from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" },
  ],
  transform: {
    function: { name: "serfel-dev-products" },
  },
});

const rutasFn = new sst.aws.Function("RutasFn", {
  handler: "lambdas/rutas/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  // pdfkit reads .afm font metrics at runtime; keep it unbundled so those
  // data files ship with the function.
  nodejs: { install: ["pdfkit"] },
  vpc: {
    privateSubnets: privateSubnetIds,
    securityGroups: [sgLambdaId],
  },
  environment: {
    DB_SECRET_ARN: dbSecretArn,
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] },
  ],
  copyFiles: [
    { from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" },
  ],
  transform: {
    function: { name: "serfel-dev-rutas" },
  },
});

const api = new sst.aws.ApiGatewayV2("Api", {
  // dev-only wildcard CORS (JWT still required); tighten in Fase 5
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["*"],
    allowHeaders: ["authorization", "content-type"],
  },
  transform: { api: { name: "serfel-dev-api" } },
});

const jwtAuthorizer = api.addAuthorizer({
  name: "cognito-jwt",
  jwt: {
    issuer: $interpolate`https://${userPoolEndpoint}`,
    audiences: [userPoolClientId],
  },
});

// Explicit routes (not a catch-all) so each lambda owns its own paths without
// route-precedence surprises as more domain lambdas are added. OPTIONS is left
// unrouted on purpose: API Gateway then answers CORS preflight itself (204 +
// headers, no authorizer). An ANY route would match OPTIONS too, sending the
// preflight through the JWT authorizer — which 401s the browser's
// credential-less preflight and blocks every cross-origin call from CloudFront.
const productsRoutes = [
  "GET /api/me",
  "GET /api/lookups",
  "GET /api/products",
  "POST /api/products",
  "PUT /api/products/{id}",
  "DELETE /api/products/{id}",
  "POST /api/products/{id}/restore",
] as const;
for (const route of productsRoutes) {
  api.route(route, productsFn.arn, {
    auth: { jwt: { authorizer: jwtAuthorizer.id } },
  });
}

api.route("GET /api/routes", rutasFn.arn, {
  auth: { jwt: { authorizer: jwtAuthorizer.id } },
});
api.route("POST /api/routes/cargoList", rutasFn.arn, {
  auth: { jwt: { authorizer: jwtAuthorizer.id } },
});

export const apiUrl = api.url;
