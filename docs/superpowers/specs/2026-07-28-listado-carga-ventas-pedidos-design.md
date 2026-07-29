# Listado Carga: Ventas / Pedidos toggle

**Date:** 2026-07-28
**Status:** Approved

## Problem

The Listado Carga feature (`apps/frontend/src/app/features/listado-carga` +
`lambdas/rutas`) generates a cargo-list PDF for a distributor's selected
routes. Today it only reports on **Ventas**. We need a radio selector so the
user can choose between **Ventas** and **Pedidos**, producing the same report
against a different data source.

- **Ventas** (current, default): queries against `t40MVenta` /
  `t40MProductoVenta`, filtered `entregado = 0 AND idEstado = 3`.
- **Pedidos** (new): the same report against `t30MPedido` /
  `t30MProductoPedido`, filtered `t30MPedido.idEstado = 1`.

The report structure, PDF layout, ordering, subtotal formula, and the
last-char truncation quirk stay identical. Only source tables and filters
change.

## Decisions

- **Porciones ("Obs" column) for Pedidos:** always empty. `t20MPorcion` links
  to a sale only via `idVenta`; there is no pedido link in the schema, so the
  porciones query is skipped for Pedidos and every row's `obs` is `[]`.
- **Request contract:** add a `tipo` field to the cargoList POST body (not a
  separate endpoint).
- **PDF footer label:** keep `Cantidad Facturas: N` identical for both Ventas
  and Pedidos (no conditional wording).

## Design

### 1. Shared contract — `packages/shared/src/rutas.ts`

The cargoList body is currently the ruta array itself (`RutaSelectionSchema`).
Wrap it so the body carries both the tipo and the rutas:

```ts
export const CargoTipoSchema = z.enum(["ventas", "pedidos"]);
export type CargoTipo = z.infer<typeof CargoTipoSchema>;

export const CargoListRequestSchema = z.object({
  tipo: CargoTipoSchema.default("ventas"),
  rutas: RutaSelectionSchema,
});
export type CargoListRequest = z.infer<typeof CargoListRequestSchema>;
```

`RutaSelection` / `RutaSelectionSchema` are unchanged and still used internally
by the service. `default("ventas")` provides a safe fallback, though the
frontend always sends `tipo`.

### 2. Backend — `lambdas/rutas/service.ts` + `app.ts`

- `getCargoListData(db, rutas, tipo)` gains a `tipo: CargoTipo` parameter.
- Branch the three fetch helpers on source. Preferred shape: split into
  source-specific helpers (`fetchDetailVenta` / `fetchDetailPedido`, and the
  totals equivalents) so each Drizzle query stays readable, with
  `getCargoListData` selecting by `tipo`.

  - **Ventas** (unchanged):
    - detail: `t40MProductoVenta` → `t40MVenta` (`entregado=0 AND idEstado=3`)
      → `t40MRutaLocalCliente`
    - totals: `COUNT(idVenta)` as numFacturas, `SUM(precioTotal)`
    - porciones: `t20MPorcion` joined via `idVenta`
  - **Pedidos** (new):
    - detail: `t30MProductoPedido` → `t30MPedido` (`idEstado=1`) →
      `t40MRutaLocalCliente` (join on `idLocalCliente`)
    - totals: `COUNT(idPedido)` as numFacturas, `SUM(precioTotal)`, filtered
      `idEstado=1`
    - porciones: **skipped**; every `obs = []`

- Add an internal constant `ESTADO_PEDIDO_VIGENTE = 1`.
- `t30MProductoPedido` has the same `cantidad` / `precio` / `porcenDesc`
  columns, so the subtotal expression
  `cantidad * (precio - precio * porcenDesc / 100)` and the `truncateLastChar`
  quirk are reused verbatim. `assembleCargoList` is unchanged.
- `app.ts` parses `CargoListRequestSchema` instead of `RutaSelectionSchema` and
  calls `getCargoListData(db, parsed.data.rutas, parsed.data.tipo)`.

### 3. Frontend — `listado-carga` feature

- **Store** (`listado-carga-store.ts`): add `tipo = signal<CargoTipo>("ventas")`
  and a setter; `generatePdf()` passes `this.tipo()` to the API.
- **API service** (`listado-carga-api.service.ts`): `cargoList(sel, tipo)`
  posts `{ tipo, rutas: sel }` (still `responseType: "blob"`).
- **Component** (`listado-carga-page.component.ts`): two radio buttons
  ("Ventas" / "Pedidos") above the rutas card, bound to `store.tipo`, styled to
  match existing controls. Default selection is Ventas.

### 4. Tests

- `lambdas/rutas/tests/service.test.ts`: add a Pedidos case asserting the
  queries hit the pedido tables with `idEstado=1` and that `obs` is always
  empty; keep existing Ventas cases green.
- `lambdas/rutas/tests/app.test.ts`: cargoList accepts the new body shape
  (`{ tipo, rutas }`) and rejects an invalid `tipo`.
- Frontend `listado-carga-logic.spec.ts`: unchanged — selection logic is
  untouched; the radio is pure UI state.

## Out of scope

- No PDF layout / wording changes.
- No changes to route selection logic or the `/routes` listing endpoint.
- No new porciones link for pedidos (none exists in the schema).
