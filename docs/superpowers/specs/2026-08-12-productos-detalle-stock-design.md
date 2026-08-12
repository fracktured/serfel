# Producto Detalle + Stock modal ("$") — Design

**Date:** 2026-08-12
**Domain:** productos (frontend maintainer + `products` lambda)
**Status:** Approved, ready for implementation plan

## Summary

Add a new per-row **"$"** action button to the products maintainer table. It opens
a modal (styled like the existing edit modal) that shows the detailed product
information currently rendered by the legacy page
`legacy-php/Distribuidor/Productos/consultaProductos`, re-laid-out in the new UI.
The modal also lets an administrator modify the product's stock (the legacy
`btnModCantidad` flow), and every stock change is recorded in a new audit table.

**Excluded from the detail** (per request): *IVA Costo* and *IVA Precio Venta*.

## Decisions

- **Stock edit semantics:** absolute-set — the user types the new total quantity,
  which replaces current stock. Identical to legacy `btnModCantidad`.
- **Permissions:** admin-only. The `productos` module is already gated to
  `id_tipo_usuario = 1` (Administrador) via `MODULE_ROLES.productos = [1]`, so the
  entire maintainer — and therefore this modal and its stock write — is already
  admin-only. No extra per-user checks and no conditional button-hiding are needed;
  the server-side `requireModule('productos')` gate enforces it.
- **Audit:** every stock change writes one row to a new `50_m_stock_log` table in
  the same transaction as the stock write.

## Data model (read side)

All source tables already exist in `packages/db/src/schema.ts`. The detail mirrors
the legacy read model assembled by `obtInfoProducto.php` + `PrecioProducto`,
`Recepcion`, `Venta`, `TipoProducto`:

- **Base product + joins:** `20_m_producto` → `20_p_marca`, `20_p_unidad_medida`,
  `20_p_tipo_producto`; **plus a self-join** on `20_p_tipo_producto` via `nivel_1`
  for **Tipo Producto Padre** (`nombreFamilia` in legacy).
- **Costo / fecha:** `costo_prom`, `ult_fecha_compra` from `20_m_producto`.
- **Cantidad Stock:** `SUM(50_m_stock.cantidad)` for the product across all bodegas
  (COALESCE 0), matching legacy.
- **Precio Neto Venta:** `40_m_precio_producto.precio_neto` where
  `id_lista_precio = 1` (COALESCE 0 if no price row).
- **IVA rate:** single row in `99_p_iva`.
- **Impuesto adicional rate:** `99_p_impuesto.valor` when `producto.impuesto > 0`
  (impuesto id 1 = IABA, 2 = HARINA).
- **Proveedor última compra:** rut + razón social via the max recepcion for the
  product: `MAX(id_recepcion)` from `50_m_producto_recepcion` →
  `50_m_recepcion_compra` → `70_m_proveedor`. Null-safe when never purchased.

### Computed fields (returned by the API, computed server-side)

Following legacy formulas in `obtInfoProducto.php` / `PrecioProducto`:

- `costoConIva = round(costo_prom * (1 + iva/100))`
- `costoTotalStock = cantidad_stock * costo_prom`
- `valorMargen = precio_neto - costo_prom`
- `porcenMargen = precio_neto > 0 ? (valorMargen / precio_neto) * 100 : 0`
- `precioBase = precio_neto + iva_monto (+ impAdic_monto when impuesto>0)`, then
  `precioVentaCliente = precioBase * (1 - porcen_desc/100)` — mirrors
  `PrecioProducto`'s `precio_venta` derivation (porcen_desc from
  `40_m_precio_producto`).
- `impuestoAdicional` (optional): `{ nombre, porcentaje, monto }` where
  `monto = precio_neto * porcentaje / 100`; present only when
  `producto.impuesto > 0`.

The DTO carries **raw numbers**, not pre-formatted strings — the Angular side
formats (Chilean peso / quantity), consistent with how DTOs work elsewhere in the
app. IVA Costo and IVA Precio Venta are intentionally not included.

## Audit table: `50_m_stock_log`

New table added to `packages/db/src/schema.ts`; a versioned migration is generated
via `pnpm --filter @serfel/db generate`. Brand-new empty table with no FK-parent
ALTER, so it does not hit the `errno 1834` autoincrement gotcha. Deploy note: run
`sst deploy` **before** `db:migrate` so the migrate Lambda bundles the new
migration.

