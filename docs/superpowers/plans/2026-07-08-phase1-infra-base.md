# Phase 1 — Infrastructure Base & IaC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working GitHub → GitHub Actions → SST v3 → AWS deployment pipeline with a VPC, VPC Endpoints, and OIDC-based CI/CD.

**Architecture:** Monorepo with pnpm workspaces. SST v3 (Ion/Pulumi) manages all AWS resources. Two stack files — `infra/oidc.ts` (OIDC role for CI/CD) and `infra/vpc.ts` (network layer) — are deployed together via `sst deploy --stage dev`. GitHub Actions assumes the OIDC role on every push to `main` and re-deploys.

**Tech Stack:** Node.js 22, pnpm 9, TypeScript (strict), SST v3, `@pulumi/aws` ^6, AWS CLI v2, GitHub Actions.

## Global Constraints

- Region: `us-east-1` for all AWS resources
- SST app name: `serfel` — all resources prefixed `serfel-dev-*`
- SST stage: `dev` only
- pnpm workspace root package name: `serfel`
- AWS account ID: `146476548567`
- GitHub repo: `fracktured/serfel`
- VPC CIDR: `10.0.0.0/16`
- Public subnets: `10.0.1.0/24` (us-east-1a), `10.0.2.0/24` (us-east-1b)
- Private subnets: `10.0.3.0/24` (us-east-1a), `10.0.4.0/24` (us-east-1b)
- Default tags on every resource: `Project=serfel-ventas`, `Owner=christian`, `Environment=<stage>`
- No NAT Gateway — VPC Endpoints only
- Interface VPC Endpoints: `secretsmanager`, `logs`, `ssm`
- Gateway VPC Endpoint: `s3` (free)
- IAM role for GitHub Actions: `serfel-github-actions-role`
- Node.js minimum version: 22
- `removal: "remove"` on `dev` stage — `sst remove --stage dev` tears down cleanly

## File Map

| File | Created/Modified | Responsibility |
|------|-----------------|----------------|
| `package.json` | Create | Workspace root — no deps, just workspace config and scripts |
| `pnpm-workspace.yaml` | Create | Declares workspace packages |
| `tsconfig.json` | Create | Root TypeScript config (strict, noEmit) |
| `.gitignore` | Create | Ignores node_modules, .sst, .env |
| `sst.config.ts` | Create | SST entry point — app name, provider, stage, imports stacks |
| `infra/package.json` | Create | Infra package with `@pulumi/aws` and `sst` dev deps |
| `infra/oidc.ts` | Create | OIDC provider + `serfel-github-actions-role` IAM role |
| `infra/vpc.ts` | Create | VPC, subnets, route tables, security groups, VPC Endpoints |
| `apps/frontend/package.json` | Create | Placeholder — `@serfel/frontend` |
| `packages/shared/package.json` | Create | Placeholder — `@serfel/shared` |
| `packages/db/package.json` | Create | Placeholder — `@serfel/db` |
| `lambdas/package.json` | Create | Placeholder — `@serfel/lambdas` |
| `.github/workflows/deploy-dev.yml` | Create | CI/CD — push to main → sst deploy --stage dev |

---

### Task 1: Repository and Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `apps/frontend/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/db/package.json`
- Create: `lambdas/package.json`
- Create: `infra/package.json`

**Interfaces:**
- Produces: workspace with packages `@serfel/frontend`, `@serfel/shared`, `@serfel/db`, `@serfel/lambdas`, `@serfel/infra` — all recognized by pnpm; `pnpm install` succeeds with zero errors

- [ ] **Step 1: Create the GitHub repository**

  Go to github.com → New repository.
  - Name: `serfel`
  - Visibility: Private (or Public — your preference)
  - Do NOT initialize with README, .gitignore, or license (we do this locally)

  Clone it locally:
  ```bash
  git clone https://github.com/fracktured/serfel.git
  cd serfel
  ```

