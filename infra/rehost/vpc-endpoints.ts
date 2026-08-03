import * as aws from "@pulumi/aws";
import { vpcId, privateSubnetIds } from "../vpc";
import { stackTags } from "../tags";

// Fargate tasks in private subnets must reach ECR to pull images. The shared
// VPC has no NAT and no ECR endpoints (Phase 3 Lambdas didn't need them). The
// S3 gateway endpoint (image layers) and logs/secretsmanager endpoints already
// exist in infra/vpc.ts; add only the two ECR interface endpoints here.
const sgEcr = new aws.ec2.SecurityGroup("rehost-ecr-endpoints", {
  name: "serfel-dev-rehost-ecr-endpoints",
  vpcId,
  description: "Rehost ECR interface endpoints: HTTPS from VPC",
  ingress: [{
    protocol: "tcp", fromPort: 443, toPort: 443,
    cidrBlocks: ["10.0.0.0/16"], description: "HTTPS from VPC",
  }],
  egress: [],
  tags: { Name: "serfel-dev-rehost-ecr-endpoints", ...stackTags("serfel-rehost") },
});

for (const svc of ["ecr.api", "ecr.dkr"] as const) {
  new aws.ec2.VpcEndpoint(`rehost-${svc.replace(".", "-")}-endpoint`, {
    vpcId,
    serviceName: `com.amazonaws.us-east-1.${svc}`,
    vpcEndpointType: "Interface",
    subnetIds: privateSubnetIds,
    securityGroupIds: [sgEcr.id],
    privateDnsEnabled: true,
    tags: { Name: `serfel-dev-rehost-${svc}`, ...stackTags("serfel-rehost") },
  });
}
