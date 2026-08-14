# Clientes maintainer — design

**Date:** 2026-08-13
**Status:** Approved (brainstorming) — pending implementation plan
**Entity:** `10_m_cliente`

## Goal

Add a Clientes maintainer to the new Angular frontend as a vertical slice
(shared Zod schema → Hono Lambda → Angular feature), mirroring the existing
`usuarios` maintainer and the new UI design layout. Admin-only (`id_tipo_usuario`
= 1), consistent with the other maintainers.

## Scope

- **In:** CRUD on the `10_m_cliente` header record; soft-delete + one-click
  restore; a read-only list enriched with per-client route weekdays and the
  last invoice / credit-note numbers.
- **Out:** `10_m_local_cliente` (locales/sucursales) management — a future slice.
  The list *reads* locales to derive route days, but the maintainer does not edit
  them.

## Key facts about the entity

- **Primary key is `rut_cliente`** (an `int`) — the RUT *is* the identity. Unlike
  `usuarios` (synthetic `id_usuario` + `rut_usuario`), there is no separate id.
  Consequences: the RUT is immutable (not editable on update) and unique by
  definition; API routes are keyed by the rut int.
- `dv_cliente` stores the check digit separately.
- Unique business field: **`razon_social`**.
- FKs: `id_lista_precio` → `40_m_lista_precio`, `id_estado` → `99_p_estado`.
- `permite_venta_deuda` is a `tinyint` boolean flag.
- Every write stamps `id_usuario_mod` + `ult_fecha_mod` (matches usuarios).

## 1. Shared contract (`packages/shared`)

### Refactor: extract RUT helpers

Move `computeDv`, `parseRut`, `rutValido`, `formatRut` out of `usuarios.ts` into a
new `rut.ts`, re-exported from `index.ts`. Two domains now depend on them, so they
no longer belong to the usuarios module. `usuarios.ts` re-imports from `rut.ts` so
nothing downstream changes. Reuse the existing módulo-11 implementation as-is
(already unit-tested).

### New `clientes.ts`

`ClienteCreateSchema`:

| field | rule |
|---|---|
| `rut` | `string`, `.refine(rutValido, "RUT inválido …")` |
| `razonSocial` | required, trim, max 50 |
| `nomFantasia` | optional, trim, max 50, default "" |
| `telefono` | nullable, max 15 |
| `direccion` | required, trim, max 200 |
| `comuna` | trim, max 20, default "" |
| `ciudad` | trim, max 25, default "" |
| `email` | `.email()`, max 50, nullable |
| `idListaPrecio` | `int().positive()` |
| `permiteVentaDeuda` | `boolean`, default false |

`ClienteUpdateSchema`: same fields **minus `rut`** (PK is immutable).

`ClienteDto`:

```
rutCliente: number
dvCliente: string
rut: string            // formatRut(rutCliente, dvCliente)
razonSocial: string
nomFantasia: string
telefono: string | null
direccion: string
comuna: string
ciudad: string
email: string | null
idListaPrecio: number
nomListaPrecio: string // joined
permiteVentaDeuda: boolean
idEstado: number
dias: number[]              // present route weekdays, num_dia values 1..5
ultFactura: number | null  // MAX num_docto_emitido
ultNotaCredito: number | null
```

`ClienteLookupsDto`: `{ listasPrecio: { id: number; nombre: string }[] }`.

Reuse `EstadoFilterSchema` / `ESTADO_ACTIVO` / `ESTADO_INACTIVO` from `productos.ts`.

### authz

Add `clientes: [1]` to `MODULE_ROLES` in `authz.ts`. This single source feeds both
the Lambda gate and the Angular `moduleGuard` / nav.

## 2. Lambda (`lambdas/clientes`)

New Hono lambda mirroring `usuarios`: `index.ts` (thin handler, DB pool outside
handler, extracts `custom:id_usuario`), `app.ts` (router at `/api`), `service.ts`,
`authz.ts` (`requireModule("clientes")`), `errors.ts`, `types.ts`, `tests/`.

### Routes

| method + path | purpose |
|---|---|
| `GET /api/clientes?estado=` | list (activos / inactivos / todos) |
| `GET /api/clientes/lookups` | listas de precio |
| `POST /api/clientes` | create |
| `PUT /api/clientes/:rut` | update (param = rut int, the PK) |
| `POST /api/clientes/:rut/activate` | **Restaurar** (flip idEstado → activo, as-is) |
| `POST /api/clientes/:rut/deactivate` | soft-delete |

### List query strategy — 4 queries merged in JS by `rut_cliente`

Avoids per-weekday correlated subqueries; each query is index-friendly and unit
testable. Merge results in `service.ts` keyed by `rut_cliente`.

1. **Base list** — `10_m_cliente` ⋈ `40_m_lista_precio`, filtered by estado
   (activos → `id_estado = 1`, inactivos → `0`, todos → no filter). Ordered by
   `razon_social`.
