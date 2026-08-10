import * as aws from "@pulumi/aws";
import { publicSubnetIds, sgRdsId, vpcId } from "./vpc";
import { stackTags } from "./tags";

// Amazon Linux 2023 ARM — SSM agent preinstalled
const al2023 = aws.ec2.getAmiOutput({
  mostRecent: true,
  owners: ["amazon"],
  filters: [
    { name: "name", values: ["al2023-ami-2023*-kernel-*-arm64"] },
    { name: "state", values: ["available"] },
  ],
});

const bastionRole = new aws.iam.Role("bastion-role", {
  name: `serfel-${$app.stage}-bastion-role`,
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { Service: "ec2.amazonaws.com" },
      Action: "sts:AssumeRole",
    }],
  }),
  tags: stackTags("serfel-shared"),
});

new aws.iam.RolePolicyAttachment("bastion-ssm-core", {
  role: bastionRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

const bastionProfile = new aws.iam.InstanceProfile("bastion-profile", {
  name: `serfel-${$app.stage}-bastion-profile`,
  role: bastionRole.name,
  tags: stackTags("serfel-shared"),
});

// No inbound rules at all — access is exclusively through SSM Session Manager.
const sgBastion = new aws.ec2.SecurityGroup("bastion", {
  name: `serfel-${$app.stage}-bastion`,
  vpcId,
  description: "Bastion: no inbound, egress to SSM (443) and RDS (3306)",
  egress: [
    {
      protocol: "tcp",
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ["0.0.0.0/0"],
      description: "HTTPS to SSM service endpoints",
    },
    {
      protocol: "tcp",
      fromPort: 3306,
      toPort: 3306,
      securityGroups: [sgRdsId],
      description: "MariaDB to RDS",
    },
  ],
  tags: { Name: `serfel-${$app.stage}-sg-bastion`, ...stackTags("serfel-shared") },
});

new aws.ec2.SecurityGroupRule("rds-from-bastion", {
  type: "ingress",
  securityGroupId: sgRdsId,
  protocol: "tcp",
  fromPort: 3306,
  toPort: 3306,
  sourceSecurityGroupId: sgBastion.id,
  description: "MariaDB from bastion",
});

// AMI drift must not replace the bastion; recreate deliberately by removing ignoreChanges.
const bastion = new aws.ec2.Instance("bastion", {
  ami: al2023.id,
  instanceType: "t4g.nano",
  subnetId: publicSubnetIds[0],
  associatePublicIpAddress: true,
  vpcSecurityGroupIds: [sgBastion.id],
  iamInstanceProfile: bastionProfile.name,
  metadataOptions: { httpTokens: "required" }, // IMDSv2 only
  tags: { Name: `serfel-${$app.stage}-bastion`, ...stackTags("serfel-shared") },
}, { ignoreChanges: ["ami"] });

export const bastionInstanceId = bastion.id;
