# Phase 2 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision a private RDS MariaDB instance whose schema is introspected as-is from the legacy PHP app's SQL dump, versioned through Drizzle migrations, reachable via a migration Lambda (CI/CLI) and an on-demand SSM bastion, and seeded with the real legacy data.

**Architecture:** RDS MariaDB 11.4 `db.t4g.micro` Single-AZ in the Phase 1 private subnets, credentials in Secrets Manager (no rotation yet). Schema flows Drizzle-first: local Docker introspection of the dump → committed `schema.ts` → migration `0000_initial` applied by a VPC Lambda → data-only import through an SSM port-forward tunnel via a `t4g.nano` bastion. Manual DB start/stop with an EventBridge guard against AWS's 7-day auto-restart.

**Tech Stack:** SST v3 (Pulumi), Drizzle ORM + drizzle-kit, mysql2, MariaDB 11.4, Docker Compose, vitest, GitHub Actions, AWS SSM Session Manager.

**Spec:** `docs/superpowers/specs/2026-07-12-phase2-data-layer-design.md`
**Repo root for all commands:** `/Users/christiancastro/Documents/Serfel/AWS/serfel`

## Global Constraints

- Node >= 22, pnpm >= 9 (root `package.json` engines)
- Region `us-east-1`, SST stage `dev` only
- All AWS resource names prefixed `serfel-dev-*`; tags come from `defaultTags` in `sst.config.ts` (do not repeat Project/Owner/Environment tags manually; `Name` tags are still set per resource)
- DB is never publicly accessible; there is no NAT Gateway — VPC resources reach AWS APIs only via the Phase 1 VPC endpoints
- Lambda: Node 22, ARM (`arm64`)
- TypeScript everywhere; no `any`
- The legacy dump contains real customer data: dump files are **never committed**
- Local AWS CLI/SST commands use the SSO profile: `AWS_PROFILE=admin-christian` (run `aws sso login --profile admin-christian` first)
- Secret name is fixed: `serfel-dev-db-credentials`; DB identifier is fixed: `serfel-dev-db`; migration Lambda name is fixed: `serfel-dev-migrate`

---

### Task 1: `packages/db` scaffolding

Turn the placeholder package into a real one: dependencies, local MariaDB via Docker, Drizzle configs, RDS CA bundle, gitignore for dumps.

**Files:**
- Modify: `packages/db/package.json`
- Create: `packages/db/docker-compose.yml`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/drizzle-introspect.config.ts`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/.gitignore`
- Create: `packages/db/rds-global-bundle.pem` (downloaded)
- Modify: `lambdas/package.json`
- Modify: root `package.json` (add `@pulumi/random`, used by Task 4)

**Interfaces:**
- Produces: workspace package `@serfel/db` with `drizzle-orm@^0.44`, `mysql2@^3.14`, `drizzle-kit@^0.31`, `vitest@^3` installed; local MariaDB on `127.0.0.1:3307` (root/`serfel`, database `serfel`); committed RDS CA bundle at `packages/db/rds-global-bundle.pem`

- [ ] **Step 1: Replace `packages/db/package.json`**

```json
{
  "name": "@serfel/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "introspect": "drizzle-kit pull --config drizzle-introspect.config.ts",
    "generate": "drizzle-kit generate",
    "test": "vitest run"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "mysql2": "^3.14.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Replace `lambdas/package.json`** (dependencies the Lambdas in Tasks 6–7 bundle)

```json
{
  "name": "@serfel/lambdas",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "@aws-sdk/client-rds": "^3.600.0",
    "@aws-sdk/client-secrets-manager": "^3.600.0",
    "@serfel/db": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "mysql2": "^3.14.0"
  }
}
```

- [ ] **Step 3: Add `@pulumi/random` to root `package.json` devDependencies**

In root `package.json`, add to `devDependencies`:

```json
"@pulumi/random": "^4.16.0"
```

- [ ] **Step 4: Create `packages/db/docker-compose.yml`**

Port 3307 on purpose — 3306 stays free for the SSM tunnel later.

```yaml
services:
  mariadb:
    image: mariadb:11.4
    ports:
      - "3307:3306"
    environment:
      MARIADB_ROOT_PASSWORD: serfel
      MARIADB_DATABASE: serfel
    volumes:
      - mariadb-data:/var/lib/mysql

volumes:
  mariadb-data:
```

- [ ] **Step 5: Create the two Drizzle configs**

`packages/db/drizzle.config.ts` (normal use: generate/migrate against the journal):

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DB_URL ?? "mysql://root:serfel@127.0.0.1:3307/serfel",
  },
});
```

`packages/db/drizzle-introspect.config.ts` (one-time pull into a throwaway dir, so `pull` artifacts never pollute the migration journal):

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  out: "./introspected",
  dbCredentials: {
    url: process.env.DB_URL ?? "mysql://root:serfel@127.0.0.1:3307/serfel",
  },
});
```

- [ ] **Step 6: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests", "drizzle.config.ts", "drizzle-introspect.config.ts"]
}
```