2. **Route days** (active routes only):
   ```sql
   SELECT lc.rut_cliente, r.num_dia
   FROM 40_m_ruta r
     JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
     JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
   WHERE r.id_estado > 0
   GROUP BY lc.rut_cliente, r.num_dia
   ```
   → `Set<num_dia>` per client. `num_dia`: 1=L, 2=M, 3=M, 4=J, 5=V.
3. **Últ. Factura** — active docs only:
   ```sql
   SELECT rut_cliente, MAX(num_docto_emitido) AS ult
   FROM 40_m_venta WHERE id_estado > 0 GROUP BY rut_cliente
   ```
4. **Últ. Nota Crédito** — active NC only; NC reaches the client only through the
   venta:
   ```sql
   SELECT v.rut_cliente, MAX(nc.num_nota_credito) AS ult
   FROM 40_m_nota_credito nc
     JOIN 40_m_venta v ON nc.id_venta = v.id_venta
   WHERE nc.id_estado > 0
   GROUP BY v.rut_cliente
   ```

Note: `40_m_nota_credito` has **no** `rut_cliente` and its number column is
`num_nota_credito` (not `num_docto_emitido`).

### Uniqueness & lifecycle (`service.ts`)

- **Create:** if the RUT already exists → active: `RUT_EN_USO` (409); inactive:
  `RUT_INACTIVO` (409, body carries the rut) → frontend offers reactivation with
  the entered data (same flow as usuarios). Assert `razon_social` unique
  (excluding self) → `RAZON_SOCIAL_EN_USO` (409).
- **Update:** assert `razon_social` unique excluding self.
- **Deactivate:** refuse if the client has dependent records that forbid removal
  (locales in `10_m_local_cliente`, and/or ventas in a non-final state) →
  `CLIENTE_CON_DEPENDENCIAS` (409), matching the usuarios FK-safety pattern. Final
  gate conditions to be pinned down in the plan against the actual FKs.
- **Activate (Restaurar):** flip `id_estado` → activo with existing data; assert
  `razon_social` still unique.

### infra wiring (`infra/api.ts`)

Add `ClientesFn` (ARM64, same env/links as `UsuariosFn`) and register **every**
route explicitly — the HTTP API uses an explicit route list, not a catch-all, so a
missing route surfaces in the browser as a CORS 404.

## 3. Frontend (`apps/frontend/src/app/features/clientes`)

Five files mirroring usuarios, reusing the existing layout primitives (no new
CSS): `clientes-api.service.ts`, `clientes-store.ts`, `clientes-logic.ts`
(+ `.spec.ts`), `clientes-page.component.ts`, `cliente-modal.component.ts`.

Shared layout used: `app-navbar`, hero header, `stats-row`, `filter-dropdowns`,
`table-wrap`, pagination, `app-toast`.

- **Filters:** RUT · Razón social · Lista de precio (dropdown) · Estado.
- **Stats cards:** Total clientes · Con ruta · Con venta a deuda · Filtrados
  (final metrics confirmable in the plan).
- **Table columns:** RUT · Razón Social · **L · M · M · J · V** · Últ. Factura ·
  Últ. Nota Crédito · Acciones.
  - Each weekday cell renders a small truck/check icon when that `num_dia` is in
    `dias`, otherwise blank.
  - Últ. Factura / Últ. Nota Crédito show the number or `—`.
- **Acciones:**
  - Active rows → **Editar** + **Eliminar** (soft-delete).
  - Inactive rows (visible under Inactivos / Todos) → **Restaurar** (green) →
    confirm → `store.activate(rut)`; one-click, restores as-is. Editing happens
    afterward via the normal Editar button.
- **Modal** (`cliente-modal.component.ts`): all business fields, incl. lista de
  precio `<select>` and a "Permite venta a deuda" checkbox. Client-side Zod
  validation + `rutValido` before submit; RUT input disabled on edit. Reuses the
  `setServerError` pattern for `RUT_EN_USO` / `RAZON_SOCIAL_EN_USO` 409s.
- **Wire-up:** route `clientes` with `moduleGuard('clientes')` in `app.routes.ts`;
  nav entry.

## Reusable convention — Restaurar button

Every future maintainer that supports an Inactivos/Todos estado filter should also
expose a one-click **Restaurar** button on inactive rows (confirm → activate
as-is). Recorded as a project convention.

## Testing

- `packages/shared`: `clientes.spec.ts` — schema validation, RUT refine, razón
  social bounds. RUT helper tests move with `rut.ts`.
- `lambdas/clientes/tests`: service tests against local MariaDB — create /
  uniqueness (RUT active/inactive, razón social) / update / deactivate guard /
  activate; and the 4-query merge producing correct `dias` / `ultFactura` /
  `ultNotaCredito` (needs seed rutas + ventas + notas de crédito).
- `apps/frontend`: `clientes-logic.spec.ts` — filters, sort, pagination, CSV.

## Open items for the plan

- Exact deactivate guard conditions (which dependent records block removal).
- Final stats-card metrics.
- Seed fixtures for route-day / document derived columns in Lambda tests.
