# Phase 1 — Infrastructure Base & IaC

**Date:** 2026-07-08
**Project:** Serfel — App web de ventas (POC)
**Scope:** Monorepo setup, SST v3 IaC, VPC with VPC Endpoints, GitHub Actions CI/CD
**Estimated setup time:** 3–5 days
**Depends on:** Phase 0 (AWS account, `serfel-dev` SSO profile active)

---

## Context

Phase 0 produced a clean AWS account with SSO access via the `serfel-dev` CLI profile. Phase 1 lays the foundation that all subsequent phases build on: a monorepo with pnpm workspaces, SST v3 as the IaC tool, a VPC with private subnets and VPC Endpoints (no NAT Gateway), and a GitHub Actions pipeline that deploys infrastructure automatically on every push to `main`.

The goal of Phase 1 is a working end-to-end deployment pipeline validated against real AWS infrastructure before any business logic is written.

**Region:** `us-east-1`
**SST stage:** `dev` only (prod deferred)
**Budget impact:** ~$7–10/month (3 interface VPC Endpoints; S3 gateway endpoint is free)

---

## Design

### 1. Monorepo Structure

A single GitHub repository using pnpm workspaces. Phase 1 only populates `infra/` — the other packages are scaffolded as empty placeholders so the workspace is valid and workspace aliases work from day one.

```
serfel/
├── apps/
│   └── frontend/          ← placeholder (Angular 18+, Phase 4)
│       └── package.json
├── packages/
│   ├── shared/            ← placeholder (DTOs + Zod schemas, Phase 3)
│   │   └── package.json
│   └── db/                ← placeholder (Drizzle schema + migrations, Phase 2)
│       └── package.json
├── lambdas/               ← placeholder (Lambda functions by domain, Phase 3)
│   └── package.json
├── infra/                 ← SST v3 stack definitions (populated in Phase 1)
│   ├── vpc.ts
│   └── oidc.ts
├── .github/
│   └── workflows/
│       └── deploy-dev.yml
├── sst.config.ts
├── tsconfig.json
├── package.json           ← pnpm workspace root (no dependencies of its own)
└── pnpm-workspace.yaml
```

