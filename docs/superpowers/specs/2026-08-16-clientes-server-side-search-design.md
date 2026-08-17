# Clientes maintainer — server-side search

**Date:** 2026-08-16
**Status:** Design approved, pending implementation plan

## Problem

The clientes maintainer loads **all** clients of the selected estado (up to ~6k
rows) via `GET /clientes?estado=…`, plus three aggregate queries for the derived
columns (rutas/días, últ. factura, últ. nota crédito). The Angular page holds the
full list and filters it **client-side** by RUT, Razón Social, Lista de Precio,
and a navbar quick-search.

We want to stop pulling the whole table. Filtering moves **server-side**, keyed on
**RUT**, **Razón Social**, and **Dirección**. Nothing loads until the user searches.
The only path that returns everything is an explicit search with all filters empty.

## Decisions

- **Filter set:** RUT, Razón Social, Dirección. Keep the **Estado**
  (activos/inactivos/todos) selector as the search scope. **Drop** the Lista de
  Precio filter.
- **Dirección scope:** match the client's own `direccion_cliente` **OR** any of
  its locales' `direccion_local_cliente`.
- **Trigger:** explicit **Buscar** button + Enter on any filter input. Empty-all
  filters + Buscar prompts a `confirm()` before pulling ~6k.
- **Stat cards:** scoped to the current result set (no full-table stats).
- **Navbar quick-search:** removed.
- **Sort + pagination + CSV:** stay **client-side** over the returned result set.
  Only *filtering* moves server-side. A normal search returns few rows; the
  "empty = all 6k" case is exactly what the page already paginates in-browser
  today, so no regression. Full server-side sort/paging/count is unnecessary for
  6k rows.

## Backend

### Endpoint

`GET /clientes` gains three optional text query params alongside the existing
`estado`: `rut`, `razonSocial`, `direccion`. All provided filters are **ANDed**.
No new API Gateway route is needed (the `GET /clientes` route already exists).

### Validation / normalization

New `ClienteSearchSchema` in `@serfel/shared`, reused by the Lambda query parser
and the Angular API service:

- `rut` — trimmed, dots stripped, kept as a digit string (optional).
- `razonSocial` — trimmed (optional).
- `direccion` — trimmed (optional).
- `estado` — existing `EstadoFilterSchema`.

Empty/absent text fields are omitted, not matched.

### Matching semantics (SQL, mirroring current client-side logic)

- **rut** → `CAST(rut_cliente AS CHAR) LIKE '%<digits>%'` (dots/DV stripped from
  input).
- **razonSocial** → split into whitespace tokens; each token ANDed as
  `(razon_social LIKE '%tok%' OR nom_fantasia LIKE '%tok%')`. Preserves
  multi-word matching ("juan perez").
- **direccion** → `direccion_cliente LIKE '%q%'` **OR**
  `EXISTS (SELECT 1 FROM t10_m_local_cliente lc
   WHERE lc.rut_cliente = c.rut_cliente AND lc.direccion_local_cliente LIKE '%q%')`.

Relies on the table's case/accent-insensitive collation for folding (same as the
existing behavior expectations). Accent- and case-insensitivity are now delegated
entirely to the MariaDB column collation; the client-side path previously
normalized diacritics itself, so this is a deliberate assumption, not an
oversight.

### Derived-column aggregates

When **any** text filter is present, scope the three aggregate queries (días,
últ. factura, últ. nota crédito) to the matched ruts via `inArray(rut, matchedRuts)`
(skip entirely if the matched set is empty). When the search is empty (the "all"
case) they run **unbounded exactly as today** — the heavy path is unchanged.

### Service shape

`listClientes(db, estado)` becomes `searchClientes(db, params)` where `params`
carries `estado` + the optional text filters. It builds the filtered base query,
collects matched ruts, then runs the (optionally rut-scoped) aggregates and maps
to `ClienteDto[]` as today.

## Frontend

### Store (`clientes-store.ts`)

- `Filters` → `{ rut: string; razonSocial: string; direccion: string }` (drop
  `idListaPrecio`, `quick`).
- `clientes` signal holds the **last search result** (empty until first search).
- New `hasSearched` signal (default `false`) drives empty-state copy.
- `search()` → calls `api.search(filters, estado)`, sets `clientes`, sets
  `hasSearched = true`, resets `page` to 1.
- Empty-all-filters + `search()` → `confirm("Esto cargará todos los clientes
  (~6k). ¿Continuar?")` before firing.
- `setEstado()` re-runs `search()` only when `hasSearched` is already true;
  otherwise it just pre-selects the scope.
- `filtered = sortRows(clientes(), sort())` — no `applyFilters`.
- `paged`, `stats` unchanged in shape, now over the result set.
- `ngOnInit`/`load()`: fetch **lookups only** (for the modal); do not fetch
  clientes.
- After create/update/activate/deactivate: re-run `search()` (not `load()`).

### Page component (`clientes-page.component.ts`)

- Filter bar: RUT, Razón Social, Dirección inputs + **Buscar** button + existing
  **Limpiar**; Estado selector stays. Lista de Precio `<select>` removed.
  `(keyup.enter)` on each input triggers `search()`.
- Remove the navbar `header-search` block.
- Stat cards keep markup, read scoped values: "Clientes" = result count;
  "Filtrados" neutralized/collapsed (equals result count). CSV export unchanged
  (`filtered()`).
- Empty states: before any search → "Ingresa un criterio y presiona Buscar";
  after a search with no hits → "No se encontraron clientes".

### Logic (`clientes-logic.ts`)

- Delete `applyFilters`; drop `quick`/`idListaPrecio` from `Filters`.
- Keep `sortRows`, `paginate`, `toCsv`, `computeStats` (stats adjusted for the
  scoped meaning).

## Testing

- **Lambda service tests:** search by rut substring, by razón social multi-token,
  by direccion matching a local (not the client's own), by direccion matching the
  client, combined filters (AND), empty filters returns all, estado scoping,
  aggregate scoping to matched ruts.
- **Lambda app tests:** query param validation, `GET /clientes` with each filter.
- **Frontend logic spec:** `sortRows`/`paginate`/`computeStats` over result sets
  (with `applyFilters` removed).
- **Store:** search flow, empty-confirm path, estado re-search gate.

## Out of scope

- Server-side sorting, pagination, and total-count.
- Full-text indexing / search infrastructure.
- Any change to the create/edit modal or locales sub-maintainer.