- [ ] **Step 2: Create the workspace root `package.json`**

  Create `package.json` at the repo root:
  ```json
  {
    "name": "serfel",
    "version": "0.0.1",
    "private": true,
    "engines": {
      "node": ">=22",
      "pnpm": ">=9"
    },
    "scripts": {
      "typecheck": "tsc --noEmit"
    }
  }
  ```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
    - 'lambdas'
    - 'infra'
  ```

- [ ] **Step 4: Create `tsconfig.json`**

  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "strict": true,
      "skipLibCheck": true,
      "noEmit": true
    },
    "exclude": ["node_modules", ".sst", "dist"]
  }
  ```

- [ ] **Step 5: Create `.gitignore`**

  ```
  node_modules/
  .sst/
  .env
  .env.local
  dist/
  *.js.map
  ```

- [ ] **Step 6: Create placeholder package files**

  Create each file with exactly this content (substitute the `name` field):

  `apps/frontend/package.json`:
  ```json
  { "name": "@serfel/frontend", "version": "0.0.1", "private": true }
  ```

  `packages/shared/package.json`:
  ```json
  { "name": "@serfel/shared", "version": "0.0.1", "private": true }
  ```

  `packages/db/package.json`:
  ```json
  { "name": "@serfel/db", "version": "0.0.1", "private": true }
  ```

  `lambdas/package.json`:
  ```json
  { "name": "@serfel/lambdas", "version": "0.0.1", "private": true }
  ```

- [ ] **Step 7: Create `infra/package.json`**

  ```json
  {
    "name": "@serfel/infra",
    "version": "0.0.1",
    "private": true,
    "devDependencies": {
      "@pulumi/aws": "^6.0.0",
      "sst": "latest"
    }
  }
  ```

- [ ] **Step 8: Install dependencies**

  From the repo root:
  ```bash
  pnpm install
  ```

  Expected output: pnpm resolves the workspace, installs `@pulumi/aws` and `sst` into `infra/node_modules` (hoisted to root `node_modules`). No errors. The command exits with code 0.

- [ ] **Step 9: Verify workspace packages are recognized**

  ```bash
  pnpm ls --filter '@serfel/*' --depth 0
  ```

  Expected: lists `@serfel/frontend`, `@serfel/shared`, `@serfel/db`, `@serfel/lambdas`, `@serfel/infra`. All five packages present.

- [ ] **Step 10: Commit**

  ```bash
  git add .
  git commit -m "feat: monorepo scaffold with pnpm workspaces"
  git push origin main
  ```

---

### Task 2: SST v3 Initialization and First Empty Deploy

**Files:**
- Create: `sst.config.ts`

**Interfaces:**
- Consumes: `pnpm install` completed (Task 1)
- Produces: SST bootstrapped in `us-east-1` account `146476548567`; `npx sst deploy --stage dev` with empty `run()` exits 0; `.sst/` directory in repo root (gitignored)

- [ ] **Step 1: Create `sst.config.ts`**

  ```typescript
  /// <reference path=".sst/platform/config.d.ts" />

  export default $config({
    app(input) {
      return {
        name: "serfel",
        removal: input?.stage === "prod" ? "retain" : "remove",
        home: "aws",
        providers: {
          aws: {
            region: "us-east-1",
            defaultTags: {
              tags: {
                Project: "serfel-ventas",
                Owner: "christian",
                Environment: input?.stage ?? "dev",
              },
            },
          },
        },
      };
    },
    async run() {
      // stacks imported in subsequent tasks
    },
  });
  ```

  Note: The `/// <reference path=".sst/platform/config.d.ts" />` line provides types for globals like `$config` and `$app`. This file is generated by SST on first run — TypeScript will show errors until then, which is expected.

- [ ] **Step 2: Log in to AWS via SSO**

  ```bash
  aws sso login --profile serfel-dev
  export AWS_PROFILE=serfel-dev
  ```

  Verify credentials:
  ```bash
  aws sts get-caller-identity
  ```

  Expected:
  ```json
  {
    "UserId": "...",
    "Account": "146476548567",
    "Arn": "arn:aws:sts::146476548567:assumed-role/..."
  }
  ```

- [ ] **Step 3: Run the first deploy (bootstraps SST)**

  ```bash
  npx sst deploy --stage dev
  ```

  On first run, SST bootstraps itself: it creates an S3 bucket for state storage (named something like `sst-state-<hash>`) and an SSM parameter. This takes 1–2 minutes.

  Expected: command completes with output like:
  ```
  ✓  Complete
  ```

  No resources are deployed yet (empty `run()`) — SST just bootstraps.

