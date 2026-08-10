import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { privateSubnetIds, sgRdsId } from "./vpc";
import { stackTags } from "./tags";

const DB_IDENTIFIER = `serfel-${$app.stage}-db`;

const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: false, // avoid chars that break connection strings and CLI quoting
});

const dbSubnets = new aws.rds.SubnetGroup("db-subnets", {
  name: `serfel-${$app.stage}-db-subnets`,
  subnetIds: privateSubnetIds,
  tags: { Name: `serfel-${$app.stage}-db-subnets`, ...stackTags("serfel-shared") },
});

const dbParams = new aws.rds.ParameterGroup("db-params", {
  name: `serfel-${$app.stage}-mariadb114`,
  family: "mariadb11.4",
  // OFF (was ON): the rehosted PHP apps use the legacy mysql_* API, which can't
  // do TLS. This *allows* non-TLS connections over the private VPC; the Node
  // Lambdas still connect with TLS explicitly (rds-global-bundle.pem). See
  // Fase 3.5 design §4/§6 (PHP-path TLS relaxation, decided).
  parameters: [{ name: "require_secure_transport", value: "OFF" }],
  tags: { Name: `serfel-${$app.stage}-mariadb114`, ...stackTags("serfel-shared") },
});

// ignoreChanges on engineVersion: autoMinorVersionUpgrade:true means RDS may
// patch the minor version; ignore drift here and bump the pin deliberately.
const db = new aws.rds.Instance("db", {
  identifier: DB_IDENTIFIER,
  engine: "mariadb",
  engineVersion: "11.4.12",
  instanceClass: "db.t4g.micro",
  allocatedStorage: 20,
  maxAllocatedStorage: 50,
  storageType: "gp3",
  storageEncrypted: true,
  dbName: "serfel",
  username: "serfeladmin",
  password: dbPassword.result,
  dbSubnetGroupName: dbSubnets.name,
  vpcSecurityGroupIds: [sgRdsId],
  parameterGroupName: dbParams.name,
  caCertIdentifier: "rds-ca-rsa2048-g1",
  publiclyAccessible: false,
  multiAz: false,
  backupRetentionPeriod: 7,
  autoMinorVersionUpgrade: true,
  deletionProtection: false, // dev only; must be true when prod stage exists
  skipFinalSnapshot: true,
  applyImmediately: true,
  tags: { Name: DB_IDENTIFIER, ...stackTags("serfel-shared") },
}, { ignoreChanges: ["engineVersion"] });

const dbSecret = new aws.secretsmanager.Secret("db-secret", {
  name: `serfel-${$app.stage}-db-credentials`,
  description: "Serfel dev RDS MariaDB master credentials",
  tags: stackTags("serfel-shared"),
});

new aws.secretsmanager.SecretVersion("db-secret-version", {
  secretId: dbSecret.id,
  secretString: pulumi.jsonStringify({
    host: db.address,
    port: 3306,
    username: db.username,
    password: dbPassword.result,
    dbname: db.dbName,
  }),
});

export const dbInstanceIdentifier = DB_IDENTIFIER;
export const dbEndpoint = db.address;
export const dbSecretArn = dbSecret.arn;
export const dbInstanceArn = db.arn;