**Workspace aliases** (configured in each package's `package.json` `name` field):
- `@serfel/shared`
- `@serfel/db`
- `@serfel/frontend`

Placeholder packages contain only a `package.json` with a `name` and `version` — no source files yet. This lets future packages declare `@serfel/shared` as a dependency via the workspace protocol without any changes to the monorepo structure.

**Root `pnpm-workspace.yaml`:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'lambdas'
  - 'infra'
```

### 2. SST v3 Configuration

SST v3 ("Ion") uses Pulumi under the hood. Infrastructure is defined in TypeScript. The entry point is `sst.config.ts` at the repo root.

**`sst.config.ts`:**
```typescript
export default $config({
  app(input) {
    return {
      name: "serfel",
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: { aws: { region: "us-east-1" } },
    };
  },
  async run() {
    await import("./infra/oidc");
    await import("./infra/vpc");
  },
});
```

Key decisions:
- **App name:** `serfel` — all AWS resources are prefixed `serfel-dev-*`
- **`removal: "remove"` on dev:** `sst remove --stage dev` tears down all resources cleanly for cost control
- **`removal: "retain"` on prod:** prevents accidental data loss when prod is eventually added
- **Import order:** `oidc` before `vpc` so the GitHub Actions role exists before CI/CD attempts to deploy

### 3. VPC Design

**CIDR:** `10.0.0.0/16`
**Availability Zones:** `us-east-1a`, `us-east-1b`

#### Subnets

| Name | AZ | CIDR | Purpose |
|------|----|------|---------|
| `public-1a` | us-east-1a | 10.0.1.0/24 | Future ALB |
| `public-1b` | us-east-1b | 10.0.2.0/24 | Future ALB |
| `private-1a` | us-east-1a | 10.0.3.0/24 | Lambdas + RDS |
| `private-1b` | us-east-1b | 10.0.4.0/24 | Lambdas + RDS |

No NAT Gateway. Private subnets reach AWS services exclusively via VPC Endpoints.

#### VPC Endpoints

| Endpoint | Type | Cost | Used by |
|----------|------|------|---------|
| S3 | Gateway (free) | $0 | SST deployments, future frontend assets |
| Secrets Manager (`secretsmanager`) | Interface | ~$7/month | Lambda reads DB credentials at runtime |
| CloudWatch Logs (`logs`) | Interface | ~$7/month | Lambda log output |
| SSM Parameter Store (`ssm`) | Interface | ~$7/month | Config values |

Interface endpoints are deployed into the private subnets of both AZs. A single security group (`sg-endpoints`) allows inbound HTTPS (443) from within the VPC.

#### Security Groups

Two security groups defined now for use in later phases:

**`sg-lambda`**
- Inbound: none
- Outbound: TCP 3306 to `sg-rds` (MariaDB)
- Outbound: TCP 443 to `sg-endpoints` (VPC Endpoints)

**`sg-rds`**
- Inbound: TCP 3306 from `sg-lambda` only
- Outbound: none

**`sg-endpoints`**
- Inbound: TCP 443 from VPC CIDR (`10.0.0.0/16`)
- Outbound: none

#### Exports from `infra/vpc.ts`

The VPC module exports identifiers consumed by later stacks:
- `vpcId`
- `privateSubnetIds` (array, both AZs)
- `publicSubnetIds` (array, both AZs)
- `sgLambdaId`
- `sgRdsId`

### 4. GitHub Actions CI/CD

#### OIDC Federation (`infra/oidc.ts`)

GitHub Actions assumes an IAM role via short-lived OIDC tokens — no AWS access keys stored in GitHub secrets.

Resources created:
- **OIDC Provider:** `token.actions.githubusercontent.com` registered as an IAM identity provider
- **IAM Role:** `serfel-github-actions-role`
  - Trust policy: allows `sts:AssumeRoleWithWebIdentity` from the OIDC provider, scoped to `repo:fracktured/serfel:*`
  - Permissions: `AdministratorAccess` (tightened to least-privilege in Phase 5)

#### Workflow (`.github/workflows/deploy-dev.yml`)

Trigger: push to `main`

```yaml
name: Deploy dev
on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/serfel-github-actions-role
          aws-region: us-east-1
          ACCOUNT_ID: 146476548567
      - run: npx sst deploy --stage dev
```

`<ACCOUNT_ID>` is the AWS account ID recorded at the end of Phase 0.

#### First Deploy (Manual)

The OIDC role must exist before GitHub Actions can assume it — a one-time chicken-and-egg bootstrap:

```bash
aws sso login --profile serfel-dev
npx sst deploy --stage dev
```

This creates the OIDC provider, the IAM role, and the VPC in a single pass. All subsequent deploys run automatically via GitHub Actions on push to `main`.

---

## Success Criteria

- [ ] GitHub repository `serfel` created, monorepo structure in place, pnpm install succeeds
- [ ] `npx sst deploy --stage dev` completes without errors from local machine
- [ ] VPC visible in AWS console (`us-east-1`): 4 subnets, 3 interface endpoints + 1 gateway endpoint, 3 security groups
- [ ] `serfel-github-actions-role` IAM role visible in AWS console
- [ ] Push to `main` triggers GitHub Actions workflow and `sst deploy --stage dev` completes successfully in CI
- [ ] `sst remove --stage dev` teardown works cleanly (verify, then redeploy)

---

## Out of Scope

- RDS provisioning (Phase 2)
- Lambda functions and API Gateway (Phase 3)
- Angular frontend (Phase 4)
- WAF, X-Ray tracing, CloudWatch dashboards (Phase 5)
- `prod` stage (deferred until go-live)
- IAM least-privilege tightening for the GitHub Actions role (Phase 5)
