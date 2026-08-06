# Coproad Rehost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehost the second business "Coproad" onto the existing Serfel rehost stack — a `coproad` DB schema, two extra PHP dirs in the shared Fargate task, the same node source deployed a second time against `coproad`, and a Coproad Angular SPA — all discriminated by a `/coproad/*` path prefix on the shared RehostRouter CloudFront, deployed to `dev`.

**Architecture:** Multi-tenant by DB schema on one RDS instance. Reuse every shared resource (ALB, PHP Fargate task, RehostNodeApi, RDS, Router). Add only: the `coproad` schema, `Coproad/`+`CoproadWeb/` dirs in the same PHP image, two new node Functions (same source, `DB_SCHEMA_OVERRIDE=coproad`), one new StaticSite, and `/coproad/*` routing behaviors. Domain/prod deferred to a combined Fase 6.

**Tech Stack:** SST v3 (Pulumi), CloudFront `sst.aws.Router`, ECS Fargate (`php:5.6-apache`), AWS Lambda (Node 22, ARM64, serverless-express + Sequelize), Angular 14 (Node 16 build), MariaDB (RDS), Vitest.

**Design spec:** `docs/superpowers/specs/2026-08-05-coproad-rehost-design.md`

## Global Constraints

- **SST tooling runs on Node 22**; the legacy Angular 14 build runs on **Node 16** (separate toolchain, out of the pnpm workspace).
- **Deploys are a human step:** `AWS_PROFILE=admin-christian` + Node 22 + `./scripts/sst-deploy.sh --stage dev` (never `sst deploy` directly). Region is **us-east-1**.
- **PHP image is built/pushed manually** (not in CI — PHP 5.6 compiles ~10 min); rebuild per `legacy-php/README.md` when `legacy-php/` changes.
- **Coproad data import is a human step** over the SSM tunnel; the dump is real business data and lives in the gitignored `packages/db/dump/coproad/`.
- **Resource names** are `serfel-dev-rehost-*` (stage-parameterized); Coproad-only resources use a `-coproad` segment. **No em dashes** in AWS resource names/descriptions — hyphens only.
- **No `any`** in TypeScript (CLAUDE.md); use explicit types.
- The `coproad` schema DDL is **structurally identical** to `serfel` (confirmed) — same tables/columns.
- WAF `webAclArn` must be attached to any new CloudFront distribution (matches `RehostLegacyFrontend`).
- Coproad-only new resources are tagged `stackTags("coproad-rehost")`; shared resources keep `serfel-rehost`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `packages/db/dump/coproad/` | Coproad data dump (gitignored) | Human places dump |
| `packages/shared/src/tenant.ts` | `stripCoproadPrefix` pure helper | Create |
| `packages/shared/src/tenant.spec.ts` | Unit tests for the helper | Create |
| `packages/shared/src/index.ts` | Re-export `tenant` | Modify |
| `lambdas/node-app-1/index.ts` | Adapter: schema override + prefix strip | Modify |
| `lambdas/node-app-2/index.ts` | Adapter: schema override + prefix strip | Modify |
| `lambdas/node-app-1/package.json` | Add `@serfel/shared` dep | Modify |
| `lambdas/node-app-2/package.json` | Add `@serfel/shared` dep | Modify |
| `infra/tags.ts` | Add `coproad-rehost` StackTag | Modify |
| `infra/rehost/node-api.ts` | Two Coproad Functions + routes | Modify |
| `legacy-php/Coproad/`, `legacy-php/CoproadWeb/` | Coproad PHP app dirs (schema `coproad`) | Create (vendor/copy) |
| `legacy-php/Dockerfile.fargate` | COPY the two Coproad dirs | Modify |
| `infra/rehost/fargate.ts` | Inject `DB_NAME_COPROAD` env | Modify |
| `apps/legacy-frontend` (coproad build config) | Coproad SPA build (esCoproad, base-href) | Modify |
| `infra/rehost/coproad-frontend.ts` | `RehostCoproadFrontend` StaticSite | Create |
| `infra/rehost/cdn.ts` | `/coproad/*` routing + ALB behaviors (ordered) | Modify |
| `scripts/rehost-smoke.sh` | Coproad smoke checks | Modify |
| `plan-trabajo-app-ventas-aws.md` | Record the Coproad rehost | Modify |

---

## Task 1: Create the `coproad` schema and import data (operational)

