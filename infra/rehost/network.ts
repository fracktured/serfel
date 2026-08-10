import * as aws from "@pulumi/aws";
import { vpcId, sgRdsId } from "../vpc";
import { stackTags } from "../tags";

// CloudFront origin-facing managed prefix list — the internet-facing ALB
// (Branch B) accepts HTTP only from CloudFront edge locations. Combined with
// the secret X-Origin-Verify header enforced at the ALB listener (alb.ts), this
// keeps the public ALB reachable only through the rehost CloudFront. (Branch A
// — internal ALB via CloudFront VPC origin — was abandoned: it 504'd for 24+
// min despite provably-correct SG/port/association.)
const cfPrefixList = aws.ec2.getManagedPrefixListOutput({
  name: "com.amazonaws.global.cloudfront.origin-facing",
});

// ALB security group: HTTP from CloudFront edge only.
// NOTE: description is immutable in AWS — keep the original string so this SG
// updates in place (ingress change only) instead of being replaced (a
// replacement deadlocks against the ALB that still references it).
const sgAlb = new aws.ec2.SecurityGroup("rehost-alb", {
  name: `serfel-${$app.stage}-rehost-alb`,
  vpcId,
  description: "Rehost internal ALB",
  ingress: [{
    protocol: "tcp", fromPort: 80, toPort: 80,
    prefixListIds: [cfPrefixList.id],
    description: "HTTP from CloudFront (origin-facing prefix list)",
  }],
  egress: [{
    protocol: "tcp", fromPort: 80, toPort: 80,
    cidrBlocks: ["10.0.0.0/16"], description: "HTTP to Fargate tasks",
  }],
  tags: { Name: `serfel-${$app.stage}-rehost-alb`, ...stackTags("serfel-rehost") },
});

// S3 managed prefix list — ECR image layers are served from S3, reached via the
// S3 gateway endpoint. Gateway-endpoint traffic keeps S3's public IP as the
// destination, so the Fargate SG must allow egress to the S3 prefix list (the
// 10.0.0.0/16 rule only covers the ECR *interface* endpoints' private IPs).
const s3PrefixList = aws.ec2.getPrefixListOutput({ name: "com.amazonaws.us-east-1.s3" });

// Fargate task security group: HTTP in from the ALB; egress to RDS + endpoints.
const sgFargate = new aws.ec2.SecurityGroup("rehost-fargate", {
  name: `serfel-${$app.stage}-rehost-fargate`,
  vpcId,
  description: "Rehost Fargate PHP tasks",
  egress: [
    { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["10.0.0.0/16"], description: "HTTPS to VPC endpoints" },
    { protocol: "tcp", fromPort: 443, toPort: 443, prefixListIds: [s3PrefixList.id], description: "HTTPS to S3 (ECR image layers) via gateway endpoint" },
    // Outbound to external 3rd-party APIs. The task runs in a public subnet
    // with a public IP (fargate.ts) and egresses via the IGW; the PHP app calls
    // ws.facturacion.cl over HTTP (port 80) and some endpoints over HTTPS, both
    // to public destination IPs, so the SG must allow 0.0.0.0/0.
    { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"], description: "HTTP to external APIs (via IGW)" },
    { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"], description: "HTTPS to external APIs (via IGW)" },
    { protocol: "tcp", fromPort: 3306, toPort: 3306, cidrBlocks: ["10.0.3.0/24", "10.0.4.0/24"], description: "MariaDB to private subnets" },
  ],
  tags: { Name: `serfel-${$app.stage}-rehost-fargate`, ...stackTags("serfel-rehost") },
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
