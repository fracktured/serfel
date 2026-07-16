import * as aws from "@pulumi/aws";
import { dbInstanceArn, dbInstanceIdentifier } from "./database";

const guardFn = new sst.aws.Function("DbGuard", {
  handler: "lambdas/db-guard/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "15 minutes",
  // NOT in the VPC on purpose: it calls the public RDS API, and the VPC has
  // no NAT and no RDS API endpoint.
  environment: {
    DB_INSTANCE_ID: dbInstanceIdentifier,
  },
  permissions: [
    // DescribeDBInstances requires '*' resource scope — scoping to the
    // instance ARN is rejected at runtime by the RDS API for describe calls.
    { actions: ["rds:DescribeDBInstances"], resources: ["*"] },
    { actions: ["rds:StopDBInstance"], resources: [dbInstanceArn] },
  ],
  transform: {
    function: { name: "serfel-dev-db-guard" },
    logGroup: { name: "/aws/lambda/serfel-dev-db-guard" },
  },
});

const rule = new aws.cloudwatch.EventRule("db-autostart-rule", {
  name: "serfel-dev-db-autostart-guard",
  description: "Re-stop serfel-dev-db when AWS force-starts it after 7 days stopped",
  eventPattern: JSON.stringify({
    source: ["aws.rds"],
    "detail-type": ["RDS DB Instance Event"],
    detail: {
      SourceIdentifier: [dbInstanceIdentifier],
      EventID: ["RDS-EVENT-0154"],
    },
  }),
});

new aws.cloudwatch.EventTarget("db-autostart-target", {
  rule: rule.name,
  arn: guardFn.arn,
});

new aws.lambda.Permission("db-guard-eventbridge", {
  action: "lambda:InvokeFunction",
  function: guardFn.name,
  principal: "events.amazonaws.com",
  sourceArn: rule.arn,
});