Human-run over the SSM tunnel; no application code. Verifiable by SQL.

**Files:**
- Place dump: `packages/db/dump/coproad/coproad-dump.sql` (gitignored via `packages/db/.gitignore`)

**Interfaces:**
- Produces: a `coproad` schema on `serfel-dev-db` with the same table shape as `serfel`, populated. Later tasks (node Functions, PHP dirs) connect to it.

- [ ] **Step 1: Confirm the dump is present and gitignored**

Run:
```bash
ls -la packages/db/dump/coproad/coproad-dump.sql
git check-ignore packages/db/dump/coproad/coproad-dump.sql
```
Expected: the file exists and `git check-ignore` prints its path (proves it will not be committed).

- [ ] **Step 2: Start the dev DB and open the tunnel**

Run:
```bash
AWS_PROFILE=admin-christian pnpm db:start
AWS_PROFILE=admin-christian pnpm bastion:start
AWS_PROFILE=admin-christian pnpm db:tunnel   # leaves a localhost:3306 tunnel open
```
Expected: tunnel established to `serfel-dev-db` via the bastion.

- [ ] **Step 3: Create the `coproad` schema**

In a second shell, using the DB admin credentials (from the `serfel-dev-db-credentials` secret — resolve at runtime, do not paste):
```bash
mysql -h 127.0.0.1 -P 3306 -u serfeladmin -p -e "CREATE DATABASE IF NOT EXISTS coproad CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
```
Expected: schema created (adjust charset/collation to match `serfel` if it differs — check with `SHOW CREATE DATABASE serfel;`).

- [ ] **Step 4: Import the dump into `coproad`**

Run:
```bash
mysql -h 127.0.0.1 -P 3306 -u serfeladmin -p coproad < packages/db/dump/coproad/coproad-dump.sql
```
Expected: import completes without errors. (If the dump contains its own `CREATE DATABASE`/`USE` for a differently-named DB, load it into `coproad` explicitly or edit the header line.)

- [ ] **Step 5: Verify structure matches `serfel` and data loaded**

Run:
```bash
mysql -h 127.0.0.1 -P 3306 -u serfeladmin -p -e "
  SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='serfel')  AS serfel_tables,
         (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='coproad') AS coproad_tables;
  SELECT COUNT(*) AS coproad_users FROM coproad.10_m_usuario;"
```
Expected: `coproad_tables` equals `serfel_tables` (identical DDL), and `coproad_users` > 0 (auth will work). Close the tunnel/bastion when done (`pnpm bastion:stop`), and stop the DB if not needed (`pnpm db:stop`).

- [ ] **Step 6: No commit** (nothing tracked changed — the dump is gitignored). Record completion in the task tracker.

---

## Task 2: `stripCoproadPrefix` shared helper (TDD)

The one piece of real branching logic. Pure function, tested in `@serfel/shared` (existing Vitest), reused by both node adapters.

**Files:**
- Create: `packages/shared/src/tenant.ts`
- Create: `packages/shared/src/tenant.spec.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `export function stripCoproadPrefix(path: string): string` — removes a leading `/coproad` path segment (returns `/` when the whole path is `/coproad` or `/coproad/`), leaving non-matching paths untouched.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/tenant.spec.ts`:
```ts
import { describe, it, expect } from "vitest";
import { stripCoproadPrefix } from "./tenant";

describe("stripCoproadPrefix", () => {
  it("strips the prefix from a nested path", () => {
    expect(stripCoproadPrefix("/coproad/sales/")).toBe("/sales/");
    expect(stripCoproadPrefix("/coproad/orders/123")).toBe("/orders/123");
  });
  it("maps the bare prefix to root", () => {
    expect(stripCoproadPrefix("/coproad")).toBe("/");
    expect(stripCoproadPrefix("/coproad/")).toBe("/");
  });
  it("leaves non-coproad paths unchanged", () => {
    expect(stripCoproadPrefix("/sales/")).toBe("/sales/");
    expect(stripCoproadPrefix("/")).toBe("/");
  });
  it("does not strip a partial segment match", () => {
    expect(stripCoproadPrefix("/coproadX/y")).toBe("/coproadX/y");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @serfel/shared exec vitest run src/tenant.spec.ts`
Expected: FAIL — cannot resolve `./tenant`.

- [ ] **Step 3: Write the minimal implementation**

