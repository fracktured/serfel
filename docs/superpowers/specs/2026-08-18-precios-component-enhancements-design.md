# Precios component enhancements — design

Date: 2026-08-18

## Goal

Three improvements to the new-frontend **Precios y Descuentos** page
(`apps/frontend/src/app/features/precios/`), keeping the existing new-UI design system:

1. Widen the products table.
2. Show each tramo's `maxPorcen` next to its quantity badge.
3. Add bulk edits — the existing three (Nuevo Precio, Máx % Desc, Borrar Máx %)
   plus **new** per-tramo bulk edits.

Legacy reference `legacy-php/Distribuidor/Ventas/listPrecioProducto` only ever
had the first three bulk edits and never displayed tramos, so tramo bulk editing
is genuinely new.

## Decisions (confirmed with user)

- **Tramo bulk sets both `cantidad` + `maxPorcen`** for the chosen tramo across
  all selected products, preserving the other two tramos.
- **Table width:** override `.page-body` `max-width` to `1560px` for the precios
  page only (it is a global 1280px shared by other pages).

## Changes

### 1. Wider table — frontend only
Override `.page-body { max-width: 1560px }` inside the precios component's scoped
`styles` so only this page widens. Other pages keep 1280px.

### 2. Tramo `maxPorcen` display — frontend only
In each tramoN cell, when `cantidad > 0` render the existing `cantidad` `pv-badge`
plus a muted `{{ t.maxPorcen }}%` to its right. Empty tiers keep the `—`.

### 3. Tramo bulk edits — full stack

**`packages/shared/src/precios.ts`**
- Add `"setTramo"` to `BulkActionSchema`.
- Add optional `tramo` (int 1..3), `cantidad` (int ≥0), `maxPorcen` (int 0..100)
  to `BulkInputSchema`.
- Rework `superRefine`: require `valor` only for `setPrecioNeto`/`setMaxDesc`
  (keep the `>100` guard for `setMaxDesc`); require `tramo`, `cantidad`,
  `maxPorcen` for `setTramo`.

**`lambdas/precios/service.ts`**
- `writeRow` patch gains `tramoPatch?: { index: 1|2|3; cantidad: number; maxPorcen: number }`.
  It writes only that tramo's two columns in both the INSERT values and the
  `onDuplicateKeyUpdate` set (via a `switch(index)` for type safety), leaving the
  other two tramos untouched on existing rows. New rows insert `precioNeto=0`
  (same behavior as the current `setMaxDesc` bulk on a missing row).
- `bulkApply` gains a `setTramo` branch calling `writeRow` with `tramoPatch`.

**Frontend `precios-page.component.ts`**
- Bulk-bar select gains `Tramo 1 / Tramo 2 / Tramo 3`.
- Selecting a tramo swaps the single `valor` input for two inputs
  (*cant. desde*, *máx %*); `clearMaxDesc` shows none; the others keep one input.
- `onBulk()` maps `setTramoN → { action: 'setTramo', tramo: N, cantidad, maxPorcen }`.
- Reuses `.bulk-bar` styling. `PreciosStore.applyBulk` is already generic — no change.

**No API Gateway change** — reuses the existing `POST .../bulk` route.

## Tests

- `packages/shared/src/precios.spec.ts`: `setTramo` accepted with valid
  tramo/cantidad/maxPorcen; rejected when any is missing or out of range; `valor`
  no longer required for `setTramo`.
- `lambdas/precios/tests/service.test.ts`: bulk `setTramo` updates the target
  tramo for selected products, preserves the other two tramos, and upserts a row
  for a product not yet in the list.
- Manual: run the app, verify wider table, tramo `%` display, and the tramo bulk
  flow end to end.

## Out of scope
Drawer component, list CRUD, pricing math (`computePreciosVenta`), and the
`porcen_desc` dead column all stay untouched.