(If the root `tsconfig.json` has no `extends`-friendly shape, inline `compilerOptions: { "strict": true, "module": "ESNext", "moduleResolution": "Bundler", "target": "ES2022", "types": ["node"] }` instead.)

- [ ] **Step 7: Create `packages/db/.gitignore`**

```
dump/
*.sql
introspected/
!migrations/*.sql
```

- [ ] **Step 8: Download and commit the RDS CA bundle**

```bash
curl -sSf -o packages/db/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Expected: file exists, starts with `-----BEGIN CERTIFICATE-----`. This file is public AWS material — it IS committed.

- [ ] **Step 9: Install and verify workspace**

```bash
pnpm install
```

Expected: lockfile updated, no errors, `packages/db/node_modules/.bin/drizzle-kit` exists.

- [ ] **Step 10: Commit**

```bash
git add packages/db lambdas/package.json package.json pnpm-lock.yaml
git commit -m "feat(db): scaffold @serfel/db with drizzle, local mariadb, RDS CA bundle"
```

---

### Task 2: Introspect the legacy dump into `schema.ts` + migration `0000`

**Requires the legacy dump files from the user.** Ask for them if not present. Expected locations (both gitignored):
- `packages/db/dump/legacy-schema.sql` — structure only (`mysqldump --no-data --skip-triggers`)
- `packages/db/dump/legacy-data.sql` — data only (`mysqldump --no-create-info --skip-triggers`)

**Files:**
- Create: `packages/db/src/schema.ts` (generated by drizzle-kit, then reviewed)
- Create: `packages/db/src/relations.ts` (if pull generates one)
- Create: `packages/db/migrations/0000_*.sql` + `packages/db/migrations/meta/*` (generated)

**Interfaces:**
- Produces: `schema.ts` exporting one Drizzle table object per legacy table; migration journal with exactly one entry (`0000_initial` or drizzle's auto-name)

- [ ] **Step 1: Start local MariaDB and load the schema dump**

```bash
cd packages/db
docker compose up -d
sleep 15   # wait for mariadb to accept connections
docker compose exec -T mariadb mariadb -uroot -pserfel serfel < dump/legacy-schema.sql
```

Expected: exits 0. Verify tables landed:

```bash
docker compose exec -T mariadb mariadb -uroot -pserfel -e "SHOW TABLES IN serfel;"
```

Expected: the legacy tables listed (non-empty).

If the dump targets a different database name (contains `CREATE DATABASE`/`USE` statements), load it as-is with `mariadb -uroot -pserfel < dump/legacy-schema.sql` (no `serfel` arg) and adjust `DB_URL` in both drizzle configs to that database name for the introspection run only.

- [ ] **Step 2: Introspect**

```bash
pnpm --filter @serfel/db introspect
```

Expected: `packages/db/introspected/schema.ts` (and possibly `relations.ts`) created.

- [ ] **Step 3: Move schema into `src/` and discard pull artifacts**

```bash
mkdir -p packages/db/src
mv packages/db/introspected/schema.ts packages/db/src/schema.ts
[ -f packages/db/introspected/relations.ts ] && mv packages/db/introspected/relations.ts packages/db/src/relations.ts
rm -rf packages/db/introspected
```

- [ ] **Step 4: Review `schema.ts` — mandatory, not a formality**

Read the whole file. Fix anything drizzle-kit mapped poorly and note it in the commit message:
- zero-dates (`0000-00-00`) defaults → remove the default or make column nullable
- unsupported/odd types mapped to `unknown` or raw `sql` → give them an explicit drizzle type
- charset/collation noise → fine to leave
- Do NOT rename tables/columns — schema is adopted as-is by decision.

Then verify it compiles:

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Generate migration 0000**

```bash
pnpm --filter @serfel/db generate
```

Expected: `packages/db/migrations/0000_<name>.sql` containing `CREATE TABLE` statements for every legacy table, plus `migrations/meta/_journal.json` with one entry.

- [ ] **Step 6: Sanity-check the migration recreates the schema**

Wipe and rebuild the local DB from the migration alone:

```bash
cd packages/db
docker compose exec -T mariadb mariadb -uroot -pserfel -e "DROP DATABASE serfel; CREATE DATABASE serfel;"
sed 's/--> statement-breakpoint//' migrations/0000_*.sql | docker compose exec -T mariadb mariadb -uroot -pserfel serfel
docker compose exec -T mariadb mariadb -uroot -pserfel -e "SHOW TABLES IN serfel;"
```

Expected: same table list as Step 1. (The `sed` strips Drizzle's `--> statement-breakpoint` separator lines — they are not valid SQL comments, so the file can't be piped raw. Statements themselves end with `;`.)

- [ ] **Step 7: Load the data dump into the migration-built schema**

This is a local rehearsal of the exact import Task 11 runs against RDS — it proves the legacy data fits the schema that migration `0000` creates:

```bash
docker compose exec -T mariadb mariadb -uroot -pserfel serfel < dump/legacy-data.sql
docker compose exec -T mariadb mariadb -uroot -pserfel -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='serfel';"
```

Expected: data loads with exit 0. If it fails (e.g., foreign-key ordering), retry with FK checks deferred — and note that Task 11 will need the same flag:

```bash
(echo "SET FOREIGN_KEY_CHECKS=0;"; cat dump/legacy-data.sql; echo "SET FOREIGN_KEY_CHECKS=1;") | docker compose exec -T mariadb mariadb -uroot -pserfel serfel
```

- [ ] **Step 8: Commit** (dump files are gitignored — verify with `git status` that nothing under `dump/` is staged)

```bash
git add packages/db/src packages/db/migrations
git commit -m "feat(db): introspect legacy schema, generate initial migration"
```

---

### Task 3: `createDb()` client factory with test

**Files:**
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`
- Test: `packages/db/tests/client.test.ts`

**Interfaces:**
- Consumes: `packages/db/src/schema.ts` (Task 2), local MariaDB on 3307 (Task 1)
- Produces: `createDb(creds: DbCredentials, opts?: { ssl?: SslOptions | false }): { db, pool }` and type `DbCredentials { host: string; port: number; username: string; password: string; dbname: string }` — exact shape of the Secrets Manager secret from Task 4. Consumed by the migration Lambda (Task 6) and Phase 3 domain Lambdas.

- [ ] **Step 1: Write the failing test**

`packages/db/tests/client.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, type DbCredentials } from "../src/client";

// Requires the local docker mariadb: `docker compose up -d` in packages/db
const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const TEST_DB = "serfel_test";

const creds: DbCredentials = {
  host: ROOT.host,
  port: ROOT.port,
  username: ROOT.user,
  password: ROOT.password,
  dbname: TEST_DB,
};

beforeAll(async () => {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await conn.query(`CREATE DATABASE ${TEST_DB}`);
  await conn.end();
});

afterAll(async () => {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await conn.end();
});

describe("createDb", () => {
  it("connects and runs a query (ssl disabled for local docker)", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    const result = await db.execute(sql`SELECT 1 AS one`);
    expect((result as unknown as [{ one: number }[], unknown])[0][0].one).toBe(1);
    await pool.end();
  });

  it("applies the migration journal to a fresh database", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    await migrate(db, { migrationsFolder: "migrations" });
    const result = await db.execute(
      sql`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ${TEST_DB}`
    );
    const count = Number((result as unknown as [{ c: unknown }[], unknown])[0][0].c);
    expect(count).toBeGreaterThan(0);
    await pool.end();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db && docker compose up -d && cd ../..
pnpm --filter @serfel/db test
```

Expected: FAIL — `Cannot find module '../src/client'` (or equivalent).

- [ ] **Step 3: Implement `packages/db/src/client.ts`**

```typescript
import mysql, { type Pool, type SslOptions } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";

export interface DbCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  dbname: string;
}

export interface CreateDbOptions {
  /** TLS options passed to mysql2. `false` disables TLS (local docker only). */
  ssl?: SslOptions | false;
}

