import * as aws from "@pulumi/aws";
import { stackTags } from "./tags";

const vpc = new aws.ec2.Vpc("vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: `serfel-${$app.stage}-vpc`, ...stackTags("serfel-shared") },
});

const igw = new aws.ec2.InternetGateway("igw", {
  vpcId: vpc.id,
  tags: { Name: `serfel-${$app.stage}-igw`, ...stackTags("serfel-shared") },
});

const publicSubnet1a = new aws.ec2.Subnet("public-1a", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "us-east-1a",
  mapPublicIpOnLaunch: true,
  tags: { Name: `serfel-${$app.stage}-public-1a`, ...stackTags("serfel-shared") },
});

const publicSubnet1b = new aws.ec2.Subnet("public-1b", {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: "us-east-1b",
  mapPublicIpOnLaunch: true,
  tags: { Name: `serfel-${$app.stage}-public-1b`, ...stackTags("serfel-shared") },
});

const privateSubnet1a = new aws.ec2.Subnet("private-1a", {
  vpcId: vpc.id,
  cidrBlock: "10.0.3.0/24",
  availabilityZone: "us-east-1a",
  tags: { Name: `serfel-${$app.stage}-private-1a`, ...stackTags("serfel-shared") },
});

const privateSubnet1b = new aws.ec2.Subnet("private-1b", {
  vpcId: vpc.id,
  cidrBlock: "10.0.4.0/24",
  availabilityZone: "us-east-1b",
  tags: { Name: `serfel-${$app.stage}-private-1b`, ...stackTags("serfel-shared") },
});

const publicRt = new aws.ec2.RouteTable("public-rt", {
  vpcId: vpc.id,
  routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
  tags: { Name: `serfel-${$app.stage}-public-rt`, ...stackTags("serfel-shared") },
});

new aws.ec2.RouteTableAssociation("public-rta-1a", {
  subnetId: publicSubnet1a.id,
  routeTableId: publicRt.id,
});

new aws.ec2.RouteTableAssociation("public-rta-1b", {
  subnetId: publicSubnet1b.id,
  routeTableId: publicRt.id,
});

const privateRt = new aws.ec2.RouteTable("private-rt", {
  vpcId: vpc.id,
  tags: { Name: `serfel-${$app.stage}-private-rt`, ...stackTags("serfel-shared") },
});

new aws.ec2.RouteTableAssociation("private-rta-1a", {
  subnetId: privateSubnet1a.id,
  routeTableId: privateRt.id,
});

new aws.ec2.RouteTableAssociation("private-rta-1b", {
  subnetId: privateSubnet1b.id,
  routeTableId: privateRt.id,
});

const sgEndpoints = new aws.ec2.SecurityGroup("endpoints", {
  name: `serfel-${$app.stage}-endpoints`,
  vpcId: vpc.id,
  description: "VPC Endpoints: HTTPS inbound from VPC",
  ingress: [{
    protocol: "tcp",
    fromPort: 443,
    toPort: 443,
    cidrBlocks: ["10.0.0.0/16"],
    description: "HTTPS from VPC",
  }],
  egress: [],
  tags: { Name: `serfel-${$app.stage}-sg-endpoints`, ...stackTags("serfel-shared") },
});

const sgRds = new aws.ec2.SecurityGroup("rds", {
  name: `serfel-${$app.stage}-rds`,
  vpcId: vpc.id,
  description: "RDS MariaDB: inbound from Lambda only",
  egress: [],
  tags: { Name: `serfel-${$app.stage}-sg-rds`, ...stackTags("serfel-shared") },
});

const sgLambda = new aws.ec2.SecurityGroup("lambda", {
  name: `serfel-${$app.stage}-lambda`,
  vpcId: vpc.id,
  description: "Lambda functions: egress to RDS and VPC Endpoints",
  egress: [
    {
      protocol: "tcp",
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ["10.0.0.0/16"],
      description: "HTTPS to VPC Endpoints",
    },
    {
      protocol: "tcp",
      fromPort: 3306,
      toPort: 3306,
      cidrBlocks: ["10.0.3.0/24", "10.0.4.0/24"],
      description: "MariaDB to private subnets",
    },
  ],
  tags: { Name: `serfel-${$app.stage}-sg-lambda`, ...stackTags("serfel-shared") },
});

new aws.ec2.SecurityGroupRule("rds-from-lambda", {
  type: "ingress",
  securityGroupId: sgRds.id,
  protocol: "tcp",
  fromPort: 3306,
  toPort: 3306,
  sourceSecurityGroupId: sgLambda.id,
  description: "MariaDB from Lambda",
});

new aws.ec2.VpcEndpoint("s3-gw-endpoint", {
  vpcId: vpc.id,
  serviceName: "com.amazonaws.us-east-1.s3",
  routeTableIds: [privateRt.id, publicRt.id],
  tags: { Name: `serfel-${$app.stage}-s3-endpoint`, ...stackTags("serfel-shared") },
});

for (const service of ["secretsmanager", "logs", "ssm"] as const) {
  new aws.ec2.VpcEndpoint(`${service}-endpoint`, {
    vpcId: vpc.id,
    serviceName: `com.amazonaws.us-east-1.${service}`,
    vpcEndpointType: "Interface",
    subnetIds: [privateSubnet1a.id, privateSubnet1b.id],
    securityGroupIds: [sgEndpoints.id],
    privateDnsEnabled: true,
    tags: { Name: `serfel-${$app.stage}-${service}-endpoint`, ...stackTags("serfel-shared") },
  });
}

// cognito-idp: the usuarios Lambda calls Cognito ListUsers/AdminCreateUser from
// the private subnets, which have no NAT — without this endpoint the call hangs
// until the Lambda times out (HTTP 500). The service is NOT offered in us-east-1a,
// so the endpoint lives only in the us-east-1b private subnet; its private DNS is
// still reachable from Lambdas running in either AZ.
new aws.ec2.VpcEndpoint("cognito-idp-endpoint", {
  vpcId: vpc.id,
  serviceName: "com.amazonaws.us-east-1.cognito-idp",
  vpcEndpointType: "Interface",
  subnetIds: [privateSubnet1b.id],
  securityGroupIds: [sgEndpoints.id],
  privateDnsEnabled: true,
  tags: { Name: `serfel-${$app.stage}-cognito-idp-endpoint`, ...stackTags("serfel-shared") },
});

export const vpcId = vpc.id;
export const privateSubnetIds = [privateSubnet1a.id, privateSubnet1b.id];
export const publicSubnetIds = [publicSubnet1a.id, publicSubnet1b.id];
export const sgLambdaId = sgLambda.id;
export const sgRdsId = sgRds.id;
