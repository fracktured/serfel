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

// Register the data methods explicitly rather than ANY, so OPTIONS is left
// unrouted: API Gateway then answers CORS preflight itself (204 + headers,
// no authorizer). An ANY route matches OPTIONS too, sending the preflight
// through the JWT authorizer — which 401s the browser's credential-less
// preflight and blocks every cross-origin call from CloudFront.
for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  api.route(`${method} /api/{proxy+}`, productsFn.arn, {
    auth: { jwt: { authorizer: jwtAuthorizer.id } },
  });
}

export const apiUrl = api.url;