- [ ] **Step 4: Verify SST bootstrap resources exist**

  ```bash
  aws s3 ls | grep sst
  ```

  Expected: one S3 bucket with `sst` in the name (SST's state bucket).

  ```bash
  aws ssm get-parameter --name /sst/bootstrap --query Parameter.Value
  ```

  Expected: returns a JSON string with bootstrap metadata. Exit code 0.

- [ ] **Step 5: Commit**

  ```bash
  git add sst.config.ts
  git commit -m "feat: add SST v3 config with empty run()"
  git push origin main
  ```

---

### Task 3: VPC Stack

**Files:**
- Create: `infra/vpc.ts`
- Modify: `sst.config.ts` (add vpc import to `run()`)

**Interfaces:**
- Consumes: SST bootstrapped (Task 2); `$config` globals available
- Produces:
  - `export const vpcId: pulumi.Output<string>`
  - `export const privateSubnetIds: pulumi.Output<string>[]`
  - `export const publicSubnetIds: pulumi.Output<string>[]`
  - `export const sgLambdaId: pulumi.Output<string>`
  - `export const sgRdsId: pulumi.Output<string>`

- [ ] **Step 1: Create `infra/vpc.ts`**

  ```typescript
  import * as aws from "@pulumi/aws";

  // VPC
  const vpc = new aws.ec2.Vpc("vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: "serfel-dev-vpc" },
  });

  // Internet Gateway (for public subnets / future ALB)
  const igw = new aws.ec2.InternetGateway("igw", {
    vpcId: vpc.id,
    tags: { Name: "serfel-dev-igw" },
  });

  // Subnets
  const publicSubnet1a = new aws.ec2.Subnet("public-1a", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-east-1a",
    mapPublicIpOnLaunch: true,
    tags: { Name: "serfel-dev-public-1a" },
  });

  const publicSubnet1b = new aws.ec2.Subnet("public-1b", {
    vpcId: vpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: "us-east-1b",
    mapPublicIpOnLaunch: true,
    tags: { Name: "serfel-dev-public-1b" },
  });

  const privateSubnet1a = new aws.ec2.Subnet("private-1a", {
    vpcId: vpc.id,
    cidrBlock: "10.0.3.0/24",
    availabilityZone: "us-east-1a",
    tags: { Name: "serfel-dev-private-1a" },
  });

  const privateSubnet1b = new aws.ec2.Subnet("private-1b", {
    vpcId: vpc.id,
    cidrBlock: "10.0.4.0/24",
    availabilityZone: "us-east-1b",
    tags: { Name: "serfel-dev-private-1b" },
  });

  // Route tables
  const publicRt = new aws.ec2.RouteTable("public-rt", {
    vpcId: vpc.id,
    routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
    tags: { Name: "serfel-dev-public-rt" },
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
    tags: { Name: "serfel-dev-private-rt" },
  });

  new aws.ec2.RouteTableAssociation("private-rta-1a", {
    subnetId: privateSubnet1a.id,
    routeTableId: privateRt.id,
  });

  new aws.ec2.RouteTableAssociation("private-rta-1b", {
    subnetId: privateSubnet1b.id,
    routeTableId: privateRt.id,
  });

  // Security groups
  // sg-endpoints: accepts HTTPS from anywhere in the VPC
  const sgEndpoints = new aws.ec2.SecurityGroup("sg-endpoints", {
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
    tags: { Name: "serfel-dev-sg-endpoints" },
  });

  // sg-rds: no inline rules (set via SecurityGroupRule to avoid circular refs)
  const sgRds = new aws.ec2.SecurityGroup("sg-rds", {
    vpcId: vpc.id,
    description: "RDS MariaDB: inbound from Lambda only",
    egress: [],
    tags: { Name: "serfel-dev-sg-rds" },
  });

  // sg-lambda: egress via CIDR to avoid circular SG reference
  const sgLambda = new aws.ec2.SecurityGroup("sg-lambda", {
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
    tags: { Name: "serfel-dev-sg-lambda" },
  });

  // RDS ingress rule references sg-lambda (no circular dep: sgLambda defined above)
  new aws.ec2.SecurityGroupRule("rds-from-lambda", {
    type: "ingress",
    securityGroupId: sgRds.id,
    protocol: "tcp",
    fromPort: 3306,
    toPort: 3306,
    sourceSecurityGroupId: sgLambda.id,
    description: "MariaDB from Lambda",
  });

  // VPC Endpoints
  // S3 Gateway (free — attached to both route tables)
  new aws.ec2.VpcEndpoint("s3-gw-endpoint", {
    vpcId: vpc.id,
    serviceName: "com.amazonaws.us-east-1.s3",
    routeTableIds: [privateRt.id, publicRt.id],
    tags: { Name: "serfel-dev-s3-endpoint" },
  });

  // Interface endpoints for Secrets Manager, CloudWatch Logs, SSM
  for (const service of ["secretsmanager", "logs", "ssm"] as const) {
    new aws.ec2.VpcEndpoint(`${service}-endpoint`, {
      vpcId: vpc.id,
      serviceName: `com.amazonaws.us-east-1.${service}`,
      vpcEndpointType: "Interface",
      subnetIds: [privateSubnet1a.id, privateSubnet1b.id],
      securityGroupIds: [sgEndpoints.id],
      privateDnsEnabled: true,
      tags: { Name: `serfel-dev-${service}-endpoint` },
    });
  }

  // Exports consumed by Phase 2 (RDS) and Phase 3 (Lambda)
  export const vpcId = vpc.id;
  export const privateSubnetIds = [privateSubnet1a.id, privateSubnet1b.id];
  export const publicSubnetIds = [publicSubnet1a.id, publicSubnet1b.id];
  export const sgLambdaId = sgLambda.id;
  export const sgRdsId = sgRds.id;
  ```

- [ ] **Step 2: Add vpc import to `sst.config.ts`**

  Replace the `run()` body:
  ```typescript
  async run() {
    await import("./infra/vpc");
  },
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  pnpm typecheck
  ```

  Expected: exits 0. If TypeScript reports errors about missing `.sst/platform/config.d.ts`, that file is generated on first `sst deploy` — ignore those specific errors and proceed. All other errors must be fixed.

- [ ] **Step 4: Deploy the VPC**

  ```bash
  npx sst deploy --stage dev
  ```

  Expected: SST creates ~15 resources. Output ends with:
  ```
  ✓  Complete
  ```

  This takes 3–5 minutes (interface VPC Endpoints take time to provision).

- [ ] **Step 5: Verify VPC resources in AWS**

  ```bash
  aws ec2 describe-vpcs --filters "Name=tag:Name,Values=serfel-dev-vpc" \
    --query "Vpcs[0].{VpcId:VpcId,CIDR:CidrBlock,State:State}"
  ```

  Expected:
  ```json
  { "VpcId": "vpc-...", "CIDR": "10.0.0.0/16", "State": "available" }
  ```

  ```bash
  aws ec2 describe-subnets --filters "Name=vpc-id,Values=$(aws ec2 describe-vpcs --filters 'Name=tag:Name,Values=serfel-dev-vpc' --query 'Vpcs[0].VpcId' --output text)" \
    --query "Subnets[*].{Name:Tags[?Key=='Name']|[0].Value,CIDR:CidrBlock}" \
    --output table
  ```

  Expected: table with 4 rows — `serfel-dev-public-1a`, `serfel-dev-public-1b`, `serfel-dev-private-1a`, `serfel-dev-private-1b`.

  ```bash
  aws ec2 describe-vpc-endpoints --filters "Name=tag:Project,Values=serfel-ventas" \
    --query "VpcEndpoints[*].{Service:ServiceName,Type:VpcEndpointType,State:State}" \
    --output table
  ```

  Expected: 4 rows — s3 (Gateway), secretsmanager (Interface), logs (Interface), ssm (Interface). All `State: available`.

- [ ] **Step 6: Commit**

  ```bash
  git add infra/vpc.ts sst.config.ts
  git commit -m "feat: add VPC with private subnets and VPC Endpoints"
  git push origin main
  ```

---

### Task 4: OIDC Stack

**Files:**
- Create: `infra/oidc.ts`
- Modify: `sst.config.ts` (add oidc import before vpc in `run()`)

**Interfaces:**
- Consumes: SST bootstrapped (Task 2); AWS account `146476548567`; GitHub repo `fracktured/serfel`
- Produces: IAM role `serfel-github-actions-role` with `AdministratorAccess`; OIDC provider for `token.actions.githubusercontent.com`

- [ ] **Step 1: Create `infra/oidc.ts`**

  ```typescript
  import * as aws from "@pulumi/aws";
  import * as pulumi from "@pulumi/pulumi";

  // GitHub Actions OIDC provider
  // Thumbprint is for token.actions.githubusercontent.com (AWS validates via public keys since 2023,
  // but the field is still required by the provider)
  const githubOidcProvider = new aws.iam.OpenIdConnectProvider("github-oidc", {
    url: "https://token.actions.githubusercontent.com",
    clientIdLists: ["sts.amazonaws.com"],
    thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
  });

  const assumeRolePolicy = pulumi
    .all([githubOidcProvider.arn])
    .apply(([providerArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Federated: providerArn },
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              },
              StringLike: {
                "token.actions.githubusercontent.com:sub":
                  "repo:fracktured/serfel:*",
              },
            },
          },
        ],
      })
    );

  const githubActionsRole = new aws.iam.Role("github-actions-role", {
    name: "serfel-github-actions-role",
    assumeRolePolicy,
  });

  new aws.iam.RolePolicyAttachment("github-actions-admin", {
    role: githubActionsRole.name,
    policyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
  });

  export const githubActionsRoleArn = githubActionsRole.arn;
  ```

- [ ] **Step 2: Update `sst.config.ts` — import oidc before vpc**

  Replace the `run()` body (oidc must come first so the IAM role exists before any CI/CD attempts to deploy):
  ```typescript
  async run() {
    await import("./infra/oidc");
    await import("./infra/vpc");
  },
  ```

- [ ] **Step 3: Add `@pulumi/pulumi` to infra dependencies**

  Update `infra/package.json`:
  ```json
  {
    "name": "@serfel/infra",
    "version": "0.0.1",
    "private": true,
    "devDependencies": {
      "@pulumi/aws": "^6.0.0",
      "@pulumi/pulumi": "^3.0.0",
      "sst": "latest"
    }
  }
  ```

  Install:
  ```bash
  pnpm install
  ```

- [ ] **Step 4: Typecheck**

  ```bash
  pnpm typecheck
  ```

  Expected: exits 0 (ignoring `.sst/platform/config.d.ts` errors as noted in Task 3).

- [ ] **Step 5: Deploy**

  ```bash
  npx sst deploy --stage dev
  ```

  Expected: SST adds 3 new resources (OIDC provider, IAM role, policy attachment). Existing VPC resources are unchanged. Output ends with `✓  Complete`.

- [ ] **Step 6: Verify IAM role exists**

  ```bash
  aws iam get-role --role-name serfel-github-actions-role \
    --query "Role.{RoleName:RoleName,Arn:Arn}"
  ```

  Expected:
  ```json
  {
    "RoleName": "serfel-github-actions-role",
    "Arn": "arn:aws:iam::146476548567:role/serfel-github-actions-role"
  }
  ```

  ```bash
  aws iam list-attached-role-policies --role-name serfel-github-actions-role \
    --query "AttachedPolicies[*].PolicyName"
  ```

  Expected: `["AdministratorAccess"]`

- [ ] **Step 7: Commit**

  ```bash
  git add infra/oidc.ts infra/package.json sst.config.ts pnpm-workspace.yaml pnpm-lock.yaml
  git commit -m "feat: add OIDC provider and GitHub Actions IAM role"
  git push origin main
  ```

---

### Task 5: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy-dev.yml`

**Interfaces:**
- Consumes: `serfel-github-actions-role` exists in AWS (Task 4); repo is `fracktured/serfel` on GitHub
- Produces: push to `main` triggers workflow; workflow assumes OIDC role and runs `npx sst deploy --stage dev`; deploy succeeds in CI

- [ ] **Step 1: Create `.github/workflows/deploy-dev.yml`**

  ```yaml
  name: Deploy dev

  on:
    push:
      branches: [main]

  # Required for OIDC token issuance
  permissions:
    id-token: write
    contents: read

  jobs:
    deploy:
      name: SST deploy dev
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '22'

        - name: Setup pnpm
          uses: pnpm/action-setup@v4
          with:
            version: 9

        - name: Install dependencies
          run: pnpm install --frozen-lockfile

        - name: Configure AWS credentials via OIDC
          uses: aws-actions/configure-aws-credentials@v4
          with:
            role-to-assume: arn:aws:iam::146476548567:role/serfel-github-actions-role
            aws-region: us-east-1

        - name: Deploy
          run: npx sst deploy --stage dev
  ```

- [ ] **Step 2: Commit and push to trigger the workflow**

  ```bash
  git add .github/workflows/deploy-dev.yml
  git commit -m "feat: add GitHub Actions deploy-dev workflow"
  git push origin main
  ```

- [ ] **Step 3: Verify the workflow runs in GitHub**

  Go to `https://github.com/fracktured/serfel/actions`.

  Expected: the `Deploy dev` workflow appears with status `in progress` or `success` within ~30 seconds of the push. Wait for it to complete.

  The workflow runs `npx sst deploy --stage dev`. Since all resources already exist (from Tasks 3 & 4), SST performs an update with no changes and exits 0.

  Expected final status: green checkmark ✓.

- [ ] **Step 4: Verify OIDC authentication succeeded in the workflow logs**

  In the GitHub Actions run, open the `Configure AWS credentials via OIDC` step log.

  Expected: log contains:
  ```
  Assuming role with OIDC
  ...
  Assumed role: arn:aws:iam::146476548567:role/serfel-github-actions-role
  ```

  If it shows `Error: Credentials could not be loaded`, the OIDC provider or role trust policy is misconfigured — re-check Task 4 Step 6 and verify the role ARN in the workflow matches exactly.

---

### Task 6: Teardown and Redeploy Verification

**Files:** None (verification only)

**Why this task:** The spec requires `sst remove --stage dev` to work cleanly. Verifying this now prevents surprises during development when you need to tear down and rebuild.

- [ ] **Step 1: Run teardown**

  ```bash
  npx sst remove --stage dev
  ```

  Expected: SST deletes all resources (VPC, subnets, endpoints, security groups, OIDC provider, IAM role). Output ends with `✓  Complete`. This takes 3–5 minutes.

  Note: if SST reports errors deleting VPC Endpoints (they can take time to fully delete), wait 2 minutes and retry.

- [ ] **Step 2: Verify resources are gone**

  ```bash
  aws ec2 describe-vpcs --filters "Name=tag:Name,Values=serfel-dev-vpc" \
    --query "Vpcs"
  ```

  Expected: `[]` (empty array — VPC deleted).

  ```bash
  aws iam get-role --role-name serfel-github-actions-role 2>&1
  ```

  Expected: error `NoSuchEntity` — role deleted.

- [ ] **Step 3: Redeploy via GitHub Actions**

  Make a trivial change (e.g., add a blank line to `sst.config.ts`), commit, and push:
  ```bash
  git add sst.config.ts
  git commit -m "chore: trigger redeploy after teardown verification"
  git push origin main
  ```

  Go to GitHub Actions and wait for the `Deploy dev` workflow to complete.

  Expected: green checkmark ✓. VPC and OIDC resources recreated from scratch by CI.

- [ ] **Step 4: Confirm all success criteria from the spec**

  ```bash
  # 1. pnpm install succeeds
  pnpm install

  # 2. VPC visible
  aws ec2 describe-vpcs --filters "Name=tag:Name,Values=serfel-dev-vpc" \
    --query "Vpcs[0].State" --output text

  # 3. 4 subnets visible
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=serfel-dev-vpc" \
    --query "Vpcs[0].VpcId" --output text)
  aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "length(Subnets)"

  # 4. 4 VPC endpoints (3 interface + 1 gateway)
  aws ec2 describe-vpc-endpoints --filters "Name=tag:Project,Values=serfel-ventas" \
    --query "length(VpcEndpoints)"

  # 5. IAM role exists
  aws iam get-role --role-name serfel-github-actions-role \
    --query "Role.RoleName" --output text
  ```

  Expected outputs (in order): `available`, `4`, `4`, `serfel-github-actions-role`.
