import * as aws from "@pulumi/aws";
import { vpcId, sgRdsId } from "../vpc";

// ALB security group: HTTP from CloudFront (locked down in Task 8 once the
// origin approach is chosen). Starts closed; Task 8 adds the exact ingress.
const sgAlb = new aws.ec2.SecurityGroup("rehost-alb", {
  name: "serfel-dev-rehost-alb",
  vpcId,
  description: "Rehost internal ALB",
  egress: [{
    protocol: "tcp", fromPort: 80, toPort: 80,
    cidrBlocks: ["10.0.0.0/16"], description: "HTTP to Fargate tasks",
  }],
  tags: { Name: "serfel-dev-rehost-alb" },
});

// Fargate task security group: HTTP in from the ALB; egress to RDS + endpoints.
const sgFargate = new aws.ec2.SecurityGroup("rehost-fargate", {
  name: "serfel-dev-rehost-fargate",
  vpcId,
  description: "Rehost Fargate PHP tasks",
  egress: [
    { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["10.0.0.0/16"], description: "HTTPS to VPC endpoints/NAT" },
    { protocol: "tcp", fromPort: 3306, toPort: 3306, cidrBlocks: ["10.0.3.0/24", "10.0.4.0/24"], description: "MariaDB to private subnets" },
  ],
  tags: { Name: "serfel-dev-rehost-fargate" },
});

new aws.ec2.SecurityGroupRule("rehost-fargate-from-alb", {
  type: "ingress", securityGroupId: sgFargate.id,
  protocol: "tcp", fromPort: 80, toPort: 80,
  sourceSecurityGroupId: sgAlb.id, description: "HTTP from ALB",
});

// RDS accepts MariaDB from Fargate tasks (mirrors rds-from-lambda in vpc.ts).
new aws.ec2.SecurityGroupRule("rehost-rds-from-fargate", {
  type: "ingress", securityGroupId: sgRdsId,
  protocol: "tcp", fromPort: 3306, toPort: 3306,
  sourceSecurityGroupId: sgFargate.id, description: "MariaDB from rehost Fargate",
});

export const sgAlbId = sgAlb.id;
export const sgFargateId = sgFargate.id;
