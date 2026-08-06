# Coproad Rehost — Second business on the shared rehost stack — Design

**Date:** 2026-08-05
**Status:** Approved (brainstorming session)
**Depends on:** Fase 3.5 legacy rehost (deployed to `dev`): RehostRouter CloudFront, internal-but-CloudFront-locked ALB + single PHP Fargate task serving `Distribuidor/` + `SerfelWeb/`, RehostNodeApi with `salesFn`/`ordersFn` Lambdas, `RehostLegacyFrontend` StaticSite, `serfel-dev-db` RDS, `serfel-dev-rehost-*` secrets. This phase is **purely additive** — it does not modify Serfel's behavior.

---

## 1. Goal & shape

Rehost a **second, already-existing** business stack — **"Coproad"** — for the same client (Serfel), reusing the Fase 3.5 rehost machinery instead of standing up a parallel stack. Coproad is the *same system, different database, plus a few labels* (a welcome-page name and an `esCoproad=true` flag). It is not a fork we are creating: the Coproad code and data already exist in the client's world; we are rehosting them onto the same AWS resources Serfel already runs on.

**Tenant model:** two businesses, **one** set of AWS resources, separated by **DB schema** and discriminated at the front door by a **`/coproad/*` path prefix** on the existing shared **RehostRouter** CloudFront distribution.

**Environment:** everything lands in **`dev`** (account 146476548567) now. Both businesses promote to the client's prod account **together** in Fase 6 — Coproad does **not** get its own branded domain until then (deferred to Fase 6's Route 53 + ACM work; path-based routing needs no domains in `dev`).

Legacy Coproad apps and how they map:

| Coproad app | Serfel counterpart | Target in this phase |
|---|---|---|
| PHP `Coproad/` (5.6, raw `mysql_*`) | `Distribuidor/` | Extra dir in the **same** PHP Fargate image/doc root, schema `coproad` |
| PHP `CoproadWeb/` (5.6, CodeIgniter) | `SerfelWeb/` | Extra dir in the **same** PHP Fargate image/doc root, schema `coproad` |
| Node app "sales" | `node-app-1` | **Reuse** `salesFn`, switch to schema `coproad` per request |
| Node app "orders" | `node-app-2` | **Reuse** `ordersFn`, switch to schema `coproad` per request |
| Angular 14 SPA | `RehostLegacyFrontend` | **Second** StaticSite under `/coproad/*`, `esCoproad=true` build |

There is **no** third node app — `node-app-3` is an empty `_legacy` stub and is explicitly out of scope (earlier "3 node apps" was a misspeak).

---

## 2. Database — new schema, same instance

- A new **`coproad`** schema (database) inside the **existing** `serfel-dev-db` RDS MariaDB instance. **No new RDS instance.**
- The `coproad` DDL is **structurally identical** to `serfel` (confirmed): same tables and columns, so reused Node queries and models that reference concrete columns (`cod_serfel`, `10_m_usuario`, ...) hold across both schemas. Only the data and a few config rows differ.
- **Data import (operational, human step):**
  - Place the dump at **`packages/db/dump/coproad/`** — the same location the Serfel dumps live (`packages/db/dump/legacy-data.sql`, `legacy-schema.sql`). Already **gitignored** via `packages/db/.gitignore` (`dump/`), so real business data is never committed; no new ignore rule needed.
  - Import over the existing SSM tunnel: `pnpm db:tunnel` (via bastion), then load the dump into a fresh `coproad` schema with a mysql client (`CREATE DATABASE coproad; ... ; USE coproad; source packages/db/dump/coproad/<dump>.sql`). This mirrors how the Serfel legacy data was loaded; the dump is not run through the Drizzle migrate Lambda (that governs the new serverless schema, not the rehosted legacy data).
- **Credentials:** Coproad shares the **same** DB endpoint, user, and password as Serfel. Only the **schema name** differs. The PHP path continues to use the existing non-TLS DB user (legacy `mysql_*` limitation, unchanged from Fase 3.5); the Node Lambdas keep TLS to RDS.

---

## 3. PHP — same Fargate task, +2 app dirs

The Serfel PHP rehost is **one** `php:5.6-apache` Fargate task serving both apps from one Apache doc root. Coproad is added into that **same** task — no new Fargate service, ALB, or target group ("same ec2 as the original").

