# Prefacturación — Design Spec

**Date:** 2026-08-11
**Domain slice:** `ventas`
**Status:** Approved for planning

## Summary

Migrate the legacy Angular 14 `prefacturacion` component (and its `POST /preinvoice`
Sequelize backend) to the new serverless stack as a vertical slice. Replace the
legacy model of firing **N parallel single-pedido requests** with a **single batch
endpoint** that processes every selected pedido server-side, each in its own DB
transaction, and returns a per-pedido result array.

No DB migration is required: every table involved already exists in `@serfel/db`
(`t30MPedido`, `t40MVenta`, `t30MProductoPedido`, `t50MStock`, `t10MEmpresa`,
`t99PImpuesto`, `t99PIva`, `t20MProducto`, `t10MLocalCliente`, `t10MCliente`).

## Background: what the legacy does

**Frontend** (`apps/legacy-frontend/src/app/pages/ventas/prefacturacion/`):
- Loads all active pedidos, user picks a target **empresa** (RUT — hardcoded list of
  three), checkboxes N pedidos, clicks "Prefacturar".
- Frontend then fires **N parallel `POST /preinvoice`** calls, one per pedido, and
  tallies `prefacturados` / `errores` plus success/warning/error detail strings.
- Client-side column sort and select-all.

**Backend** (`lambdas/node-app-1/src/services/venta.service.ts`, Sequelize):
per pedido — guards (not already sold, active, no porciones), builds stock-adjusted
line items, computes IVA/ESPEC/ILA, inserts a `venta` + `producto_venta` rows,
reduces central-bodega stock (except internal companies), flips pedido → FINALIZADO,
returns the venta + warning messages. **No transaction** wraps the multi-write
sequence.

## Goals

- Faithful port of the per-pedido business rules.
- One HTTP round-trip and one DB connection per batch (fits the Lambda's
  `connectionLimit: 1`).
- Atomic writes per pedido (transaction).
- **Process every pedido and report per-row** — never stop on first error.
- Empresa options come from the DB, not a hardcoded list.
- Inline per-row result feedback in the UI.

## Non-goals

- Server-side pagination / server-side filtering of the worklist (client-side is
  sufficient for current volumes).
- Any change to the tax model or venta numbering (`numDoctoEmitido` stays 0, as in
  legacy — actual DTE emission is out of scope).
- Porcionado pedidos (explicitly rejected, as in legacy).

## Architecture

New domain slice mirroring `products` / `rutas`:

- **`packages/shared`** — Zod schemas + DTO types; add `ventas` to `MODULE_ROLES`.
- **`lambdas/ventas/`** — Hono app: `index.ts` (claims wiring + cached DB pool) →
  `app.ts` (router mounted at `/api`) → `service.ts` (business logic) → `authz.ts`
  (`requireModule("ventas", …)`). TLS to RDS via bundled `rds-global-bundle.pem`,
  ARM64, `connectionLimit: 1`.
- **`apps/frontend/src/app/features/prefacturacion/`** — store/api/logic/page,
  following the `productos` signal-store pattern. Route `/prefacturacion` guarded by
  `moduleGuard('ventas')`; nav item "Prefacturación".
- **`infra/`** — register the `ventas` Lambda + routes in the SST API module,
  following the existing per-domain Lambda wiring.

## Shared contract (`@serfel/shared`)

```ts
// Input
PrefacturaBatchInput = {
  rutEmpresa: number,               // int > 0
  idPedidos: number[]               // nonempty, unique, each int > 0
}

// Per-pedido outcome
PrefacturaResultItem = {
  idPedido: number,
  status: "facturado" | "error",
  idVenta?: number,                 // present when status === "facturado"
  mensajes: string[],               // stock-adjustment / skipped-line warnings
  error?: string                    // reason when status === "error"
}

PrefacturaBatchResult = {
  resultados: PrefacturaResultItem[],
  facturados: number,
  errores: number
}

// Lookups
PedidoPendienteDto = {
  idPedido: number,
  fecha: string,                    // ISO
  rutCliente: number,
  dvCliente: string,
  nomFantasia: string,
  nomLocal: string,
  contacto: string,                 // full contact name
  vendedor: string,                 // full vendedor name
  precioTotal: number
}

EmpresaDto = { rutEmpresa: number, dv: string, razonSocial: string }
```

`MODULE_ROLES.ventas = [1]` (Administrador), consistent with the other modules.

Zod validation rejects empty `idPedidos`, duplicates, and non-positive ids. The
schema is reused by the Angular form (one schema, two uses).

## Lambda: `ventas`

### Endpoints (mounted under `/api`)

- `GET /api/prefacturacion/pendientes` → `PedidoPendienteDto[]`
  Active pedidos with **no non-anulada venta** (the worklist), joined to
  local/cliente/vendedor. Ordered by `idPedido`.
- `GET /api/prefacturacion/empresas` → `EmpresaDto[]`
  Active rows from `t10MEmpresa`. Replaces the hardcoded 3 RUTs.
- `POST /api/prefacturacion` → `PrefacturaBatchResult`
  Body `PrefacturaBatchInput`. `idUsuario` from `custom:id_usuario` on the Cognito
  ID token.