Create `packages/shared/src/tenant.ts`:
```ts
/**
 * Remove a leading `/coproad` path segment so a tenant-suffixed request
 * (`/coproad/sales/...`) matches the Express apps mounted at `/sales/`,
 * `/orders/`. Non-matching paths pass through untouched.
 */
export function stripCoproadPrefix(path: string): string {
  if (path === "/coproad" || path === "/coproad/") return "/";
  if (path.startsWith("/coproad/")) return path.slice("/coproad".length);
  return path;
}
```

- [ ] **Step 4: Export it**

Add to `packages/shared/src/index.ts`:
```ts
export * from "./tenant";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @serfel/shared exec vitest run src/tenant.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/tenant.ts packages/shared/src/tenant.spec.ts packages/shared/src/index.ts
git commit -m "feat(shared): add stripCoproadPrefix tenant path helper"
```

---

## Task 3: Node adapters — schema override + prefix strip

Adapter-only edits to the thin `index.ts` glue in both node apps. No `src/` (business logic) changes. Verified by typecheck here; end-to-end by the Task 8 smoke.

**Files:**
- Modify: `lambdas/node-app-1/index.ts`
- Modify: `lambdas/node-app-2/index.ts`
- Modify: `lambdas/node-app-1/package.json`
- Modify: `lambdas/node-app-2/package.json`

**Interfaces:**
- Consumes: `stripCoproadPrefix` from `@serfel/shared` (Task 2).
- Produces: handlers that (a) use `DB_SCHEMA_OVERRIDE` when set, else the secret's `dbname`; (b) strip a leading `/coproad` from the request path before dispatch. Consumed by the Functions in Task 4.

- [ ] **Step 1: Add the workspace dependency to both apps**

In `lambdas/node-app-1/package.json` and `lambdas/node-app-2/package.json`, add to `dependencies`:
```json
"@serfel/shared": "workspace:*"
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: `@serfel/shared` symlinked into both node apps.

- [ ] **Step 3: Edit `lambdas/node-app-1/index.ts`**

Change the schema line inside `bootstrap()`:
```ts
  // before: process.env.DB_NAME = c.dbname;    // = "serfel"
  process.env.DB_NAME = process.env.DB_SCHEMA_OVERRIDE ?? c.dbname; // serfel by default; "coproad" for the Coproad Function
```

Replace the `handler` with a version that strips the `/coproad` prefix. Use a minimal typed event shape (no `any`):
```ts
import { stripCoproadPrefix } from "@serfel/shared";

interface HttpV2Event {
  rawPath?: string;
  requestContext?: { http?: { path?: string } };
}

export const handler = async (event: HttpV2Event, context: unknown) => {
  cached ??= await bootstrap();
  if (typeof event.rawPath === "string") {
    event.rawPath = stripCoproadPrefix(event.rawPath);
  }
  if (typeof event.requestContext?.http?.path === "string") {
    event.requestContext.http.path = stripCoproadPrefix(event.requestContext.http.path);
  }
  return (cached as (e: unknown, c: unknown) => unknown)(event, context);
};
```

- [ ] **Step 4: Apply the identical edit to `lambdas/node-app-2/index.ts`**

Same two changes (schema override line + the prefix-stripping `handler` with the `HttpV2Event` interface and the `@serfel/shared` import).

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS — no `any`, `@serfel/shared` resolves, both handlers compile.

- [ ] **Step 6: Commit**

```bash
git add lambdas/node-app-1/index.ts lambdas/node-app-2/index.ts lambdas/node-app-1/package.json lambdas/node-app-2/package.json pnpm-lock.yaml
git commit -m "feat(rehost): node adapters honor DB_SCHEMA_OVERRIDE and strip /coproad prefix"
```

---

## Task 4: Node infra — two Coproad Functions + routes

Add the tag member and the two Coproad Functions (same handlers, `DB_SCHEMA_OVERRIDE=coproad`) with their `/coproad/...` routes on the existing RehostNodeApi.

**Files:**
- Modify: `infra/tags.ts`
- Modify: `infra/rehost/node-api.ts`

**Interfaces:**
- Consumes: `nodeApi` (existing `sst.aws.ApiGatewayV2`), `dbSecretArn`, `privateSubnetIds`, `sgLambdaId`, `stackTags` — all already imported in `node-api.ts`.
- Produces: API routes `{GET,POST,PUT,DELETE} /coproad/sales/{proxy+}` → `RehostSalesCoproadFn` and `/coproad/orders/{proxy+}` → `RehostOrdersCoproadFn`. Consumed by the Router in Task 7.

- [ ] **Step 1: Extend the StackTag union**

In `infra/tags.ts`, change:
```ts
export type StackTag = "serfel-aws" | "serfel-rehost" | "serfel-shared" | "coproad-rehost";
```

- [ ] **Step 2: Add the Coproad sales Function + routes**

In `infra/rehost/node-api.ts`, after the existing `salesFn` route loop, add:
```ts
// Coproad tenant: SAME source as salesFn, deployed again with the schema
// overridden to `coproad`. The adapter strips the /coproad prefix so the
// Express app (mounted at /sales/) matches unchanged.
const salesCoproadFn = new sst.aws.Function("RehostSalesCoproadFn", {
  handler: "lambdas/node-app-1/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "512 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn, DB_SCHEMA_OVERRIDE: "coproad" },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  nodejs: { install: ["sequelize", "mysql2"] },
  transform: {
    function: { name: "serfel-dev-rehost-sales-coproad", tags: stackTags("coproad-rehost") },
    logGroup: { tags: stackTags("coproad-rehost") },
  },
});