- **Image:** `COPY` **`Coproad/`** and **`CoproadWeb/`** into the same doc root as `Distribuidor/` and `SerfelWeb/`. These are copies of the Serfel dirs with the Coproad label changes and `esCoproad=true`. Four apps in one image, distinguished by path prefix.
  - The Coproad source is vendored into `legacy-php/` alongside the Serfel dirs (`legacy-php/Coproad/`, `legacy-php/CoproadWeb/`), same `--squash` subtree discipline as the original import if it comes from a separate Bitbucket repo; if it is literally a copy of the Serfel dirs it is created in-repo. The Dockerfile's `COPY` list is extended to include both new dirs.
- **DB target per dir:** `Coproad/` and `CoproadWeb/` point their connection config at schema **`coproad`**; `Distribuidor/` and `SerfelWeb/` keep **`serfel`**. Env vars are container-wide, so the schema name **cannot** be a single shared `DB_NAME` env — each app dir resolves its **own** schema (its `esCoproad` copy sets `coproad`). Host/user/password stay shared via the same injected `serfel-dev-db-credentials` secret; only the schema name differs per dir. No credentials baked into the image.
- **Routing:** RehostRouter adds two behaviors to the **existing ALB origin** (the same custom-origin + `X-Origin-Verify` secret header + no-slash-before-`*` pattern the Serfel PHP behaviors use):
  - `/coproad/Coproad*` → ALB
  - `/coproad/CoproadWeb*` → ALB
- **Reverse-proxy redirects:** the same Fase 3.5 caveat applies (Apache trailing-slash 301s, CodeIgniter `base_url()`/`redirect()` must be `X-Forwarded`-aware or env-driven), now under the `/coproad` prefix — the Coproad copies inherit whatever fix the Serfel dirs already carry, adjusted for the prefix.
- **Sessions:** file-based PHP sessions, fine at 1 task; unchanged.

---

## 4. Node — same source, a second Function per app (schema by env)

**No source changes to the ported apps, and no source duplication.** The node apps bind a **module-singleton** Sequelize at import (`src/config/bd.sequelize.ts`; models `.init()` once via `doInit(sequelize)`), and Sequelize forbids re-`init()`-ing a model class — so in-process request-level multi-tenancy would force an invasive rewrite of the frozen route/service/auth code. Instead, the **same source** is deployed **a second time** as a separate Function with the schema selected by env:

- **Two new Functions** reusing the exact same handlers:
  - `RehostSalesCoproadFn` → `lambdas/node-app-1/index.handler`, env `DB_SCHEMA_OVERRIDE=coproad`
  - `RehostOrdersCoproadFn` → `lambdas/node-app-2/index.handler`, env `DB_SCHEMA_OVERRIDE=coproad`
  - The existing `salesFn`/`ordersFn`/`healthFn` are unchanged and keep serving `serfel`. No Coproad health Function — Coproad DB connectivity is proven by an authenticated `/coproad/sales` smoke call, avoiding a needless edit to the Hono `rehost-health` handler.