/**
 * Connection factory for Lambda use: instantiate at module level (outside the
 * handler) so warm invocations reuse the pool. connectionLimit is 1 by design
 * (see master plan §2.5 — no RDS Proxy, low per-function concurrency).
 */
export function createDb(
  creds: DbCredentials,
  opts: CreateDbOptions = {}
): { db: MySql2Database<typeof schema>; pool: Pool } {
  const pool = mysql.createPool({
    host: creds.host,
    port: creds.port,
    user: creds.username,
    password: creds.password,
    database: creds.dbname,
    connectionLimit: 1,
    ...(opts.ssl === false ? {} : { ssl: opts.ssl }),
  });
  const db = drizzle(pool, { schema, mode: "default" });
  return { db, pool };
}
```

And `packages/db/src/index.ts`:

```typescript
export * from "./schema";
export * from "./client";
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @serfel/db test
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/client.ts packages/db/src/index.ts packages/db/tests
git commit -m "feat(db): createDb factory with pooled mysql2 connection"
```

---

### Task 4: RDS instance + Secrets Manager secret (`infra/database.ts`)

**Files:**
- Create: `infra/database.ts`
- Modify: `sst.config.ts` (add import)

**Interfaces:**
- Consumes: `privateSubnetIds`, `sgRdsId` from `infra/vpc.ts`
- Produces: exports `dbInstanceIdentifier` (string `"serfel-dev-db"`), `dbEndpoint` (Output<string>), `dbSecretArn` (Output<string>), `dbInstanceArn` (Output<string>). Secret JSON shape matches `DbCredentials` from Task 3 exactly: `{ host, port, username, password, dbname }`.

- [ ] **Step 1: Create `infra/database.ts`**

```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { privateSubnetIds, sgRdsId } from "./vpc";

const DB_IDENTIFIER = "serfel-dev-db";

const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: false, // avoid chars that break connection strings and CLI quoting
});

const dbSubnets = new aws.rds.SubnetGroup("db-subnets", {
  name: "serfel-dev-db-subnets",
  subnetIds: privateSubnetIds,
  tags: { Name: "serfel-dev-db-subnets" },
});

