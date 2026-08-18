# Precio Producto — migration to the new frontend (design)

Date: 2026-08-18
Status: approved (brainstorm) — pending implementation plan

## Goal

Migrate the legacy `listPrecioProducto` module
(`legacy-php/Distribuidor/Ventas/listPrecioProducto`) to the new serverless
stack (Angular 20 frontend + Hono Lambda + shared Zod), reproducing its
functionality and surfacing the volume-discount **tramo** columns that already
exist in `40_m_precio_producto` but were never shown or edited in the legacy UI.

**No changes are made to `legacy-php` as part of this work.**

## What the legacy module does

- Two levels: **Listas de Precio** (price lists — create by name, delete, pick
  one to display) and the **per-product price grid** inside the selected list.
- Grid columns: `N` (cod_serfel), Nombre Producto, Costo Últ. Compra
  (`costo_prom`), Precio Neto, Precio Base (neto + impuestos), Máx. % Desc.,
  Precio Venta Cliente, select checkbox. Rows render red when the product sells
  at/below cost.
- All editing is **bulk**: check rows, pick one radio action — *Nuevo Precio*,
  *Máx. % Descuento*, *Borrar Máx. % Descuento* — apply the entered value to
  every checked row.

## New columns being surfaced

`cant_tramo1/2/3` + `max_porcen_tramo1/2/3` are **volume discount tiers**: each
tier = a minimum quantity threshold (`cant_tramoN`) plus the max discount %
allowed once an order reaches that volume (`max_porcen_tramoN`). Tiers are
ascending (t1 < t2 < t3). Present in the table and now editable in the new UI.

## Decisions locked in during brainstorming

- Editing model: **per-product drawer + bulk actions** (drawer for the full
  per-product pricing incl. tramos; bulk actions kept for the scalar fields).
- Editable fields: Precio Neto, Máx. % Desc., the 3 tramo tiers. Margen Utilidad
  shown read-only.
- **`40_m_precio_producto.porcen_desc` is a dead column — never read or write
  it.** Writes leave it at its default (0).
- Precio Venta is a **multi-value cell** (up to 4 values, each with its margin).
- Price-list rows and product-pricing rows are **upsert-only**. No
  Activas/Inactivas toggle, no restore UI. (List DELETE still inactivates via
  `id_estado=0`, matching legacy *Eliminar Lista*, but there is no restore.)

## 1. Architecture (new `precios` vertical slice)

No DB migration — the tramo columns already exist in `schema.ts`
(`t40MPrecioProducto`). New code, mirroring the `marcas` / `products` slices:

- **`packages/shared/src/precios.ts`** — Zod schemas + DTO types (single source
  of truth for Lambda + Angular). Export from `index.ts`. Add `precios: [1]`
  (Administrador) to `MODULE_ROLES` in `packages/shared/src/authz.ts`.
- **`lambdas/precios/`** — Hono app: `index.ts` (thin handler: opens DB pool,
  extracts `custom:id_usuario` from the ID token), `app.ts` (router mounted at
  `/api`), `service.ts` (pricing + persistence), `authz.ts` (`requireModule`),
  `errors.ts`, `types.ts`, plus `tests/`.
- **`infra/api.ts`** — register every route below (explicit routes; a missing
  one surfaces as a browser CORS 404).
- **`apps/frontend/src/app/features/precios/`** — `precios-store.ts`,
  `precios-api.service.ts`, `precios-logic.ts` (pure pricing calc),
  `precios-page.component.ts`, `precio-producto-drawer.component.ts`. Route
  guarded by `moduleGuard('precios')`, added to nav.

## 2. Endpoints (under `/api`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/listas-precio` | List active price lists |
| POST | `/listas-precio` | Create `{ nombre }` |
| PATCH | `/listas-precio/:id` | Rename |
| DELETE | `/listas-precio/:id` | Inactivate (`id_estado=0`) |
| GET | `/listas-precio/:id/productos` | Grid rows (all active products LEFT JOIN precio_producto, computed) |
| PATCH | `/listas-precio/:id/productos/:idProducto` | Upsert one product's pricing (drawer save) |
| POST | `/listas-precio/:id/productos/bulk` | Bulk `{ action, valor, idProductos[] }` |

Bulk `action` ∈ `setPrecioNeto` | `setMaxDesc` | `clearMaxDesc`. Tramos are not
part of bulk (drawer-only).

## 3. Pricing computation

Server is the source of truth; `precios-logic.ts` mirrors it for live drawer
preview.

- `impuestos%` = `iva` (`99_p_iva.iva`) + (`producto.impuesto > 0`
  ? `99_p_impuesto.valor` for that id : `0`).
- `precioBase` = `precioNeto + round(precioNeto * impuestos / 100)`.
- `porcen_desc` is never read or written.
- **Precio Venta = up to 4 `{ precio, margen }` values:**
  - V1 (qty below tramo1): `precioBase × (1 − maxPorcenDesc/100)`.
  - V2 / V3 / V4: `precioBase × (1 − maxPorcenTramoN/100)` — included only when
    `cantTramoN > 0`.
  - If no tramo is set (all `cantTramoN = 0`) → only V1 is shown.
  - `margen` for a value = `(precioNeto × (1 − desc/100) / costoProm − 1) × 100`;
    when `costoProm = 0` → margin is “—”.
- **Under-cost flag (red row):** cost ≥ the *lowest* displayed sell price
  (deepest discount tier). Tightens legacy's base-only check so any tier that
  dips below cost is flagged.

## 4. Frontend UX

```
┌ Precios ─────────────────────────────────────────────────────┐
│ Lista: [ Mayoristas ▾ ]  [+ Nueva]  ✎ ⌫                        │
├───────────────────────────────────────────────────────────────┤
│ ☐  N   Producto     Costo   Neto   Base  Máx%  Margen  Precio Venta        │
│ ☐ 102  Aceite 1L    $900   $1.000 $1.190  10%   +11%   1+   $1.071 (+7%)   │
│                                                          ≥10  $1.011 (+1%)  │
│                                                          ≥50  $  952 (−5%)🔴│
│ ☑ 103  Harina 5k    ...                                                     │
├── bulk bar (when rows checked) ───────────────────────────────┤
│ [Precio Neto ▾][ valor ][Aplicar a N]   Set Máx% · Borrar Máx% │
└───────────────────────────────────────────────────────────────┘
```

- **Row click → right drawer:** edit Precio Neto, Máx % Desc, and 3 tramo rows
  (qty + max %). Precio Base and the 4 Precio Venta values + margins recompute
  live as the user types. Save = PATCH.
- **Bulk bar** (checkbox select): Set Precio Neto / Set Máx % Desc / Borrar Máx %
  across checked rows — the legacy actions preserved. Tramos are drawer-only.
- **Validation (shared Zod):** `precioNeto ≥ 0` int; percentages 0–100 int;
  tramo qty strictly ascending when set (t1 < t2 < t3) — hard rule; deeper-tier %
  ≥ shallower-tier % — soft warning, not blocked.

## 5. Testing

- **shared:** `precios.spec.ts` — schema validation (tramo ordering, ranges).
- **lambda:** `service.test.ts` — impuestos / precioBase, 4-value + margins,
  tramo gating, bulk actions, list CRUD, authz 403; `app.test.ts` — routes.
  (Needs local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d
  --wait`.)
- **frontend:** `precios-logic.spec.ts` — pure calc parity with backend numbers.

## Out of scope

- No changes to `legacy-php`.
- No DB schema migration.
- No Recargo action (already disabled/commented in legacy).
