import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { privateSubnetIds } from "../vpc";
import { dbSecretArn } from "../database";
import { sgFargateId } from "./network";
import { phpApp1RepoUrl } from "./ecr";
import { phpApp1TargetGroupArn } from "./alb";

const cluster = new aws.ecs.Cluster("rehost-cluster", {
  name: "serfel-dev-rehost",
  tags: { Name: "serfel-dev-rehost" },
});

// Execution role: pull from ECR, write logs, read the DB secret at task start.
const execRole = new aws.iam.Role("rehost-php1-exec", {
  name: "serfel-dev-rehost-php1-exec",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Principal: { Service: "ecs-tasks.amazonaws.com" }, Action: "sts:AssumeRole" }],
  }),
});
new aws.iam.RolePolicyAttachment("rehost-php1-exec-managed", {
  role: execRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});
new aws.iam.RolePolicy("rehost-php1-exec-secret", {
  role: execRole.id,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Action: ["secretsmanager:GetSecretValue"], Resource: dbSecretArn }],
  }),
});

const logGroup = new aws.cloudwatch.LogGroup("rehost-php1-logs", {
  name: "/ecs/serfel-dev-rehost-php-app-1",
  retentionInDays: 14,
});

const taskDef = new aws.ecs.TaskDefinition("rehost-php1-task", {
  family: "serfel-dev-rehost-php-app-1",
  cpu: "256",
  memory: "512",
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  // The Task-3 health image was built arm64 (on Apple Silicon), so the task
  // runs on Graviton. Fargate supports ARM64 natively; keeps it in sync with
  // the actual image and avoids an x86 rebuild. Flip both to X86_64 together
  // if the image is ever rebuilt for x86.
  runtimePlatform: { cpuArchitecture: "ARM64", operatingSystemFamily: "LINUX" },
  executionRoleArn: execRole.arn,
  containerDefinitions: pulumi
    .all([phpApp1RepoUrl, dbSecretArn, logGroup.name])
    .apply(([repoUrl, secretArn, lg]) =>
      JSON.stringify([{
        name: "php-app-1",
        image: `${repoUrl}:health`,
        essential: true,
        portMappings: [{ containerPort: 80, protocol: "tcp" }],
        // DB creds pulled from Secrets Manager JSON keys into env vars.
        secrets: [
          { name: "DB_HOST", valueFrom: `${secretArn}:host::` },
          { name: "DB_PORT", valueFrom: `${secretArn}:port::` },
          { name: "DB_USER", valueFrom: `${secretArn}:username::` },
          { name: "DB_PASS", valueFrom: `${secretArn}:password::` },
          { name: "DB_NAME", valueFrom: `${secretArn}:dbname::` },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: { "awslogs-group": lg, "awslogs-region": "us-east-1", "awslogs-stream-prefix": "php-app-1" },
        },
      }])
    ),
});

new aws.ecs.Service("rehost-php1-svc", {
  name: "serfel-dev-rehost-php-app-1",
  cluster: cluster.arn,
  taskDefinition: taskDef.arn,
  desiredCount: 1,
  launchType: "FARGATE",
  networkConfiguration: {
    subnets: privateSubnetIds,
    securityGroups: [sgFargateId],
    assignPublicIp: false,
  },
  loadBalancers: [{ targetGroupArn: phpApp1TargetGroupArn, containerName: "php-app-1", containerPort: 80 }],
  tags: { Name: "serfel-dev-rehost-php-app-1" },
});