const dbParams = new aws.rds.ParameterGroup("db-params", {
  name: "serfel-dev-mariadb114",
  family: "mariadb11.4",
  parameters: [{ name: "require_secure_transport", value: "ON" }],
  tags: { Name: "serfel-dev-mariadb114" },
});

const db = new aws.rds.Instance("db", {
  identifier: DB_IDENTIFIER,
  engine: "mariadb",
  engineVersion: "11.4",
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
  tags: { Name: DB_IDENTIFIER },
});

const dbSecret = new aws.secretsmanager.Secret("db-secret", {
  name: "serfel-dev-db-credentials",
  description: "Serfel dev RDS MariaDB master credentials",
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
```

- [ ] **Step 2: Register in `sst.config.ts`**

In `run()`, after the vpc import:

```typescript
async run() {
  await import("./infra/oidc");
  await import("./infra/vpc");
  await import("./infra/database");
},
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Deploy (takes ~10–15 min — RDS creation is slow)**

```bash
aws sso login --profile admin-christian
AWS_PROFILE=admin-christian npx sst deploy --stage dev
```

Expected: completes without error.

- [ ] **Step 5: Verify in AWS**

```bash
AWS_PROFILE=admin-christian aws rds describe-db-instances --db-instance-identifier serfel-dev-db --region us-east-1 \
  --query 'DBInstances[0].{status:DBInstanceStatus,public:PubliclyAccessible,encrypted:StorageEncrypted,multiAz:MultiAZ,backup:BackupRetentionPeriod,ca:CACertificateIdentifier}'
```

Expected: `status: available`, `public: false`, `encrypted: true`, `multiAz: false`, `backup: 7`, `ca: rds-ca-rsa2048-g1`.

```bash
AWS_PROFILE=admin-christian aws secretsmanager get-secret-value --secret-id serfel-dev-db-credentials --region us-east-1 \
  --query SecretString --output text | python3 -c "import json,sys; d=json.load(sys.stdin); print(sorted(d.keys()))"
```

Expected: `['dbname', 'host', 'password', 'port', 'username']`.

- [ ] **Step 6: Commit**

```bash
git add infra/database.ts sst.config.ts
git commit -m "feat(infra): RDS MariaDB 11.4 db.t4g.micro + credentials secret"
```

---

### Task 5: SSM bastion (`infra/bastion.ts`)

**Files:**
- Create: `infra/bastion.ts`
- Modify: `sst.config.ts` (add import)

**Interfaces:**
- Consumes: `vpcId`, `publicSubnetIds`, `sgRdsId` from `infra/vpc.ts`
- Produces: EC2 instance tagged `Name=serfel-dev-bastion`, reachable only via SSM; `sg-rds` gains ingress 3306 from the bastion SG. Exports `bastionInstanceId` (Output<string>).

- [ ] **Step 1: Create `infra/bastion.ts`**

```typescript
import * as aws from "@pulumi/aws";
import { publicSubnetIds, sgRdsId, vpcId } from "./vpc";

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
  name: "serfel-dev-bastion-role",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { Service: "ec2.amazonaws.com" },
      Action: "sts:AssumeRole",
    }],
  }),
});

new aws.iam.RolePolicyAttachment("bastion-ssm-core", {
  role: bastionRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

const bastionProfile = new aws.iam.InstanceProfile("bastion-profile", {
  name: "serfel-dev-bastion-profile",
  role: bastionRole.name,
});

// No inbound rules at all — access is exclusively through SSM Session Manager.
const sgBastion = new aws.ec2.SecurityGroup("bastion", {
  name: "serfel-dev-bastion",
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
  tags: { Name: "serfel-dev-sg-bastion" },
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

const bastion = new aws.ec2.Instance("bastion", {
  ami: al2023.id,
  instanceType: "t4g.nano",
  subnetId: publicSubnetIds[0],
  associatePublicIpAddress: true,
  vpcSecurityGroupIds: [sgBastion.id],
  iamInstanceProfile: bastionProfile.name,
  metadataOptions: { httpTokens: "required" }, // IMDSv2 only
  tags: { Name: "serfel-dev-bastion" },
});

export const bastionInstanceId = bastion.id;
```

- [ ] **Step 2: Register in `sst.config.ts`** (after `database`)

```typescript
await import("./infra/bastion");
```

- [ ] **Step 3: Typecheck and deploy**

```bash
pnpm typecheck
AWS_PROFILE=admin-christian npx sst deploy --stage dev
```

Expected: both succeed.

- [ ] **Step 4: Verify SSM sees the bastion**

Wait ~2 min after deploy for SSM registration, then:

```bash
AWS_PROFILE=admin-christian aws ssm describe-instance-information --region us-east-1 \
  --query 'InstanceInformationList[].{id:InstanceId,ping:PingStatus,platform:PlatformName}'
```

Expected: one instance with `ping: Online`.

- [ ] **Step 5: Stop the bastion (default state is stopped)**

```bash
BASTION_ID=$(AWS_PROFILE=admin-christian aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
AWS_PROFILE=admin-christian aws ec2 stop-instances --region us-east-1 --instance-ids "$BASTION_ID"
```

Expected: state transitions to `stopping`. Note: `sst deploy` will NOT restart it; Pulumi does not manage running state after creation.

- [ ] **Step 6: Commit**

```bash
git add infra/bastion.ts sst.config.ts
git commit -m "feat(infra): SSM bastion t4g.nano, no inbound ports"
```

---

### Task 6: Migration Lambda (`lambdas/migrate` + `infra/migrate.ts`)

**Files:**
- Create: `lambdas/migrate/index.ts`
- Create: `infra/migrate.ts`
- Modify: `sst.config.ts` (add import)

**Interfaces:**
- Consumes: `dbSecretArn` from `infra/database.ts`; `privateSubnetIds`, `sgLambdaId` from `infra/vpc.ts`; `createDb`/`DbCredentials` from `@serfel/db`; migration journal in `packages/db/migrations`
- Produces: Lambda with fixed name `serfel-dev-migrate` returning `{ ok: true, migrationsInJournalTable: number }`. Consumed by CLI script (Task 8) and CI (Task 9).

- [ ] **Step 1: Create `lambdas/migrate/index.ts`**

```typescript
import { readFileSync } from "node:fs";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { sql } from "drizzle-orm";
import { createDb, type DbCredentials } from "@serfel/db";

const sm = new SecretsManagerClient({});

export const handler = async (): Promise<{
  ok: boolean;
  migrationsInJournalTable: number;
}> => {
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  const creds = JSON.parse(secret.SecretString!) as DbCredentials;

  const { db, pool } = createDb(creds, {
    ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") },
  });

  try {
    await migrate(db, { migrationsFolder: "migrations" });
    const result = await db.execute(
      sql`SELECT COUNT(*) AS c FROM ${sql.identifier("__drizzle_migrations")}`
    );
    const count = Number(
      (result as unknown as [{ c: unknown }[], unknown])[0][0].c
    );
    return { ok: true, migrationsInJournalTable: count };
  } finally {
    await pool.end();
  }
};
```

- [ ] **Step 2: Create `infra/migrate.ts`**

```typescript
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
  },
});
```

(`sst` is a global in SST v3 infra files — no import needed. Note: the Lambda reaches Secrets Manager through the Phase 1 `secretsmanager` VPC endpoint; without it, this function would hang.)

- [ ] **Step 3: Register in `sst.config.ts`** (after `bastion`)

```typescript
await import("./infra/migrate");
```

- [ ] **Step 4: Typecheck and deploy**

```bash
pnpm typecheck
AWS_PROFILE=admin-christian npx sst deploy --stage dev
```

Expected: both succeed.

- [ ] **Step 5: Invoke — first run applies migration 0000**

DB must be running (`available`) — it is, from Task 4.

```bash
AWS_PROFILE=admin-christian aws lambda invoke --region us-east-1 \
  --function-name serfel-dev-migrate --cli-read-timeout 90 /dev/stdout
```

Expected: `{"ok":true,"migrationsInJournalTable":1}`.

- [ ] **Step 6: Invoke again — idempotency check**

Same command. Expected: same response, `migrationsInJournalTable` still `1`, no errors (drizzle skips applied migrations). Check CloudWatch logs if anything looks off:

```bash
AWS_PROFILE=admin-christian aws logs tail /aws/lambda/serfel-dev-migrate --region us-east-1 --since 10m
```

- [ ] **Step 7: Commit**

```bash
git add lambdas/migrate infra/migrate.ts sst.config.ts
git commit -m "feat(infra): migration lambda applying drizzle journal in VPC"
```

---

### Task 7: 7-day auto-restart guard (`lambdas/db-guard` + `infra/db-guard.ts`)

**Files:**
- Create: `lambdas/db-guard/index.ts`
- Create: `infra/db-guard.ts`
- Modify: `sst.config.ts` (add import)

**Interfaces:**
- Consumes: `dbInstanceIdentifier`, `dbInstanceArn` from `infra/database.ts`
- Produces: EventBridge rule matching RDS event `RDS-EVENT-0154` → Lambda that stops `serfel-dev-db`. Manual starts are NOT matched (different event ID).

- [ ] **Step 1: Create `lambdas/db-guard/index.ts`**

```typescript
import { RDSClient, StopDBInstanceCommand } from "@aws-sdk/client-rds";

const rds = new RDSClient({});

// Fired only for RDS-EVENT-0154: "DB instance is being started due to it
// exceeding the maximum allowed time being stopped." We stop it right back.
export const handler = async (): Promise<void> => {
  const id = process.env.DB_INSTANCE_ID!;
  try {
    await rds.send(new StopDBInstanceCommand({ DBInstanceIdentifier: id }));
    console.log(`Re-stopped ${id} after forced auto-restart`);
  } catch (err) {
    // Instance may still be 'starting'; EventBridge retries the invocation.
    console.error(`Failed to stop ${id}, will retry`, err);
    throw err;
  }
};
```

- [ ] **Step 2: Create `infra/db-guard.ts`**

```typescript
import * as aws from "@pulumi/aws";
import { dbInstanceArn, dbInstanceIdentifier } from "./database";

const guardFn = new sst.aws.Function("DbGuard", {
  handler: "lambdas/db-guard/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "30 seconds",
  // NOT in the VPC on purpose: it calls the public RDS API, and the VPC has
  // no NAT and no RDS API endpoint.
  environment: {
    DB_INSTANCE_ID: dbInstanceIdentifier,
  },
  permissions: [
    { actions: ["rds:StopDBInstance"], resources: [dbInstanceArn] },
  ],
  transform: {
    function: { name: "serfel-dev-db-guard" },
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
```

- [ ] **Step 3: Register in `sst.config.ts`** (after `migrate`)

```typescript
await import("./infra/db-guard");
```

- [ ] **Step 4: Typecheck and deploy**

```bash
pnpm typecheck
AWS_PROFILE=admin-christian npx sst deploy --stage dev
```

Expected: both succeed.

- [ ] **Step 5: Verify rule and dry-run the Lambda**

```bash
AWS_PROFILE=admin-christian aws events describe-rule --name serfel-dev-db-autostart-guard --region us-east-1 --query '{state:State,pattern:EventPattern}'
```

Expected: `state: ENABLED`, pattern contains `RDS-EVENT-0154`.

The real event can't be forced, but invoking the Lambda directly while the DB is `available` proves the stop path works end-to-end:

```bash
AWS_PROFILE=admin-christian aws lambda invoke --region us-east-1 --function-name serfel-dev-db-guard /dev/stdout
AWS_PROFILE=admin-christian aws rds describe-db-instances --db-instance-identifier serfel-dev-db --region us-east-1 --query 'DBInstances[0].DBInstanceStatus'
```

Expected: status `stopping`. Then start it again (Tasks 10–11 need it):

```bash
AWS_PROFILE=admin-christian aws rds start-db-instance --db-instance-identifier serfel-dev-db --region us-east-1
```

(Start only works once fully stopped — wait for `stopped` status first, ~2–5 min, then start, another ~5 min to `available`.)

- [ ] **Step 6: Commit**

```bash
git add lambdas/db-guard infra/db-guard.ts sst.config.ts
git commit -m "feat(infra): eventbridge guard re-stops db after forced 7-day restart"
```

---

### Task 8: Lifecycle helper scripts

**Files:**
- Create: `scripts/db-start.sh`, `scripts/db-stop.sh`, `scripts/bastion-start.sh`, `scripts/bastion-stop.sh`, `scripts/db-tunnel.sh`, `scripts/db-migrate.sh`
- Modify: root `package.json` (scripts)

**Interfaces:**
- Consumes: fixed identifiers `serfel-dev-db`, tag `Name=serfel-dev-bastion`, function `serfel-dev-migrate`
- Produces: `pnpm db:start|db:stop|bastion:start|bastion:stop|db:tunnel|db:migrate`. All scripts respect the caller's `AWS_PROFILE`. `db:tunnel` requires the [session-manager-plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) (`brew install --cask session-manager-plugin`).

- [ ] **Step 1: Create the scripts**

`scripts/db-start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
aws rds start-db-instance --db-instance-identifier serfel-dev-db --region us-east-1 >/dev/null
echo "Starting serfel-dev-db (takes ~5 min)…"
aws rds wait db-instance-available --db-instance-identifier serfel-dev-db --region us-east-1
echo "serfel-dev-db is available."
```

`scripts/db-stop.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
aws rds stop-db-instance --db-instance-identifier serfel-dev-db --region us-east-1 >/dev/null
echo "Stopping serfel-dev-db."
```

`scripts/bastion-start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=stopped,running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 start-instances --region us-east-1 --instance-ids "$ID" >/dev/null
echo "Starting bastion $ID…"
aws ec2 wait instance-running --region us-east-1 --instance-ids "$ID"
echo "Bastion running. SSM registration takes ~1 more minute."
```

`scripts/bastion-stop.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
aws ec2 stop-instances --region us-east-1 --instance-ids "$ID" >/dev/null
echo "Stopping bastion $ID."
```

`scripts/db-tunnel.sh` (foreground; Ctrl-C to close):

```bash
#!/usr/bin/env bash
set -euo pipefail
ID=$(aws ec2 describe-instances --region us-east-1 \
  --filters "Name=tag:Name,Values=serfel-dev-bastion" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
if [ "$ID" = "None" ]; then echo "Bastion not running — run 'pnpm bastion:start' first." >&2; exit 1; fi
HOST=$(aws rds describe-db-instances --db-instance-identifier serfel-dev-db --region us-east-1 \
  --query 'DBInstances[0].Endpoint.Address' --output text)
echo "Tunnel: localhost:3306 → $HOST:3306 (Ctrl-C to close)"
aws ssm start-session --region us-east-1 --target "$ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$HOST\"],\"portNumber\":[\"3306\"],\"localPortNumber\":[\"3306\"]}"
```

`scripts/db-migrate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "Invoking serfel-dev-migrate…"
aws lambda invoke --region us-east-1 --function-name serfel-dev-migrate \
  --cli-read-timeout 120 /dev/stdout
echo
```

- [ ] **Step 2: Make executable and wire into root `package.json`**

```bash
chmod +x scripts/*.sh
```

Add to root `package.json` `scripts`:

```json
"db:start": "./scripts/db-start.sh",
"db:stop": "./scripts/db-stop.sh",
"db:tunnel": "./scripts/db-tunnel.sh",
"db:migrate": "./scripts/db-migrate.sh",
"bastion:start": "./scripts/bastion-start.sh",
"bastion:stop": "./scripts/bastion-stop.sh"
```

- [ ] **Step 3: Smoke-test two scripts**

```bash
AWS_PROFILE=admin-christian pnpm db:migrate
```

Expected: `{"ok":true,"migrationsInJournalTable":1}` (DB is running from Task 7 Step 5).

```bash
AWS_PROFILE=admin-christian pnpm bastion:start
```

Expected: "Bastion running." (Leave it running — Task 11 uses it.)

- [ ] **Step 4: Commit**

```bash
git add scripts package.json
git commit -m "feat: db/bastion lifecycle helper scripts"
```

---

### Task 9: CI migration step

**Files:**
- Modify: `.github/workflows/deploy-dev.yml`

**Interfaces:**
- Consumes: function `serfel-dev-migrate`, DB identifier `serfel-dev-db`, existing OIDC credentials step
- Produces: deploy workflow that runs migrations when the DB is `available` and skips with a visible warning otherwise (a stopped DB must NOT fail the deploy — manual start/stop policy)

- [ ] **Step 1: Append the migration step after the `Deploy` step**

```yaml
      - name: Run DB migrations (skips if DB is stopped)
        run: |
          STATUS=$(aws rds describe-db-instances \
            --db-instance-identifier serfel-dev-db --region us-east-1 \
            --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "missing")
          if [ "$STATUS" = "available" ]; then
            aws lambda invoke --region us-east-1 --function-name serfel-dev-migrate \
              --cli-read-timeout 120 response.json
            cat response.json
            grep -q '"ok":true' response.json
          else
            echo "::warning::serfel-dev-db is '$STATUS' — migrations skipped. Run 'pnpm db:migrate' after starting the DB."
          fi
```

- [ ] **Step 2: Commit and push — this is also the CI verification**

```bash
git add .github/workflows/deploy-dev.yml
git commit -m "ci: run db migrations after deploy when db is available"
git push origin main
```

Watch the run:

```bash
gh run watch --repo fracktured/serfel
```

Expected: workflow green; migration step either prints `{"ok":true,...}` (DB running) or the skip warning (DB stopped). Both outcomes are a pass — note which one occurred.

---

### Task 10: Full-stack verification of DB privacy and lifecycle

No new files — this task proves the security criteria from the spec before data goes in.

**Interfaces:**
- Consumes: everything deployed in Tasks 4–8

- [ ] **Step 1: Verify no public endpoint**

```bash
HOST=$(AWS_PROFILE=admin-christian aws rds describe-db-instances --db-instance-identifier serfel-dev-db --region us-east-1 --query 'DBInstances[0].Endpoint.Address' --output text)
echo "$HOST"
nslookup "$HOST" | tail -2
nc -z -w 5 "$HOST" 3306 && echo "REACHABLE (BAD)" || echo "unreachable from internet (GOOD)"
```

Expected: DNS resolves to a **10.0.x.x** private IP; `nc` times out → "unreachable from internet (GOOD)".

- [ ] **Step 2: Verify stop/start cycle with helpers**

```bash
AWS_PROFILE=admin-christian pnpm db:stop
# wait until stopped:
AWS_PROFILE=admin-christian aws rds wait db-instance-stopped --db-instance-identifier serfel-dev-db --region us-east-1 2>/dev/null || \
  watch -n 30 "AWS_PROFILE=admin-christian aws rds describe-db-instances --db-instance-identifier serfel-dev-db --region us-east-1 --query 'DBInstances[0].DBInstanceStatus' --output text"
AWS_PROFILE=admin-christian pnpm db:start
```

Expected: clean `stopping → stopped → starting → available` cycle driven by the helper scripts. (If `db-instance-stopped` waiter is unavailable in the CLI version, poll manually.)

- [ ] **Step 3: Verify guard rule exists (criteria item)**

```bash
AWS_PROFILE=admin-christian aws events list-targets-by-rule --rule serfel-dev-db-autostart-guard --region us-east-1 --query 'Targets[0].Arn'
```

Expected: ARN of `serfel-dev-db-guard`.

No commit — verification only.

---

### Task 11: Data import + typed smoke query (runbook)

The one-time real-data import. **Requires:** `dump/legacy-data.sql` (user-provided, see Task 2), bastion running (Task 8), DB `available` (Task 10), session-manager-plugin installed, a local `mysql`/`mariadb` client (`brew install mariadb` provides one).

**Files:**
- Create: `packages/db/scripts/smoke-query.ts`
- Create: `packages/db/scripts/row-counts.sql` — optional helper, see Step 4

**Interfaces:**
- Consumes: `createDb` from `@serfel/db`, tunnel on `localhost:3306`, secret `serfel-dev-db-credentials`

- [ ] **Step 1: Open the tunnel (separate terminal, leave running)**

```bash
AWS_PROFILE=admin-christian pnpm db:tunnel
```

Expected: "Waiting for connections…" from session-manager-plugin.

- [ ] **Step 2: Fetch the DB password**

```bash
DB_PASS=$(AWS_PROFILE=admin-christian aws secretsmanager get-secret-value \
  --secret-id serfel-dev-db-credentials --region us-east-1 \
  --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)['password'])")
```

- [ ] **Step 3: Import the data-only dump through the tunnel**

TLS note: `require_secure_transport=ON` demands TLS, but through the tunnel the hostname is `127.0.0.1`, so certificate hostname verification must be skipped — the SSM tunnel itself is already encrypted and authenticated, this is fine for dev.

```bash
mariadb -h 127.0.0.1 -P 3306 -u serfeladmin -p"$DB_PASS" --ssl --ssl-verify-server-cert=0 serfel < packages/db/dump/legacy-data.sql
```

(If using the `mysql` client instead: `--ssl-mode=REQUIRED` replaces the two ssl flags. If Task 2 Step 7 needed `FOREIGN_KEY_CHECKS=0`, wrap the import the same way here.)

Expected: exits 0.

- [ ] **Step 4: Verify row counts against the local legacy copy**

Exact counts per table (information_schema `table_rows` is approximate for InnoDB — use COUNT(*)):

```bash
mariadb -h 127.0.0.1 -P 3306 -u serfeladmin -p"$DB_PASS" --ssl --ssl-verify-server-cert=0 -N -e \
  "SELECT CONCAT('SELECT ''', table_name, ''' AS t, COUNT(*) AS n FROM \`', table_name, '\` UNION ALL ') FROM information_schema.tables WHERE table_schema='serfel' AND table_name != '__drizzle_migrations';" \
  | tr -d '\n' | sed 's/ UNION ALL $/;/' > packages/db/scripts/row-counts.sql
mariadb -h 127.0.0.1 -P 3306 -u serfeladmin -p"$DB_PASS" --ssl --ssl-verify-server-cert=0 serfel < packages/db/scripts/row-counts.sql
```

Run the same generated `row-counts.sql` against the local docker copy (`-h 127.0.0.1 -P 3307 -u root -pserfel serfel`, no ssl flags) and diff the outputs. Expected: identical counts per table.

- [ ] **Step 5: Write the typed smoke query**

`packages/db/scripts/smoke-query.ts` — replace `<someTable>` with a real table exported from `schema.ts` (pick one known to have rows, e.g. the products/catalog table found in Task 2):

```typescript
import { createDb } from "../src/client";
import * as schema from "../src/schema";

const password = process.env.DB_PASS;
if (!password) throw new Error("Set DB_PASS (see Task 11 Step 2)");

const { db, pool } = createDb(
  { host: "127.0.0.1", port: 3306, username: "serfeladmin", password, dbname: "serfel" },
  { ssl: { rejectUnauthorized: false } } // tunnel: hostname won't match cert
);

const rows = await db.select().from(schema.<someTable>).limit(5);
console.log(`${rows.length} rows from <someTable>:`);
console.dir(rows, { depth: 1 });
await pool.end();
```

- [ ] **Step 6: Run it (tunnel still open)**

```bash
DB_PASS="$DB_PASS" pnpm --filter @serfel/db exec tsx scripts/smoke-query.ts
```

(If `tsx` is not available: `pnpm add -D tsx --filter @serfel/db` first.)

Expected: 5 real legacy rows printed with typed fields — proves the Drizzle types match the imported reality.

- [ ] **Step 7: Shut everything down and commit**

```bash
# Ctrl-C the tunnel terminal
AWS_PROFILE=admin-christian pnpm bastion:stop
AWS_PROFILE=admin-christian pnpm db:stop   # unless continuing to Phase 3 work now
git add packages/db/scripts/smoke-query.ts
git commit -m "feat(db): typed smoke query script; legacy data imported to dev"
```

---

## Success Criteria (from spec — final checklist)

- [ ] `sst deploy --stage dev` creates RDS, secret, bastion, migration Lambda, guard — Tasks 4–7
- [ ] No public DB endpoint; internet connection attempt fails — Task 10 Step 1
- [ ] Migration Lambda idempotent (second invoke = no-op) — Task 6 Step 6
- [ ] Data import completes, row counts match — Task 11 Step 4
- [ ] SQL client works through `pnpm db:tunnel` — Task 11 Steps 3–4
- [ ] Guard rule targets the stop Lambda — Task 10 Step 3
- [ ] Typed Drizzle query returns real rows — Task 11 Step 6
- [ ] CI deploy passes with DB stopped (skip+warning) and running (migrates) — Task 9
