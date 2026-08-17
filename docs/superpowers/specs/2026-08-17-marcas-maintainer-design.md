# Marcas maintainer — design

Date: 2026-08-17
Status: Approved (design)

## Goal

Add a **Marcas** (product brands) maintainer to the new Angular frontend, modeled
on the existing **Productos** maintainer, as a vertical slice: DB migration →
shared schemas → new Lambda → infra wiring → frontend feature → navigation.

Three explicit requirements from the request:

1. It is a parameter maintainer — use the products maintainer as the example, but
   **remove the header-search** slot.
2. It lives under a restructured **Mantenedores → Productos** submenu (3-level nav).
3. Change the `20_p_marca` primary key to AUTO_INCREMENT.

## Decisions

- **Delete model:** soft-delete, mirroring products. Add an `id_estado` column to
  `20_p_marca`; expose an Activos/Inactivos/Todos filter and a Restaurar button on
  inactive rows.
- **Uniqueness:** `nom_marca` must be unique **among active marcas**, enforced as an
  application rule in the service layer (returns `NOMBRE_EN_USO` 409), **not** a DB
  `UNIQUE` index. A hard DB constraint would conflict with soft-delete (a
  deactivated brand would permanently block re-creating an active brand of the same
  name). Case-insensitive via MariaDB's default collation, same as products.
- **Backend:** a dedicated `lambdas/marcas/` Hono app and a new `marcas` authz
  module — consistent with "one Lambda per domain" and "each nav leaf maps to
  exactly one authz module".
- **Navigation:** Mantenedores becomes fully subsection-based, with disabled
  "(no disponible)" roadmap placeholders.

## Section 1 — Database (`packages/db`)

Edit `packages/db/src/schema.ts`, then `pnpm --filter @serfel/db generate` to
produce a versioned migration. Two changes to `20_p_marca`:

1. **`id_marca` → AUTO_INCREMENT.** `20_p_marca` is a **foreign-key parent**
   (`20_m_producto.prod_marca` → `20_p_marca.id_marca`), so a naive `ALTER` hits
   the 1834/1452 FK-parent trap, and a possible `id_marca = 0` row hits the
   `NO_AUTO_VALUE_ON_ZERO` 1062 trap. The migration must:
   - drop the child FK (`prod_marca`),
   - `ALTER` the PK column to AUTO_INCREMENT (with the id=0 save/restore dance if an
     id=0 row exists),
   - re-add the child FK.
   Existing `id_marca` values are preserved; only future inserts auto-assign. See
   the repo memory `autoincrement-alter-fk-parent-1834` for the exact trap handling.
2. **Add `id_estado`** `int NOT NULL DEFAULT 1`; backfill all existing rows to `1`
   (Activo).

`schema.ts`: mark `idMarca` `.autoincrement()` and add the `idEstado` column. No
`UNIQUE` index on `nom_marca`.

**Verification:** because this touches an FK parent on populated data, validate the
migration against the running dev DB using the migrate-Lambda `{diagnose:true}`
branch pattern before relying on it.

## Section 2 — Shared (`packages/shared`)

New `packages/shared/src/marcas.ts` (exported from `index.ts`):

- `MarcaInputSchema = z.object({ nomMarca: string.trim().min(1).max(50),
  descMarca: string.trim().max(200).default("") })`; `MarcaInput` type.
- `MarcaDto = { idMarca: number; nomMarca: string; descMarca: string;
  idEstado: number }`.
- Reuse `EstadoFilterSchema`, `ESTADO_ACTIVO`, `ESTADO_INACTIVO` from `productos.ts`.
- Add `MARCA_NO_ENCONTRADA` to the `ApiErrorCode` union; reuse `NOMBRE_EN_USO`.

`packages/shared/src/authz.ts`: add `marcas: [1]` to `MODULE_ROLES` (1 =
Administrador). This automatically extends `ModuleName`, the guard, and `me()`.

Tests: `marcas.spec.ts` for `MarcaInputSchema` (trim, min/max, default desc).

## Section 3 — Lambda (`lambdas/marcas/`)

Hono app mirroring `lambdas/products/` structure: `index.ts` (thin handler, DB pool
outside handler, JWT `custom:id_usuario`), `app.ts` (router at `/api`), `service.ts`
(business logic), `authz.ts` (`requireModule`), `errors.ts`, `types.ts`.

Gated by `requireModule("marcas", deps)`. Endpoints:

| Method | Path                        | Behavior |
|--------|-----------------------------|----------|
| GET    | `/api/marcas?estado=`       | list, filter activos/inactivos/todos, order by `nom_marca` |
| POST   | `/api/marcas`               | create; `assertUnique` among active → `NOMBRE_EN_USO` 409 |
| PUT    | `/api/marcas/{id}`          | update; 404 `MARCA_NO_ENCONTRADA` + `assertUnique` |
| DELETE | `/api/marcas/{id}`          | soft-delete (set `id_estado = 0`), returns updated DTO |
| POST   | `/api/marcas/{id}/restore`  | reactivate; re-checks uniqueness among active |

