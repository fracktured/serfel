# Fase 3 PoC — Mantenedor de Productos (vertical slice) — Design

**Date:** 2026-07-16
**Status:** Approved (brainstorming session)
**Depends on:** Phases 0–2 (complete). Deployed: VPC, CI/CD (`deploy-dev.yml`), RDS MariaDB `serfel-dev-db` with legacy schema/data, Drizzle schema in `packages/db`.

## 1. Goal & shape

Prove the full production pattern end-to-end with **one module**: the products maintainer (mantenedor de productos). This is a **vertical slice** — Angular UI → CloudFront/S3 → API Gateway HTTP API → Cognito JWT auth → products Lambda → Drizzle → RDS MariaDB — deployed to the `dev` stage via SST. Every future module (pedidos, ventas, bodega, usuarios, reportes) repeats this pattern.

**UI reference:** `prototipes/prototype-3-bold-vibrant-table.html` is the **single approved look & feel** (note: not the non-table `prototype-3-bold-vibrant.html` variant). Design tokens: gradient `#7c3aed → #2563eb`, Plus Jakarta Sans, card/radius/shadow system as in the file.

## 2. Scope

**In scope** (all in the `serfel/` monorepo, deployed to `dev`):

- **Cognito** user pool + app client (SST-managed). Self-registration disabled; admin-created users.
- **API Gateway HTTP API** with Cognito JWT authorizer on all routes, proxying `/api/*` to the products Lambda.
- **`lambdas/products`** — one Lambda for the whole products domain (Approach: *one Lambda per domain*). ARM64, Node 22, VPC private subnets, internal router (Hono), mysql2 pool declared at module level (`connectionLimit: 1`), TLS to RDS.
- **`packages/shared`** — Zod schemas + DTO types for products and lookups, consumed by Lambda and Angular.
- **`apps/frontend`** — real Angular app (standalone + signals). Routes: `/login`, `/productos`. Deployed as SST StaticSite (S3 + CloudFront, SPA fallback 403/404 → `index.html`).
- Fix Phase 2 carry-forward: wire `relations.ts` into the Drizzle client (products list joins lookups).

**Out of scope:** other domains, CRUD for lookups (marcas/tipos/UM are read-only dropdowns), SQS/EventBridge, WAF, X-Ray, prod stage. The only schema migration is the `id_producto` AUTO_INCREMENT conversion (§3); soft delete reuses the existing `id_estado`.

**Operational:** dev DB stays stopped when idle (existing convention). The API returns a clean 503 with a friendly message when the DB is unreachable instead of hanging.

## 3. API design

All endpoints under `/api`, all JWT-protected:

| Method & path | Purpose |
|---|---|
| `GET /products?estado=activos\|inactivos\|todos` | List products with marca/tipo/UM names joined (default `activos`) |
| `POST /products` | Create product |
| `PUT /products/{idProducto}` | Update product |
| `DELETE /products/{idProducto}` | **Soft delete** — set `id_estado` to inactive |
| `POST /products/{idProducto}/restore` | Reactivate an inactive product |
| `GET /lookups` | `{ marcas, tiposProducto, unidadesMedida }` for dropdowns |

**Field mapping** (`20_m_producto`):

- UI **Nº / Código** → `cod_serfel` (user-entered; the business-facing code).
- UI **Nombre** → `nom_producto`; **Marca** → `id_marca`; **UM** → `id_UM`; **Tipo** → `id_tipo_producto`.
- The prototype's two-level *Familia Padre / Familia* collapses into a single **Tipo** column backed by `20_p_tipo_producto` (no familia tables exist in the legacy schema; no new tables for the PoC).
- Server-side defaults on create: `id_producto` = **AUTO_INCREMENT** (DB-assigned PK, never shown as the code — see schema migration below), `desc_producto` = `''`, `cod_barra_producto` = `''`, `impuesto` = 0, `usa_porciones` = 0, `costo_prom` = DB default (`0.00`), `id_usuario_mod` = authenticated user, `ult_fecha_mod` = now. Updates always refresh `id_usuario_mod` / `ult_fecha_mod`.

