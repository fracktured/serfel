# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Serfel is a sales web app being migrated from a legacy stack (PHP 5.6 + Node/Express + Angular 14) to a serverless AWS architecture: Angular frontend on S3/CloudFront, HTTP API on API Gateway, Lambdas (Node/TS, ARM64) behind a Cognito JWT authorizer, and RDS MariaDB in a private VPC subnet. The migration runs as vertical slices per domain (strangler-fig), plus a Fase 3.5 "rehost" that lifts the legacy apps into AWS as-is. Full plan and phase status live in `plan-trabajo-app-ventas-aws.md`; per-phase design docs and plans are in `docs/superpowers/specs/` and `docs/superpowers/plans/` (dated filenames).

## Monorepo layout

pnpm workspaces (`pnpm-workspace.yaml`), TypeScript everywhere, Node >=22 (`.nvmrc`).

- `apps/frontend/` — Angular 20 (standalone components + signals, own SCSS, no component library). Auth via `aws-amplify/auth`.
- `apps/legacy-frontend/` — vendored Angular 14, **excluded** from the workspace; built separately in CI with Node 16.
- `packages/shared/` — Zod schemas + DTO types, the single source of truth shared by Lambdas and the frontend (`@serfel/shared`).
- `packages/db/` — Drizzle ORM schema, migrations, and the `createDb` client (`@serfel/db`). Schema is the source of truth for DB types.
- `lambdas/` — one Lambda per domain (`products`, `rutas`, ...), each a Hono app. `node-app-1/2/3` are ported legacy Node services (own workspaces, excluded from root tsconfig).
- `infra/` — SST v3 (Ion/Pulumi) infrastructure modules. `infra/rehost/` holds the Fase 3.5 legacy stack.
- `scripts/` — operational shell scripts (DB lifecycle, tunneling, smoke tests).
- `legacy-php/` — PHP 5.6 source for the rehost Fargate images.

## Commands

Run from the repo root unless noted.

- `pnpm install --frozen-lockfile` — install.
- `pnpm typecheck` — root `tsc --noEmit`.
- `pnpm -r test` — all workspace tests (Vitest). **Lambda/DB tests need a local MariaDB:** `docker compose -f packages/db/docker-compose.yml up -d --wait` first.
- Single package test: `pnpm --filter @serfel/lambdas test` (or `@serfel/shared`, `@serfel/db`, `@serfel/frontend`). A single file: `pnpm --filter @serfel/lambdas exec vitest run lambdas/products/tests/service.test.ts`.
- Frontend dev: `pnpm --filter @serfel/frontend start` (runs `gen-env` then `ng serve`). Build: `pnpm --filter @serfel/frontend build`.
- `pnpm sst:deploy` — deploy SST stack (wrapper installs an npm shim; see below). Direct: `npx sst deploy --stage dev`.
- DB ops: `pnpm db:start` / `db:stop` (start/stop the RDS instance to save cost), `db:tunnel` (SSM tunnel via bastion), `db:migrate` (invoke the migrate Lambda), `bastion:start` / `bastion:stop`.
- `pnpm rehost:smoke` — smoke-test the rehosted legacy apps. `scripts/api-smoke.sh` — on-demand integration test against `dev`.
- DB schema change: edit `packages/db/src/schema.ts`, then `pnpm --filter @serfel/db generate` (drizzle-kit) to produce a versioned migration in `packages/db/migrations/`. Never hand-assign primary keys — the schema uses AUTO_INCREMENT and code reads `ResultSetHeader.insertId`.

## CI/CD

`.github/workflows/deploy-dev.yml` runs on push to `main`: builds the legacy Angular 14 app with Node 16 first, then Node 22 + pnpm for typecheck → start MariaDB → `pnpm -r test` → OIDC into AWS (account 146476548567) → `sst deploy --stage dev` → run migrations (skipped if the DB instance is stopped). The workflow installs an **npm shim** that strips deprecated `--platform`/`--arch` flags SST's `nodejs.install` still passes. Legacy PHP Fargate images are **not** built in CI (PHP 5.6 compiles ~10 min); rebuild them manually per `legacy-php/README.md` when `legacy-php/` changes.

## Key patterns

- **Lambda structure:** `index.ts` is the thin handler (opens the DB pool, extracts JWT claims), `app.ts` is a Hono router mounted at `/api`, `service.ts` holds business logic, `authz.ts` gates by module. DB pool is created **outside the handler** and cached across warm invocations (`connectionLimit: 1`, ARM64, TLS to RDS via the bundled `rds-global-bundle.pem`). Auth identity comes from `custom:id_usuario` on the Cognito **ID token** (not the access token).
- **Validation:** Zod schemas in `packages/shared` validate Lambda input and are reused in Angular forms — one schema, two uses. Never duplicate DTOs between frontend and backend.
- **Frontend config:** `apps/frontend/scripts/gen-env.mjs` generates `environment.gen.ts` from `APP_*` env vars at build time (SST StaticSite injects them; localhost defaults otherwise). Do not commit real values. Routes are guarded by `moduleGuard('<module>')`.
- **SST composition:** `sst.config.ts` imports `infra/*` modules in dependency order (vpc → database → auth → api → frontend, then `rehost/*`). Region is `us-east-1`. Resource names are parameterized by stage (`serfel-<stage>-*`).

# AWS Guidance

- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
