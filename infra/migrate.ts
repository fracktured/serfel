import { privateSubnetIds, sgLambdaId } from "./vpc";
import { dbSecretArn } from "./database";
import { stackTags } from "./tags";

new sst.aws.Function("Migrate", {
  handler: "lambdas/migrate/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  // Seed migrations 0004/0005 replay the full Clientes/Productos spreadsheets
  // (~27k statements) in a single transaction over one connection, so the
  // default 60s is not enough. 900s is the Lambda max; 512MB covers reading
  // and splitting the ~7MB of migration SQL in memory.
  timeout: "900 seconds",
  memory: "512 MB",
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
    { from: "packages/db/migrations", to: "migrations" },
    { from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" },
  ],
  transform: {
    function: { name: `serfel-${$app.stage}-migrate`, tags: stackTags("serfel-shared") },
    logGroup: { name: `/aws/lambda/serfel-${$app.stage}-migrate`, tags: stackTags("serfel-shared") },
  },
});