- **Adapter-only edits** in the thin `index.ts` (the AWS-Lambda glue, not business logic — the rehost pattern already puts adapter concerns here). Two tenant-only tweaks, applied to `node-app-1/index.ts` and `node-app-2/index.ts`:
  1. **Schema override:** `process.env.DB_NAME = process.env.DB_SCHEMA_OVERRIDE ?? c.dbname;` (default stays `serfel` from the secret's `dbname`).
  2. **Prefix strip:** strip a leading `/coproad` from the incoming event path before handing off to `serverless-express`, so the Express app (mounted at `/sales/`, `/orders/`) matches unchanged. Harmless for Serfel (its paths never start with `/coproad`).
- **Tenant discrimination — path prefix.** RehostRouter routes the Coproad node paths to the **same** RehostNodeApi, which registers `/coproad/...` routes to the Coproad Functions:
  - `/coproad/sales/*` → `RehostSalesCoproadFn`
  - `/coproad/orders/*` → `RehostOrdersCoproadFn`
- **Auth:** the sales/orders apps do their **own** app-level Basic Auth against `10_m_usuario`. Because the Coproad Function runs with `DB_NAME=coproad`, that auth resolves against **`coproad.10_m_usuario`** automatically — no auth code change.
- **Cost:** a few more Lambda functions, invoked only when Coproad is hit — effectively $0 at this scale.

---

## 5. Frontend — second StaticSite under `/coproad/*`

- A **second** `sst.aws.StaticSite` — **`RehostCoproadFrontend`** — with its own S3 bucket, its own CloudFront distribution, and SPA fallback (`errorPage: "index.html"`), mirroring `RehostLegacyFrontend`.
- **Source:** a copy of the legacy Angular 14 app with `esCoproad=true`, the Coproad labels, and `environment.ts` service base URLs pointed at the **same-origin** `/coproad/...` paths (so it calls `/coproad/sales`, `/coproad/api/node`, `/coproad/Coproad`, etc.). Built with **Node 16** in CI, same as the Serfel legacy frontend, un-hoisted, out of the pnpm workspace.
- **Build detail — base href under a prefix.** Because the app is served under `/coproad/*`, its Angular build must set `--base-href=/coproad/` (and deploy so its assets resolve under that prefix) so deep links and the SPA fallback work through the Router. This is the one non-mechanical build step and is called out as a plan task to verify during implementation.
- **Routing:** RehostRouter adds `/coproad/*` → `RehostCoproadFrontend` URL, as the Coproad default/SPA origin (its own distribution handles the `index.html` fallback, exactly as `RehostLegacyFrontend` does for Serfel).

---

## 6. Routing summary — one shared RehostRouter

All behaviors live on the **existing** RehostRouter CloudFront. Coproad adds only the `/coproad/*` family; nothing about Serfel's routes changes. Behavior order matters — the more specific `/coproad/...` PHP and node patterns must precede the `/coproad/*` SPA catch-all.

| Path pattern | Origin | Tenant |
|---|---|---|
| `/*` (default) | Serfel legacy StaticSite | serfel |
| `/Distribuidor*`, `/SerfelWeb*` | ALB (shared PHP task) | serfel |
| `/sales/*`, `/orders/*`, `/api/node/*` | RehostNodeApi | serfel |
| `/coproad/Coproad*`, `/coproad/CoproadWeb*` | ALB (**same** PHP task) | coproad |
| `/coproad/sales/*`, `/coproad/orders/*` | RehostNodeApi → Coproad Functions (`DB_NAME=coproad`) | coproad |
| `/coproad/*` | Coproad StaticSite | coproad |

---

## 7. IaC, tagging & repo structure

Everything is additive inside the existing SST app under `infra/rehost/`:

- `infra/rehost/cdn.ts` — add the `/coproad/Coproad*`, `/coproad/CoproadWeb*` ALB behaviors, the `/coproad/sales/*`, `/coproad/orders/*`, `/coproad/api/node/*` node routes, and the `/coproad/*` Coproad StaticSite route.
- `infra/rehost/legacy-frontend.ts` (or a sibling `coproad-frontend.ts`) — add `RehostCoproadFrontend` StaticSite.
- `infra/rehost/node-api.ts` — add the two Coproad Functions (`RehostSalesCoproadFn`, `RehostOrdersCoproadFn`) with `DB_SCHEMA_OVERRIDE=coproad`, and register their `/coproad/sales/*` + `/coproad/orders/*` routes on the same RehostNodeApi.
- `lambdas/node-app-1/index.ts`, `lambdas/node-app-2/index.ts` — adapter-only edits: schema override + `/coproad` prefix strip (no `src/` app changes).
- `legacy-php/Coproad/`, `legacy-php/CoproadWeb/` + extended Dockerfile `COPY`.
- Coproad data dump dropped into `packages/db/dump/coproad/` (already gitignored via `packages/db/.gitignore`; no repo change needed).

**Reused as-is (no change):** RDS instance, ALB + target group, PHP Fargate service, RehostNodeApi, ECR repo, VPC/SG, `serfel-dev-db-credentials` secret, Basic Auth authorizer wiring.

**Tagging by application stack.** Coproad resources are tagged as a **distinct stack** — a new `"coproad-rehost"` member added to the `StackTag` union in `infra/tags.ts`, used as `stackTags("coproad-rehost")` vs the existing `stackTags("serfel-rehost")` — so cost and ownership split cleanly per business in Fase 5 cost reports. Resources genuinely **shared** between both businesses (the ALB, the PHP task, the RehostNodeApi, the RDS instance, the Serfel Lambdas) stay tagged to their existing Serfel-rehost stack — they are not duplicated, so their cost is not split. Only the **Coproad-only** new resources carry the `coproad-rehost` tag: the two Coproad node Functions and the `RehostCoproadFrontend` StaticSite + bucket. This is documented so the tag audit (`scripts/tag-audit.sh`) does not flag it.

Resource names remain parameterized by stage (`serfel-<stage>-*`); Coproad-only resources use a `serfel-<stage>-coproad-*` name segment.

---

## 8. Testing & cutover

Extend `scripts/rehost-smoke.sh` with Coproad checks (all against `dev`, path-prefixed):

- **PHP:** load a `/coproad/Coproad*` and a `/coproad/CoproadWeb*` page (session/login flow + a DB-backed read/write) and confirm it reads/writes the **`coproad`** schema, not `serfel`.
- **Node:** `/coproad/sales/*` and `/coproad/orders/*` with a valid Coproad Basic Auth header → 200 and data from `coproad`; missing/wrong → 401; a Serfel-only credential must **not** authenticate against Coproad (tenant isolation check).
- **Frontend:** `/coproad/` loads the Coproad SPA with the Coproad branding (`esCoproad=true`), deep-link/refresh works (SPA fallback), and its service calls hit the `/coproad/...` same-origin paths.
- **Isolation regression:** confirm Serfel's existing routes still resolve to the `serfel` schema unchanged (no cross-tenant bleed introduced by the two-Sequelize change).

**Cutover:** stand Coproad up in `dev`, verify end-to-end against the `coproad` schema, then it rides the **combined** Fase 6 prod cutover with Serfel (one prod-account migration, both schemas, both front doors, real domains via Route 53 + ACM).

---

## 9. Cost impact

Marginal on top of the Fase 3.5 baseline — the whole point of the shared-resource approach:

| Added component | Approx. monthly (us-east-1) |
|---|---|
| Coproad StaticSite (S3 + its CloudFront) | ~USD 1–5 |
| `coproad` schema in existing RDS | USD 0 (same instance) |
| PHP: 2 extra dirs in the same task | USD 0 (same task) |
| Node: reused Lambdas, +1 pooled conn/tenant | ~USD 0 |
| **Added total** | **~USD 1–5/mo** |

No new always-on compute. Coproad rides the existing ALB + Fargate + node API cost floor already paid for Serfel.

---

## 10. Scope

**In scope:** `coproad` schema + data import (dump/restore), 2 PHP dirs (`Coproad/`, `CoproadWeb/`) in the shared Fargate task, Coproad node Functions (same source deployed with `DB_SCHEMA_OVERRIDE=coproad` + adapter-only prefix strip), `RehostCoproadFrontend` StaticSite, the `/coproad/*` Router behaviors, per-business (application-stack) tagging, extended smoke tests.

**Out of scope:** Coproad's own branded domain and the prod-account migration (both **Fase 6**, combined with Serfel); any PHP/Node code rewrite or strangler redesign (Fase 4+); `node-app-3` (empty stub, not a real app); moving PHP sessions to a shared store (only if scaled >1 task later).

---

## 11. Open questions / carry-forwards

- **Coproad PHP source provenance:** confirm whether `Coproad/`/`CoproadWeb/` come from a separate Bitbucket repo (subtree `--squash` import) or are created as in-repo copies of the Serfel dirs. Affects the vendoring step only, not the architecture.
- **Base-href under `/coproad/`:** verify the Angular 14 build serves correctly under the `/coproad/` prefix (assets, router, SPA fallback) during implementation — the one non-mechanical build step.
- **Tenant diffs beyond labels:** the only known differences are `esCoproad=true`, the welcome-page name, and flag-gated labels. If any *behavioral* divergence surfaces during the copy, capture it — it would challenge the "same code" assumption behind reusing the node Lambdas.
- **Coproad Basic Auth users:** confirm the Coproad node credentials live in `coproad.10_m_usuario` (same table shape as Serfel), so the app-level Basic Auth works unchanged once the tenant Sequelize instance is selected.
- **Router behavior ordering:** ensure the specific `/coproad/Coproad*`, `/coproad/CoproadWeb*`, and `/coproad/sales|orders|api/node/*` patterns are ordered **before** the `/coproad/*` SPA catch-all in the RehostRouter, mirroring how `/Distribuidor*` etc. precede `/*` today.