No `/lookups` and no `/me` here — those remain owned by the products lambda.
`createProduct`-style transactions: read the DB-assigned id from mysql2's
`ResultSetHeader.insertId` (no `$returningId()`).

Tests: `tests/service.test.ts` + `tests/app.test.ts` (mirror products' `helpers.ts`),
covering list-by-estado, create, uniqueness-among-active clash, update, soft-delete,
and restore. Requires local MariaDB
(`docker compose -f packages/db/docker-compose.yml up -d --wait`).

## Section 4 — Infra (`infra/api.ts`)

New `MarcasFn` `sst.aws.Function` cloned from `ClientesFn`: same private-subnet VPC,
`DB_SECRET_ARN`, `secretsmanager:GetSecretValue` permission, `rds-global-bundle.pem`
copyFile, ARM64, 256 MB, 20 s timeout; transform name `serfel-${$app.stage}-marcas`.

Register an explicit `marcasRoutes` array (NOT a catch-all) in the route loop behind
`jwtAuthorizer` — this registration is the easy-to-miss step that otherwise surfaces
as a CORS 404 in the browser:

```
GET    /api/marcas
POST   /api/marcas
PUT    /api/marcas/{id}
DELETE /api/marcas/{id}
POST   /api/marcas/{id}/restore
```

OPTIONS stays unrouted (API Gateway answers preflight itself).

## Section 5 — Frontend nav model (`core/nav.ts` + `core/navbar.component.ts`)

Generalize the nav model to support subsections and disabled placeholders:

- `NavLeaf`: `module?` and `path?` become optional; add `disabled?: boolean`.
  Placeholders have a `label` only, render greyed and non-clickable ("(no disponible)").
- New `NavSection { label?: string; icon?: string; children: NavLeaf[] }`.
- `NavGroup.children` becomes `NavSection[]`.
- `visibleGroups(modulos)`: a section is visible if it has ≥1 accessible **real**
  leaf (its placeholders ride along); a group is visible if it has ≥1 visible
  section. The source constant is never mutated.
- Documentos and Ventas each become a single **label-less** section, so they render
  flat exactly as today.

New Mantenedores structure:

```
Mantenedores
  Usuarios
    Usuarios              → /usuarios   (module: usuarios)
    Empresas              (no disponible)
  Clientes
    Clientes              → /clientes   (module: clientes)
    Post Venta            (no disponible)
  Productos
    Productos             → /productos  (module: productos)
    Marcas                → /marcas     (module: marcas)
    Unidades de Medida    (no disponible)
    Tipos                 (no disponible)
```

Navbar template: render section subheads using the prototype's `subhead`/`mcard`
pattern (see `docs/prototypes/navigation/option-2-topbar-mega.html`, the Logística
panel) and grey disabled leaves, in both the desktop mega panel and the mobile
accordion. A section's parent label is a **subsection header only** (not a link).

## Section 6 — Frontend Marcas feature (`features/marcas/`)

Mirrors the products feature, trimmed for a parameter maintainer (no header-search,
no lookups, no detail/stock modal):

- `marcas-api.service.ts` — `list(estado)`, `create`, `update`, `deactivate`,
  `restore` against `/api/marcas`.
- `marcas-logic.ts` (+ `.spec.ts`) — pure `applyFilters` (by nombre), `sortRows`
  (nombre/descripcion), `paginate`, `computeStats`, `toCsv`.
- `marcas-store.ts` — signals store cloned from `productos-store`, minus lookups.
  Filters `{ nombre, quick }`; reuse estado filter.
- `marca-modal.component.ts` — fields **Nombre \*** (max 50) and **Descripción**
  (optional, max 200), validated via `MarcaInputSchema`; surfaces `NOMBRE_EN_USO`
  409 inline on the nombre field.
- `marcas-page.component.ts` — hero ("Catálogo de Marcas" / "Nueva Marca"), slim
  stats row (Total / Filtradas), filter row (Nombre + Estado + Limpiar), sortable
  table (Nombre, Descripción, Acciones: Editar/Eliminar; **Restaurar** on inactive
  rows), pagination, Exportar CSV, toast. No `header-search` slot in the navbar.

Wiring:

- `app.routes.ts`: `{ path: 'marcas', component: MarcasPageComponent,
  canActivate: [moduleGuard('marcas')] }`.
- Nav leaf `Marcas` → `/marcas`, module `marcas`, in the Productos subsection.

## Out of scope (YAGNI)

- The "(no disponible)" placeholders (Empresas, Post Venta, Unidades de Medida,
  Tipos) are nav labels only — no routes, components, modules, or APIs.
- No `/lookups` or brand-color badge logic for marcas.
- No changes to the products maintainer beyond it continuing to own `/lookups`
  and `/me`.

## Verification checklist

- `pnpm typecheck` clean.
- `pnpm -r test` green (shared + marcas lambda + frontend logic), local MariaDB up.
- Migration validated against dev DB via migrate-Lambda `{diagnose:true}` before
  `db:migrate`; deploy SST **before** running the migration.
- Manually drive the Marcas maintainer in the running app (create → uniqueness
  clash → edit → soft-delete → restore) and confirm the 3-level Mantenedores menu
  renders with disabled placeholders.
