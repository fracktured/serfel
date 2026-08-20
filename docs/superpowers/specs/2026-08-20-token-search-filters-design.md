# Token search across text filters — design

**Date:** 2026-08-20
**Status:** Approved (design)
**Scope:** serfel 2.0 frontend (all maintainers), clientes Lambda, legacy Angular 14 crear-pedido

## Problem

Free-text filters across the app use plain single-string substring matching
(`text.toUpperCase().includes(query)`), which forces the user to type words in
the exact order they appear in the data. Searching `"lonco 200g queso"` fails to
find `"QUESO LONCO 200g"`.

The productos maintainer already solved this with a **token matcher**
(`normalizeSearch` + `matchesAllTokens` in `productos-logic.ts:27-44`): normalize
the text (lowercase, strip accents via NFD, punctuation → space), split the query
into tokens, and require every token to appear as a substring in any order. The
same logic is copy-pasted into `usuarios-logic.ts` and a variant in
`prefacturacion-logic.ts`, and is missing entirely from several other filters.

Goal: make token search the single, shared behavior for every free-text name /
search filter in serfel 2.0, and bring the same behavior to the legacy
crear-pedido product search.

## Semantics (the contract)

- **Normalize:** `NFD` accent strip, `toLowerCase()`, non-alphanumeric run →
  single space, trim. `"YOG.BATIDO SOPR 165grs"` → `"yog batido sopr 165grs"`.
- **Match:** query is normalized and split on spaces into tokens; text matches
  iff **every** token is a substring of the normalized text. Order-independent.
- **Empty query** (no tokens after normalize) matches everything.
- Single-token queries behave **identically** to the old substring match, so this
  is a strict superset of current behavior — low risk.
- **Numeric fields are out of scope:** `codigo`, `codSerfel`, `rut` keep their
  existing digit-substring matching. Token matching applies only to free-text
  name/description fields.

## 1. Shared frontend util

New file `apps/frontend/src/app/shared/text-search.ts`:

```ts
export function normalizeSearch(text: string): string;
export function matchesAllTokens(text: string, query: string): boolean;
```

This is the canonical implementation, lifted verbatim from the current productos
copy. It is a pure UI-search concern — no Lambda consumes it — so it lives in the
frontend, not `@serfel/shared` (which is scoped to DTOs / Zod). Legacy cannot
import from the workspace, so it gets its own copy (section 4).

## 2. Client-side maintainers (in-memory filter)

Every maintainer below filters an already-loaded array. Each imports the shared
util and drops any private copy.

| Maintainer | Today | Change |
|---|---|---|
| **productos** | `nombre`/`quick` tokenized (private copy) | Import shared util; delete local `normalizeSearch`/`matchesAllTokens`. `codigo` unchanged. |
| **usuarios** | `nombre`/`quick` tokenized (private copy) | Import shared util; delete local copy. `rut` unchanged. |
| **prefacturacion** | `quick` tokenized (private `normalize` variant) | Import shared util; delete local copy. |
| **marcas** | plain `.includes()` on `nomMarca` / quick | `nombre` + `quick` → `matchesAllTokens`. |
| **precios** | plain `.includes()` on `"codSerfel nomProducto"` | Name portion → `matchesAllTokens`; keep `codSerfel` numeric contains. |
| **listado-carga** | plain `.includes()` on `nomRuta` | → `matchesAllTokens`. |

No behavior change to numeric fields, sorting, pagination, or CSV export.

## 3. Clientes (server-side SQL)

Clientes is the only serfel 2.0 maintainer that filters in SQL. Out-of-order
token search in SQL works because **AND is order-independent**: split the query
into tokens and AND one `LIKE '%token%'` per token (each token may match any of
several columns via `OR`). `razonSocial` already does this
(`clientes/service.ts:122-124`).

**Only change:** `direccion` (currently a single `LIKE '%...%'`,
`service.ts:127-128`) gets the same per-token treatment `razonSocial` has. `rut`
stays numeric.

Known limitations (accepted, not solved here):

- **Accents/punctuation:** SQL `LIKE` relies on column collation
  (`utf8mb4_*_ci` is accent-insensitive, so `queso` ≈ `quéso`), but literal
  punctuation in the data is not collapsed to spaces the way the JS util does.
  Acceptable for names/addresses; full parity would need normalize-on-write.
- **Performance:** leading-wildcard `LIKE '%tok%'` cannot use a B-tree index and
  scans. Fine at current row counts (clientes already does it); a FULLTEXT index
  would be the fix if the table grew large.

## 4. Legacy Angular 14 — crear-pedido

Legacy is outside the pnpm workspace (separate Node 16 build) and cannot import
the frontend util or `@serfel/shared`, so it gets a **standalone copy**.

- New file `apps/legacy-frontend/src/app/utils/text-search.ts` with the same
  `normalizeSearch` / `matchesAllTokens` (plain TS, no Angular deps), so
  `modal-productos` can reuse it later.
- `crear-pedido.component.ts:190-193` `buscarProducto()`: replace
  `item.nomProducto.toUpperCase().includes(this.nombreProducto)` with
  `matchesAllTokens(item.nomProducto, this.nombreProducto)`. The
  `filtroBusqueda` passed to the modal keeps the raw typed query.

Result: `"lonco 200g queso"` finds `"QUESO LONCO 200g"` on the legacy order
screen.

## Testing

- **Shared util** (`text-search.spec.ts`): accents, punctuation → space,
  out-of-order tokens, single-token == old substring, empty query matches all.
- **Each maintainer `*-logic.spec.ts`:** assert token behavior on the
  newly-tokenized fields; existing productos/usuarios/prefacturacion specs keep
  passing against the shared function.
- **Clientes `service.test.ts`:** add an out-of-order `direccion` case
  (requires local MariaDB per project test setup).
- **Legacy:** focused unit test on the extracted util (legacy test harness
  permitting; if not wired, verify manually in the crear-pedido screen).

## Out of scope

- Numeric-field tokenization (`codigo`, `codSerfel`, `rut`).
- SQL accent/punctuation normalization parity (normalize-on-write, FULLTEXT).
- Ranking / relevance ordering — matching stays boolean.
- Any UI/markup changes to the filter inputs.

## File touch list

- `apps/frontend/src/app/shared/text-search.ts` (new)
- `apps/frontend/src/app/shared/text-search.spec.ts` (new)
- `apps/frontend/src/app/features/productos/productos-logic.ts` (+ spec)
- `apps/frontend/src/app/features/usuarios/usuarios-logic.ts` (+ spec)
- `apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.ts` (+ spec)
- `apps/frontend/src/app/features/marcas/marcas-logic.ts` (+ spec)
- `apps/frontend/src/app/features/precios/precios-store.ts`
- `apps/frontend/src/app/features/listado-carga/listado-carga-store.ts`
- `lambdas/clientes/service.ts` (+ `tests/service.test.ts`)
- `apps/legacy-frontend/src/app/utils/text-search.ts` (new)
- `apps/legacy-frontend/src/app/pages/pedidos/crear-pedido/crear-pedido.component.ts`
