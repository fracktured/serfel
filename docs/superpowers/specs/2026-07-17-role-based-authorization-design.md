# Role-Based Authorization (id_tipo_usuario) — Design

**Date:** 2026-07-17
**Status:** Approved (brainstorming session)
**Builds on:** Phase 3 PoC (products maintainer) — deployed to `dev`. Cognito ID-token auth with `custom:id_usuario`; one Lambda per domain (Hono); Angular login + guard + interceptor.

## 1. Goal

Restrict the products module to users whose `10_m_usuario.id_tipo_usuario` is in an allowed set (today: `[1]` = Administrador). The mechanism must extend cleanly to more roles and more modules (roles: `0 Sin Info, 1 Administrador, 2 Vendedor, 3 Secretaria`).

## 2. Principle

The **API enforces authorization authoritatively**; the frontend role checks are UX only (hide what the user can't use). A hidden UI control is not security — any valid token can call the API — so every protected route is gated server-side, and the UI merely mirrors the same policy.

## 3. Decisions (from brainstorming)

- **Role source = the DB.** `id_tipo_usuario` is read from `10_m_usuario` per request on the backend, and delivered to the frontend via `GET /me`. The DB stays the single source of truth (no role duplicated into the Cognito token, no drift, role changes take effect immediately).
- **Policy = a shared constant map.** `MODULE_ROLES` in `@serfel/shared` is imported by both the Lambda authz check and the Angular guard/nav, so API and UI can never disagree. Extending access is a one-line code change + deploy. (A DB-driven permissions table was considered and deferred — YAGNI until runtime-editable permissions are a real requirement.)
- **Denied UX = a reusable `/sin-acceso` page.** The route guard redirects unauthorized-but-authenticated users there; they stay logged in.

No schema migration (the column exists). No Cognito/token change.

## 4. Shared policy (`@serfel/shared`)

```ts
// The one place module access is defined. Values are id_tipo_usuario.
export const MODULE_ROLES = {
  productos: [1], // Administrador
} as const;
export type ModuleName = keyof typeof MODULE_ROLES;

export function tipoCanAccess(module: ModuleName, tipo: number): boolean;

/** Module names a given tipo can access (for /me and the nav). */
export function modulesForTipo(tipo: number): ModuleName[];
```

- New `ApiErrorCode`: **`PROHIBIDO`** (HTTP 403) — authenticated user lacks the required role. Distinct from the existing `NO_AUTORIZADO` (403, missing `custom:id_usuario` mapping) so the frontend can react specifically.

## 5. Backend

- **Role loader** — `getUserTipo(db, idUsuario): Promise<number | null>`: a single indexed PK lookup on `10_m_usuario` returning `id_tipo_usuario`, or `null` if the row is absent. Per request; caching is a deliberate non-goal for now (keeps role changes immediate; the lookup is ~1ms). Never selects/logs `password`.
- **`requireModule(module: ModuleName)`** — Hono middleware factory:
  1. Read `custom:id_usuario` claim → `403 NO_AUTORIZADO` if missing/invalid (existing behavior).
  2. `getUserTipo` → `403 NO_AUTORIZADO` if the user row is missing.
  3. `tipoCanAccess(module, tipo)` → `403 PROHIBIDO` if not allowed.
  4. On success, expose `idUsuario` and `idTipoUsuario` on the request context.
  This replaces the current bare id_usuario middleware for the protected routes.
- **Route gating** (products Lambda Hono app):
  - `GET /api/me` — requires only a valid id_usuario claim (NOT the productos role), so a denied user can still discover their access. Returns `{ idUsuario, idTipoUsuario, nomUsuario, modulos }` (`modulos = modulesForTipo(tipo)`), read from `10_m_usuario`.
  - `GET/POST/PUT/DELETE /api/products*` and `GET /api/lookups` — gated by `requireModule('productos')`.
- **/me placement:** for this PoC `/me` lives in the products Lambda (all `/api/*` already routes there). When Phase 4 adds domain Lambdas with path-specific routes, `/me` and the shared authz middleware move to a shared/session home; they are written as self-contained units to make that extraction cheap.

## 6. Frontend

- **`SessionService`** — after login, calls `GET /me` once and stores `{ idUsuario, idTipoUsuario, nomUsuario, modulos }` in a signal; exposes `canAccess(module)`. Cleared on logout.
- **`/productos` route guard** — allows only when `session.canAccess('productos')`; otherwise redirects to `/sin-acceso`. The guard ensures the session is loaded (fetches `/me` if not yet) before deciding.
- **`/sin-acceso` component** — "No tienes acceso a este módulo." + Cerrar sesión, in the approved visual language; reused by every module.
- **Login flow** — after successful authentication, load the session, then route to `/productos` if accessible else `/sin-acceso`.
- **Interceptor** — a `403` with code `PROHIBIDO` also redirects to `/sin-acceso` (defense in depth if the role changes mid-session); existing `401 → /login` unchanged.
- **Nav** — renders only modules in `session.modulos`; the header shows `nomUsuario`.

## 7. Testing

- **Backend (Vitest, real MariaDB):** `getUserTipo` returns the tipo / null. App tests: a tipo-1 user → 200 on `/products` and `/lookups`; a tipo-2 user → **403 `PROHIBIDO`** on both; `/me` → 200 for any authenticated user (tipo 1 and tipo 2) with the correct `modulos` (tipo 1 → `['productos']`, tipo 2 → `[]`). The test helper seeds a second user with `id_tipo_usuario = 2`.
- **Shared (Vitest):** `tipoCanAccess` / `modulesForTipo` truth table.
- **Frontend (Vitest):** guard allow vs deny; `SessionService.canAccess`.
- **Smoke:** unchanged (its seeded user is tipo 1); the 403 path is covered by unit tests, not the live smoke.

## 8. Out of scope / future

- DB-driven, runtime-editable permissions (roles × modules table + admin UI).
- Per-action (read vs write) granularity within a module — today access is all-or-nothing per module.
- Extracting `/me` + authz middleware into a shared package (happens when the second domain Lambda lands in Phase 4).
- Caching the role lookup.

## 9. Verify during implementation

- ~~Confirm the seeded user's tipo~~ **Resolved (legacy dump):** fracktured@gmail.com = id_usuario 1 has `id_tipo_usuario = 1` (Administrador), so he retains access after the gate lands.
