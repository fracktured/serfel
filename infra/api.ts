import { privateSubnetIds, sgLambdaId } from "./vpc";
import { dbSecretArn } from "./database";
import { userPoolClientId, userPoolEndpoint, userPoolId, userPoolArn } from "./auth";
import { stackTags } from "./tags";

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
    function: { name: `serfel-${$app.stage}-products`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
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
    function: { name: `serfel-${$app.stage}-rutas`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});

const usuariosFn = new sst.aws.Function("UsuariosFn", {
  handler: "lambdas/usuarios/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: {
    DB_SECRET_ARN: dbSecretArn,
    USER_POOL_ID: userPoolId,
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] },
    { actions: ["cognito-idp:ListUsers", "cognito-idp:AdminCreateUser"], resources: [userPoolArn] },
  ],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-usuarios`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});

const clientesFn = new sst.aws.Function("ClientesFn", {
  handler: "lambdas/clientes/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-clientes`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});

const ventasFn = new sst.aws.Function("VentasFn", {
  handler: "lambdas/ventas/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-ventas`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});

const marcasFn = new sst.aws.Function("MarcasFn", {
  handler: "lambdas/marcas/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-marcas`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});

const api = new sst.aws.ApiGatewayV2("Api", {
  // dev-only wildcard CORS (JWT still required); tighten in Fase 5
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["*"],
    allowHeaders: ["authorization", "content-type"],
  },
  transform: { api: { name: `serfel-${$app.stage}-api`, tags: stackTags("serfel-aws") } },
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
  "GET /api/products/{id}/detalle",
  "PUT /api/products/{id}/stock",
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

const usuariosRoutes = [
  "GET /api/usuarios",
  "GET /api/usuarios/lookups",
  "POST /api/usuarios",
  "PUT /api/usuarios/{id}",
  "POST /api/usuarios/{id}/activate",
  "POST /api/usuarios/{id}/deactivate",
  "POST /api/usuarios/{id}/cognito",
] as const;
for (const route of usuariosRoutes) {
  api.route(route, usuariosFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}

const clientesRoutes = [
  "GET /api/clientes",
  "GET /api/clientes/lookups",
  "POST /api/clientes",
  "PUT /api/clientes/{rut}",
  "POST /api/clientes/{rut}/activate",
  "POST /api/clientes/{rut}/deactivate",
  "GET /api/locales/lookups",
  "GET /api/clientes/{rut}/locales",
  "POST /api/clientes/{rut}/locales",
  "PUT /api/locales/{id}",
  "DELETE /api/locales/{id}",
  "POST /api/locales/{id}/activate",
] as const;
for (const route of clientesRoutes) {
  api.route(route, clientesFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}

const ventasRoutes = [
  "GET /api/prefacturacion/pendientes",
  "GET /api/prefacturacion/empresas",
  "POST /api/prefacturacion",
] as const;
for (const route of ventasRoutes) {
  api.route(route, ventasFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}

const marcasRoutes = [
  "GET /api/marcas",
  "POST /api/marcas",
  "PUT /api/marcas/{id}",
  "DELETE /api/marcas/{id}",
  "POST /api/marcas/{id}/restore",
] as const;
for (const route of marcasRoutes) {
  api.route(route, marcasFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}

export const apiUrl = api.url;