for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /coproad/sales/{proxy+}`, salesCoproadFn.arn);
}
```

- [ ] **Step 3: Add the Coproad orders Function + routes**

After the existing `ordersFn` route loop, add the analogous block pointing at `lambdas/node-app-2/index.handler`, named `RehostOrdersCoproadFn` / `serfel-dev-rehost-orders-coproad`, routing `/coproad/orders/{proxy+}`:
```ts
const ordersCoproadFn = new sst.aws.Function("RehostOrdersCoproadFn", {
  handler: "lambdas/node-app-2/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "512 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn, DB_SCHEMA_OVERRIDE: "coproad" },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  nodejs: { install: ["sequelize", "mysql2"] },
  transform: {
    function: { name: "serfel-dev-rehost-orders-coproad", tags: stackTags("coproad-rehost") },
    logGroup: { tags: stackTags("coproad-rehost") },
  },
});

for (const method of ["GET", "POST", "PUT", "DELETE"] as const) {
  nodeApi.route(`${method} /coproad/orders/{proxy+}`, ordersCoproadFn.arn);
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. (Full deploy verification happens in Task 9.)

- [ ] **Step 5: Commit**

```bash
git add infra/tags.ts infra/rehost/node-api.ts
git commit -m "feat(infra): add Coproad node Functions (same source, DB_SCHEMA_OVERRIDE=coproad)"
```

---

## Task 5: PHP — Coproad dirs in the shared image

Add `Coproad/` + `CoproadWeb/` (schema `coproad`) into the same `php:5.6-apache` image, plus the container env that gives them their schema. Then rebuild/push the image (human step).

**Files:**
- Create: `legacy-php/Coproad/`, `legacy-php/CoproadWeb/`
- Modify: `legacy-php/Dockerfile.fargate`
- Modify: `infra/rehost/fargate.ts`

**Interfaces:**
- Consumes: the shared container envs `DB_HOST`, `DB_USER`, `DB_PASS` (from the secret) and the new `DB_NAME_COPROAD`.
- Produces: `/Coproad/*` and `/CoproadWeb/*` served by the same task against schema `coproad`. Routed in Task 7.

- [ ] **Step 1: Vendor the Coproad PHP source**

Bring `Coproad/` and `CoproadWeb/` into `legacy-php/` (subtree `--squash` from the Coproad Bitbucket repo if separate — a human step needing Bitbucket creds — or copy the Serfel dirs if they are literal copies). Result: `legacy-php/Coproad/` (mirrors `Distribuidor/`) and `legacy-php/CoproadWeb/` (mirrors `SerfelWeb/`), with the Coproad labels and `esCoproad=true`.

- [ ] **Step 2: Point the Coproad DB config at schema `coproad` via env**

The shared container-wide `DB_NAME` env is `serfel` (from the secret) and cannot be reused. Edit the Coproad copies' connection config so the **schema name** comes from `DB_NAME_COPROAD`, keeping host/user/pass from the shared envs:
- `legacy-php/Coproad/Coneccion/coneccion.php` — `getNomBD()` returns `getenv('DB_NAME_COPROAD') ?: 'coproad'`; host/user/pass read the same `getenv('DB_HOST'|'DB_USER'|'DB_PASS')` the `Distribuidor` copy uses.
- `legacy-php/CoproadWeb/application/config/database.php` — `'database' => getenv('DB_NAME_COPROAD') ?: 'coproad'`; `hostname`/`username`/`password` from the same envs as `SerfelWeb`.

(These are DB-config edits mirroring the Serfel `Distribuidor`/`SerfelWeb` env-repoint already in place — apply the same reverse-proxy/`base_url` handling the Serfel copies carry, adjusted for the `/coproad` prefix.)

- [ ] **Step 3: Extend the Dockerfile to COPY both dirs**

In `legacy-php/Dockerfile.fargate`, after the existing `COPY SerfelWeb/ ...` line add:
```dockerfile
COPY Coproad/     /var/www/html/Coproad/
COPY CoproadWeb/  /var/www/html/CoproadWeb/
```

- [ ] **Step 4: Inject `DB_NAME_COPROAD` into the task container**

In `infra/rehost/fargate.ts`, add to the container `environment` array (alongside `CI_ENCRYPTION_KEY` — it is a plain value, NOT a secret):
```ts
environment: [
  { name: "CI_ENCRYPTION_KEY", value: ciKeyVal },
  { name: "DB_NAME_COPROAD", value: "coproad" },
],
```

- [ ] **Step 5: Rebuild and push the image (human step)**

Per `legacy-php/README.md`, rebuild the ARM64 image with the four app dirs and push to ECR, then bump the task image tag if the deploy pins a tag (the current task uses `:v1` — push a new tag, e.g. `:v2`, and update the `image` reference in `fargate.ts` if it is pinned). Verify locally first:
```bash
docker build -f legacy-php/Dockerfile.fargate -t serfel-rehost-php:coproad legacy-php
docker run --rm -p 8080:80 serfel-rehost-php:coproad &
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/Coproad/     # expect 200/302
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/CoproadWeb/   # expect 200/302
```
Expected: both Coproad paths serve from the local container (DB-backed pages will fail locally without a DB — that is fine; this only proves the dirs are in the doc root).

- [ ] **Step 6: Commit**

```bash
git add legacy-php/Coproad legacy-php/CoproadWeb legacy-php/Dockerfile.fargate infra/rehost/fargate.ts
git commit -m "feat(rehost): add Coproad + CoproadWeb PHP dirs (schema coproad) to the shared image"
```

---

## Task 6: Coproad SPA build + StaticSite

Build the Coproad Angular under a `/coproad/` base href and serve it from a new StaticSite whose bucket nests the build under `coproad/`.

**Files:**
- Modify: `apps/legacy-frontend` (add a `coproad` build configuration + environment)
- Create: `infra/rehost/coproad-frontend.ts`

**Interfaces:**
- Produces: `export const coproadSite` (an `sst.aws.StaticSite`) exposing `coproadSite.url`. Consumed by the Router in Task 7.

- [ ] **Step 1: Add a Coproad build configuration to the legacy Angular app**

In `apps/legacy-frontend` (Node 16, out of the workspace), add `src/environments/environment.coproad.ts` with `esCoproad: true`, the Coproad labels, and service base URLs pointed at the same-origin `/coproad/...` paths (`/coproad/sales`, `/coproad/orders`, `/coproad/Coproad`, `/coproad/CoproadWeb`). In `angular.json`, add a `coproad` build configuration with a `fileReplacements` entry swapping `environment.ts` → `environment.coproad.ts`. (If Coproad ships as a separate vendored Angular repo instead, build that repo here — the StaticSite wiring in Step 3 is unchanged.)

- [ ] **Step 2: Build nested under `coproad/`**

Build with the Coproad configuration, base href `/coproad/`, output nested so bucket paths line up with the `/coproad/*` route:
```bash
cd apps/legacy-frontend
npm ci   # Node 16
npx ng build --configuration=coproad --base-href=/coproad/ --output-path=dist/coproad-ang/coproad
```
Expected: `apps/legacy-frontend/dist/coproad-ang/coproad/index.html` exists with `<base href="/coproad/">`.

- [ ] **Step 3: Create the StaticSite**

Create `infra/rehost/coproad-frontend.ts`:
```ts
import { stackTags } from "../tags";
import { webAclArn } from "../waf";

// Coproad legacy Angular build, served under /coproad/* by the RehostRouter.
// Built with --base-href=/coproad/ and nested under a coproad/ dir so bucket
// paths (/coproad/index.html, /coproad/main.js) match the routed prefix.
export const coproadSite = new sst.aws.StaticSite("RehostCoproadFrontend", {
  path: "apps/legacy-frontend/dist/coproad-ang",
  // Deep-link/refresh under /coproad/* falls back to the nested index.
  errorPage: "coproad/index.html",
  transform: {
    assets: {
      transform: {
        bucket: (bArgs) => {
          bArgs.tags = { ...(bArgs.tags as Record<string, string> | undefined), ...stackTags("coproad-rehost") };
        },
      },
    },
    cdn: (cdnArgs) => {
      cdnArgs.webAclArn = webAclArn;
    },
  },
});

export const coproadFrontendUrl = coproadSite.url;
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/rehost/coproad-frontend.ts apps/legacy-frontend/angular.json apps/legacy-frontend/src/environments/environment.coproad.ts
git commit -m "feat(rehost): Coproad legacy Angular build + RehostCoproadFrontend StaticSite"
```

---

## Task 7: Router — `/coproad/*` routing with correct behavior order

Wire the Coproad origins into the shared RehostRouter. **Ordering is load-bearing:** the `/coproad/Coproad*` and `/coproad/CoproadWeb*` PHP behaviors must be evaluated BEFORE the `/coproad/*` SPA behavior, and the `/coproad/sales|orders/*` node routes must precede `/coproad/*` too.

**Files:**
- Modify: `infra/rehost/cdn.ts`

**Interfaces:**
- Consumes: `coproadSite.url` (Task 6), `nodeApiUrl` (existing), `albBehavior` helper (existing in `cdn.ts`).
- Produces: the deployed front-door routing for all `/coproad/*` traffic.

- [ ] **Step 1: Import the Coproad StaticSite**

At the top of `infra/rehost/cdn.ts`:
```ts
import { coproadSite } from "./coproad-frontend";
```

- [ ] **Step 2: Add the Coproad node + SPA routes, ordered before `/coproad/*`**

In the `sst.aws.Router` `routes` object, add the Coproad node routes and the SPA catch-all. Declaration order matters — SST emits ordered behaviors in this order, and CloudFront picks the first match, so the specific node routes MUST be listed before `/coproad/*`:
```ts
  routes: {
    "/coproad/sales/*": nodeApiUrl,
    "/coproad/orders/*": nodeApiUrl,
    "/coproad/*": coproadSite.url,
    "/api/node/*": nodeApiUrl,
    "/sales/*": nodeApiUrl,
    "/orders/*": nodeApiUrl,
    "/*": legacySite.url,
  },
```

- [ ] **Step 3: Prepend the Coproad PHP ALB behaviors**

The ALB behaviors are appended via `transform.cdn`. They must come BEFORE the router-generated `/coproad/*` behavior, so **prepend** the two Coproad PHP behaviors to the front of the ordered list (the Serfel `/Distribuidor*`/`/SerfelWeb*` stay appended — they do not overlap the default `/*`):
```ts
      args.orderedCacheBehaviors = [
        albBehavior("/coproad/Coproad*"),
        albBehavior("/coproad/CoproadWeb*"),
        ...behaviors,
        albBehavior("/Distribuidor*"),
        albBehavior("/SerfelWeb*"),
      ] as unknown as typeof args.orderedCacheBehaviors;
```
(Note: `/coproad/Coproad*` also matches `/coproad/CoproadWeb...`; both target the same ALB origin, so the second pattern is documentary and harmless.)

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add infra/rehost/cdn.ts
git commit -m "feat(infra): route /coproad/* to Coproad SPA, PHP, and node Functions (ordered behaviors)"
```

---

## Task 8: Extend the smoke test

Add Coproad checks to `scripts/rehost-smoke.sh`, mirroring the existing Serfel checks and asserting tenant isolation.

**Files:**
- Modify: `scripts/rehost-smoke.sh`

**Interfaces:**
- Consumes: `$BASE` (the RehostRouter domain), `code()`/`check()` helpers (existing in the script).

- [ ] **Step 1: Add Coproad node + PHP + SPA checks**

After the existing Serfel checks (before the final PASS/FAIL summary), add:
```bash
# --- Coproad tenant (schema `coproad`, /coproad/* prefix) ---
# Coproad SPA (its own StaticSite, base-href /coproad/)
check "coproad SPA serves"            200 "$(code "$BASE/coproad/")"

# Coproad node: same source, schema=coproad. Anon rejected; a bogus cred
# reaches the app+DB (coproad.10_m_usuario) and returns 401 (not 5xx).
check "coproad sales rejects anon"    401 "$(code "$BASE/coproad/sales/")"
check "coproad sales reaches app+DB"  401 "$(code -u "0-0:x" "$BASE/coproad/sales/")"
check "coproad orders rejects anon"   401 "$(code "$BASE/coproad/orders/")"
check "coproad orders reaches app+DB" 401 "$(code -u "0-0:x" "$BASE/coproad/orders/")"

# Coproad PHP via the same ALB/task, served from the Coproad/ + CoproadWeb/ dirs
check "coproad Coproad serves"        200 "$(code "$BASE/coproad/Coproad/")"
check "coproad CoproadWeb serves"     200 "$(code "$BASE/coproad/CoproadWeb/")"
```

- [ ] **Step 2: Verify script syntax**

Run: `bash -n scripts/rehost-smoke.sh`
Expected: no syntax errors. (It runs for real against `dev` in Task 9 after deploy.)

- [ ] **Step 3: Commit**

```bash
git add scripts/rehost-smoke.sh
git commit -m "test(rehost): smoke Coproad SPA, node (coproad schema), and PHP routes"
```

---

## Task 9: Deploy, verify end-to-end, document

Human-run deploy (the DB import from Task 1, the pushed image from Task 5, and the code from Tasks 2-8 must all be in place first).

**Files:**
- Modify: `plan-trabajo-app-ventas-aws.md`

- [ ] **Step 1: Deploy to dev**

Run:
```bash
AWS_PROFILE=admin-christian ./scripts/sst-deploy.sh --stage dev
```
Expected: the two Coproad Functions, the `RehostCoproadFrontend` StaticSite, the `DB_NAME_COPROAD` container env, and the new Router behaviors deploy without error. (Ensure the new PHP image tag from Task 5 is what the task definition references.)

- [ ] **Step 2: Run the full smoke, including the isolation matrix**

Run:
```bash
AWS_PROFILE=admin-christian BASIC_USER=serfel BASIC_PASS=<real> ./scripts/rehost-smoke.sh
```
Expected: ALL checks `ok`, including every Coproad line. This proves behavior ordering (each `/coproad/...` path hits the right origin) and that Coproad node/PHP reach the `coproad` schema.

- [ ] **Step 3: Manually verify tenant DB isolation**

With the dev DB started, confirm a write via a Coproad path lands in `coproad` and a Serfel path lands in `serfel` (e.g. log in through `/coproad/CoproadWeb/` and through `/SerfelWeb/`, then check the respective `10_m_usuario`/session tables per schema over the tunnel). Confirm Serfel's existing routes still resolve to `serfel` (no regression from the adapter/ordering changes).
Expected: no cross-tenant bleed; Serfel unchanged.

- [ ] **Step 4: Update the work plan**

In `plan-trabajo-app-ventas-aws.md`, add a note under the rehost/Fase 3.5 section recording the Coproad second-business rehost (multi-tenant by `coproad` schema, `/coproad/*` on the shared RehostRouter, deployed+verified in dev on 2026-08-05) and that its domain/prod promotion is folded into the combined Fase 6 cutover.

- [ ] **Step 5: Commit**

```bash
git add plan-trabajo-app-ventas-aws.md
git commit -m "docs(coproad): record Coproad rehost deploy + verification in dev"
```

---

## Self-Review Notes

- **Spec coverage:** §2 DB→Task 1; §3 PHP→Tasks 5,7; §4 node→Tasks 2,3,4; §5 frontend→Tasks 6,7; §6 routing→Task 7; §7 IaC/tags→Tasks 4,5,6,7; §8 testing→Tasks 8,9; §9 cost (no action); §10 scope (covered); §11 open questions surfaced in Tasks 5 (PHP provenance), 6 (base-href), 7 (behavior ordering).
- **Behavior ordering** (spec open question #5) is handled explicitly in Task 7 Steps 2-3 and verified in Task 9 Step 2.
- **Base-href under prefix** (spec open question #2) is handled by the nested build + `errorPage: "coproad/index.html"` in Task 6.
- **No source duplication of the node apps** — same handlers, second Function (Task 4), schema by env (Task 3).