**Schema migration — `id_producto` becomes AUTO_INCREMENT.** The legacy PK is a plain `int` assigned by the PHP app; the PoC converts it: `ALTER TABLE 20_m_producto MODIFY id_producto INT NOT NULL AUTO_INCREMENT;` (MariaDB seeds the counter at max+1 automatically; referencing FKs are unaffected since the column type does not change; `20_m_producto` is a small catalog table, so the ALTER is fast and safe within the migrate Lambda's timeout). Shipped as a versioned Drizzle migration — **not** a manual statement — so it replays identically in every future environment. `schema.ts` gets `.autoincrement()` on the column, and the create path relies on the DB-assigned id (no max+1 logic in the Lambda).

**Business rules** (checked in the same transaction as the write; apply to create, update, and restore):

1. `cod_serfel` must not be in use by another **active** (`id_estado = 1`) product.
2. `nom_producto` must not be in use by another **active** product.
3. Violations → `409` with machine-readable codes `COD_SERFEL_EN_USO` / `NOMBRE_EN_USO` so the UI can attach the error to the right field.

**Errors:** structured `{ error: { code, message } }`. 400 malformed input (Zod), 404 unknown id, 409 uniqueness conflict, 403 missing user mapping, 503 DB unreachable.

**No server-side pagination:** `GET /products` returns the whole catalog for the chosen estado (bounded size); filter/sort/pagination/stats/CSV happen client-side, matching the prototype's instant-filter UX. If the catalog proves large, server pagination is an additive change.

## 4. Authentication

- **Cognito user pool:** email sign-in, strong password policy, self-registration disabled. Admin creates users with temporary passwords; first login forces password change.
- **Legacy mapping:** custom attribute `custom:id_usuario` → `10_m_usuario.id_usuario`. Lambda reads it from JWT claims for `id_usuario_mod`. Missing claim → 403, no fallback user.
- Legacy `10_m_usuario.password` is **never read or logged** (Phase 2 carry-forward). Cognito replaces it outright.
- **API:** HTTP API built-in JWT authorizer validates the Cognito **ID token** (issuer = user pool, audience = app client). *Amended 2026-07-16: the original draft said access token, but Cognito only includes custom attributes like `custom:id_usuario` in ID tokens — access-token customization requires the paid pre-token-generation feature.* Lambda contains no auth logic beyond reading claims.
- **Angular:** custom login page in the approved visual language (not Hosted UI). `aws-amplify/auth` v6 for SRP sign-in, token storage/refresh, and the NEW_PASSWORD_REQUIRED challenge. HTTP interceptor attaches the ID token; route guard protects `/productos`; 401 → redirect to login.
- **Seed:** one real user (Christian) mapped to his legacy usuario row.

## 5. Frontend

- **Stack:** Angular 20, standalone + signals, plain SCSS with the prototype's design tokens as global styles. **No Material/PrimeNG** — the approved look is fully custom.
- **Structure:** `core/` (auth service, API client, interceptor, guard) · `features/login` · `features/productos` (page, table, filter bar, stats row, product modal, toast) · shared UI primitives where reuse is obvious. DTOs/Zod from `packages/shared` (schemas reused for form validation).
- **Behavior faithful to the prototype:** stats cards (total, marcas, tipos, filtrados), filter card (código, nombre, marca) + brand pills, sortable columns, client-side pagination (10/25/50), create/edit modal, delete with confirmation, toasts, empty state, client-generated CSV export of the filtered set.
- **Table columns:** Nº (`cod_serfel`) · Nombre · Marca · UM · Tipo · Acciones.
- **Additions:** estado filter (activos/inactivos/todos) with a **Restaurar** action on inactive rows; loading states; field-level server errors (409 codes land on Código/Nombre inputs); marca pills and badge colors generated from the real marcas list (not hardcoded).
- **Deploy:** build → SST StaticSite → S3 + CloudFront. API URL + Cognito ids injected at build time from SST outputs.

## 6. Testing

- **Unit (Vitest):** Zod schemas; Lambda route handlers with the DB layer faked — uniqueness rules, soft delete/restore, claims handling, error mapping. TDD during implementation.
- **Integration (on-demand):** suite against the deployed dev API with the DB started — CRUD round-trip on real MariaDB, self-cleaning. Not on every CI push (dev DB is usually stopped).
- **Frontend:** component tests for productos page logic (filters, sort, pagination, modal validation). Manual smoke pass on the CloudFront URL closes the PoC.

## 7. CI/CD & plan restructure

- Existing `deploy-dev.yml` (push to `main`) picks up new SST components; add the frontend build step. Migration step keeps skip-when-DB-stopped behavior.
- `plan-trabajo-app-ventas-aws.md`: Fase 3 rewritten as *PoC vertical: mantenedor de productos*; Fase 4 rewritten as *Módulos restantes* (each module repeats the vertical-slice pattern; SQS/EventBridge async moves here); Fases 0–2 marked complete; Fases 5–7 untouched.

## 8. Portability — future move to the client's production AWS account

This project will eventually be **handed over to / deployed in the client's own production AWS account** (dev today lives in account 146476548567). Every Phase 3 decision must keep that move cheap:

- **Everything reproducible from the repo:** infrastructure only via SST IaC, schema changes only via versioned Drizzle migrations (including the `id_producto` AUTO_INCREMENT conversion), reference-data seeding scripted. No manual console changes that would have to be remembered and repeated.
- **No account-specific hardcoding:** no account IDs, ARNs, VPC/subnet ids, or region literals in application code or SST config outside stage-level configuration; secrets and endpoints resolved at deploy time (Secrets Manager / SST outputs).
- **Cognito is per-account:** the user pool is recreated in the target account; users are re-created there (passwords are never exported). The `custom:id_usuario` mapping convention and an admin user-creation script/runbook are part of the deliverable so the pool can be rebuilt anywhere.
- **Data moves separately:** the DB migration path (dump/restore or snapshot-share into the client account) is a Fase 6 concern, but Phase 3 must not create obstacles to it (no environment-dependent data written by the app).

## 9. Items to verify during implementation

- ~~Actual values in `99_p_estado`~~ **Resolved (from `packages/db/dump/legacy-data.sql`):** `0 = Inactivo`, `1 = Activo` (2–5 are workflow states unused by products). Soft delete sets `id_estado = 0`; active filter is `id_estado = 1`.
- ~~Real product count~~ **Resolved:** ~2,750 products in the legacy dump — the no-server-pagination decision holds.
- Confirm the `id_producto` ALTER runs in-place/fast on the real table and that the migrate Lambda's 60s timeout is not a risk for it (it is for the 9.7M-row tables, not for this catalog table).
