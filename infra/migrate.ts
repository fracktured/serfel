import { privateSubnetIds, sgLambdaId } from "./vpc";
import { dbSecretArn } from "./database";

new sst.aws.Function("Migrate", {
  handler: "lambdas/migrate/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "60 seconds",
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
    { from: "packages/db/migrations", to: "migrations" },
    { from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" },
  ],
  transform: {
    function: { name: "serfel-dev-migrate" },
    logGroup: { name: "/aws/lambda/serfel-dev-migrate" },
  },
});