All three gated by `requireModule("ventas", deps)`.

### Batch processing

- Load impuesto (IVA, ESPEC) + per-tax rows **once per batch**, not per pedido.
- Dedupe `idPedidos` defensively (also enforced by Zod).
- Loop `idPedidos` **sequentially**. For each pedido, run the full unit inside a
  single `db.transaction`:
  1. Re-check inside the txn that no non-anulada venta exists for the pedido
     (idempotency vs. double-click / duplicate ids / concurrent request).
  2. Guard: pedido exists and is `ACTIVO`.
  3. Guard: pedido has no porcionado product → error.
  4. Build line items from `producto_pedido`:
     - Read the **central-bodega** stock row deterministically (fixes the legacy
       `forEach` bug that kept only the last row's `cantidad`).
     - Skip lines with no stock row / zero stock (push a warning message).
     - Clamp line quantity to available stock, pushing a warning when altered.
     - Accumulate net total, ILA, ESPEC using the same rounding as legacy.
  5. Insert `venta` (fields mirror legacy: `idTipoDoctoEmitido = FACTURA`,
     `numDoctoEmitido = 0`, `idEstado = FINALIZADO`, computed IVA/ESPEC/ILA/subTotal/
     precioTotal, `idUsuarioMod = idUsuario`, `rutEmpresa`, cliente/local/formaPago/
     listaPrecio derived as in legacy). PK via `ResultSetHeader.insertId` — never
     hand-assigned.
  6. Insert `producto_venta` rows.
  7. Reduce central-bodega stock for each line **unless the cliente is an internal
     company** (`rutCliente` present in `t10MEmpresa`).
  8. Flip pedido → `FINALIZADO`.
  - On success: commit, record `{ status: "facturado", idVenta, mensajes }`.
  - On thrown guard/DB error: the txn rolls back; record
    `{ status: "error", error, mensajes: [] }` and **continue to the next pedido**.
- Return `{ resultados, facturados, errores }`.

Sequential processing also makes stock decrement correct across pedidos that share a
product — the legacy parallel model could read the same stock twice and oversell.

## Frontend feature

`apps/frontend/src/app/features/prefacturacion/`:

- **`prefacturacion-api.service.ts`** — `pendientes()`, `empresas()`,
  `prefacturar(input): PrefacturaBatchResult`.
- **`prefacturacion-store.ts`** (signals) — state: `pedidos`, `empresas`,
  `empresaSeleccionada`, `seleccion` (Set<idPedido>), `resultados`
  (Map<idPedido, PrefacturaResultItem>), `filters`, `sort`, `loading`, `errorMsg`.
  Computed: `filtered`, `sorted`, `stats` (`seleccionados` / `facturados` /
  `errores`). Actions: `load()`, `toggle(id)`, `toggleAll()`, `setFilter()`,
  `toggleSort()`, `prefacturar()` (validates empresa selected, POSTs selected ids,
  merges per-pedido results into `resultados`, then reloads the worklist so
  facturados drop out; errored rows remain with their badge).
- **`prefacturacion-logic.ts`** — pure, Angular-free helpers for filter / sort /
  select-all / stats. Unit-tested.
- **`prefacturacion-page.component.ts`** — toolbar (empresa dropdown + Prefacturar
  button + summary count badges), search box, sortable table with per-row checkbox
  and an **inline status badge** (facturado ✓ / error ✕ with tooltip / warning for
  stock adjustments). Own SCSS, no component library.

Route `/prefacturacion` with `moduleGuard('ventas')`; add nav entry.

## Error handling

- Structured API errors via the existing `AppError` → `ApiErrorBody` pattern; the
  store surfaces `error.message`.
- Batch-level failures (bad body, empresa missing) → 4xx before any processing.
- Per-pedido failures are **data**, not HTTP errors: reported inside
  `PrefacturaBatchResult`, HTTP 200.

## Testing

- **`lambdas/ventas/tests/service.test.ts`** (local MariaDB via
  `packages/db/docker-compose.yml`): happy path; already-sold guard; porciones
  guard; stock-adjust warning; no-stock line skipped; partial batch (mix of
  ok/error, all processed); transaction rollback on forced mid-unit failure;
  internal-company stock-skip; sequential stock decrement across two pedidos sharing
  a product.
- **`lambdas/ventas/tests/app.test.ts`**: authz gate (wrong tipo → 403); Zod
  validation (empty ids, duplicates, non-positive); result shape.
- **`apps/frontend/.../prefacturacion-logic.spec.ts`**: filter / sort / select-all /
  stats.
- Uses `migrateSchemaOnly` for the schema (skips data-seed migrations), per the
  existing test setup.

## Open questions

None outstanding. Decisions locked during brainstorming:
- Batch endpoint (not per-pedido).
- Empresa options from DB lookup.
- Client-side filters/sort on the worklist.
- Inline per-row status + summary counts.
- **Process all pedidos, report per-row — never stop on first error.**
- Module name `ventas`; endpoints grouped under `/api/prefacturacion/*`.