| Column | Type | Notes |
|---|---|---|
| `id_stock_log` | `int` PK, autoincrement | surrogate key |
| `id_bodega` | `int` NOT NULL, FK → `50_m_bodega` | always 1 (central) today; future-proofs multi-bodega analysis |
| `id_producto` | `int` NOT NULL, FK → `20_m_producto` | which product |
| `cantidad_antes` | `decimal(18,3)` **nullable** | prior stock; **NULL = no stock row existed** (first-ever set), distinct from "was 0" |
| `cantidad_nueva` | `decimal(18,3)` NOT NULL | value written |
| `diferencia` | `decimal(18,3)` NOT NULL | `cantidad_nueva - COALESCE(cantidad_antes, 0)`, stored (not derived) for easy SUM/filter of increases vs decreases |
| `fecha` | `datetime` NOT NULL | when the change happened |
| `id_usuario` | `int` NOT NULL, FK → `10_m_usuario` | who made it |

`decimal(18,3)` matches `50_m_stock.cantidad`.

## API surface (`products` lambda)

Both routes mounted under the existing `requireModule('productos')` middleware.

### `GET /products/:id/detalle` → `ProductoDetalleDto`

Service fn `getProductoDetalle(db, idProducto)`:
- 404 (`PRODUCTO_NO_ENCONTRADO`) if the product does not exist.
- Assembles the read model above with Drizzle queries (base + self-join, stock sum,
  price, iva/impuesto rates, proveedor última compra) and returns computed fields.

### `PUT /products/:id/stock` → `ProductoDetalleDto`

Body validated by new `StockInputSchema` (`cantidad`: nonnegative number, up to 3
decimals). Service fn `setStock(db, idProducto, cantidad, idUsuario)`, all in one
transaction:
1. 404 if product missing.
2. Read current `50_m_stock` row (id_bodega = 1) → capture `cantidad_antes`
   (NULL if no row).
3. UPSERT `50_m_stock` (id_bodega = 1) — update if the row exists, insert
   otherwise (mirrors `StockDOM::modStock`).
4. Insert one `50_m_stock_log` row: before / after / `diferencia`, `fecha = now`,
   `id_usuario` from the JWT claim.
5. Return the refreshed `getProductoDetalle`.

Atomic: either both the stock write and the log land, or neither.

`id_usuario` comes from `custom:id_usuario` on the Cognito ID token, the same claim
the handler already extracts as `idUsuario`.

## Shared (`packages/shared/src/productos.ts`)

- `ProductoDetalleDto` interface (raw numeric fields + optional `impuestoAdicional`
  + optional `proveedorUltCompra { rut, razonSocial }`).
- `StockInputSchema` (Zod) + `StockInput` type.
- Reuse existing `PRODUCTO_NO_ENCONTRADO` error code.

## Frontend (`apps/frontend/src/app/features/productos/`)

- **`productos-api.service.ts`:** add `detalle(id)` (GET) and
  `setStock(id, cantidad)` (PUT).
- **New `product-detail-modal.component.ts`:** same visual language as
  `product-modal` (`.modal-bg / .modal / .modal-head / .modal-footer`), but a
  **read-only info layout** (labeled field grid / cards, not the legacy `<table>`).
  Takes `idProducto` as input, fetches detail on init with a loading state. The
  **Cantidad Stock** field has an inline "Modificar" affordance (page is admin-only,
  so always shown) that reveals a numeric input + a confirm step; saving calls
  `setStock`, shows a toast, and re-renders with the returned detail.
- **`productos-page.component.ts`:** add a **"$"** action button in each row's
  actions cell (alongside Editar / Eliminar) that opens the detail modal for that
  product.
- **`productos-logic.ts`:** small money / quantity format helpers (Chilean peso,
  matching legacy `getFormatoDinero` / `getCantConPuntosYDecimales`).

## Tests

- **Lambda `service.test.ts`:** `getProductoDetalle` — impuesto branches
  (IABA / HARINA / none), no-price → 0, no-stock → 0, no-purchase → null proveedor,
  margin math. `setStock` — insert path (`cantidad_antes` NULL, log written), update
  path (correct before/after/diferencia, log written), 404.
- **Lambda `app.test.ts`:** both routes happy-path + `StockInput` validation.
- **Frontend `productos-logic.spec.ts`:** format helpers.

Lambda/DB tests need the local MariaDB
(`docker compose -f packages/db/docker-compose.yml up -d --wait`) and build the DB
via `migrateSchemaOnly`.

## Out of scope

- Stock movement beyond the audit log (no reversal UI, no per-bodega breakdown).
- Viewing stock history in the modal (would be a follow-up read endpoint over
  `50_m_stock_log`).
- Price editing, barcode lookup, IVA Costo / IVA Precio Venta fields.
