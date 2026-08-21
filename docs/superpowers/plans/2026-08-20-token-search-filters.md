# Token Search Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make out-of-order token search the shared behavior for every free-text name/search filter in serfel 2.0 and in the legacy Angular 14 crear-pedido product search.

**Architecture:** Extract the canonical token matcher (`normalizeSearch` + `matchesAllTokens`) into one frontend util that every in-memory maintainer imports, replacing three copy-pasted variants and several plain-substring filters. The clientes maintainer filters server-side, so its `direccion` gets the same per-token `LIKE` pattern `razonSocial` already uses. Legacy is outside the workspace and gets a standalone copy.

**Tech Stack:** Angular 20 + signals (frontend), Vitest (frontend/lambda tests), Drizzle ORM + MariaDB (clientes Lambda), Angular 14 + Jasmine/Karma (legacy).

## Global Constraints

- Token semantics (exact): normalize = `text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()`; match = every whitespace-split token of the normalized query is a substring of the normalized text; empty query matches all. Copy this verbatim — do not "improve" it.
- Numeric fields are OUT of scope and must not change: `codigo`, `codSerfel`, `rut` keep their existing digit-substring matching.
- No UI/markup changes to filter inputs.
- Frontend single-file test: `pnpm --filter @serfel/frontend exec vitest run <path>`.
- Lambda tests need MariaDB first: `docker compose -f packages/db/docker-compose.yml up -d --wait`, then `pnpm --filter @serfel/lambdas exec vitest run <path>`.
- Legacy build/test uses Node 16 (`export NODE_OPTIONS=--openssl-legacy-provider`); it cannot import from the pnpm workspace.
- Commit messages end with the project's `Co-Authored-By` trailer. Work happens on branch `feature/token-search-filters` (already created).

---

### Task 1: Shared frontend token-search util

**Files:**
- Create: `apps/frontend/src/app/shared/text-search.ts`
- Test: `apps/frontend/src/app/shared/text-search.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function normalizeSearch(text: string): string`
  - `export function matchesAllTokens(text: string, query: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// apps/frontend/src/app/shared/text-search.spec.ts
import { describe, it, expect } from "vitest";
import { normalizeSearch, matchesAllTokens } from "./text-search";

describe("normalizeSearch", () => {
  it("lowercases, strips accents, collapses punctuation to spaces", () => {
    expect(normalizeSearch("YOG.BATIDO SOPR 165grs")).toBe("yog batido sopr 165grs");
    expect(normalizeSearch("Quéso Loncoleche")).toBe("queso loncoleche");
  });
});

describe("matchesAllTokens", () => {
  it("matches tokens in any order", () => {
    expect(matchesAllTokens("QUESO LONCO 200g", "lonco 200g queso")).toBe(true);
  });
  it("requires every token to be present", () => {
    expect(matchesAllTokens("QUESO LONCO", "queso nestle")).toBe(false);
  });
  it("single token behaves like substring match", () => {
    expect(matchesAllTokens("YOG.BATIDO", "batido")).toBe(true);
  });
  it("empty query matches everything", () => {
    expect(matchesAllTokens("anything", "")).toBe(true);
    expect(matchesAllTokens("anything", "   ")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/shared/text-search.spec.ts`
Expected: FAIL — cannot resolve `./text-search`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/app/shared/text-search.ts

/**
 * Normaliza texto para búsqueda: minúsculas, sin tildes, puntuación → espacio.
 * Así "YOG.BATIDO SOPR 165grs" se compara como "yog batido sopr 165grs".
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * true si cada palabra de la consulta aparece como substring en el texto,
 * en cualquier orden (ej. "yog bat 165" matchea "YOG.BATIDO SOPR 165grs").
 */
export function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/shared/text-search.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/shared/text-search.ts apps/frontend/src/app/shared/text-search.spec.ts
git commit -m "feat(search): shared token-search util for frontend filters

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: productos — use shared util, delete local copy

**Files:**
- Modify: `apps/frontend/src/app/features/productos/productos-logic.ts:23-44` (remove local `normalizeSearch`/`matchesAllTokens`, add import)
- Test: `apps/frontend/src/app/features/productos/productos-logic.spec.ts` (existing — must still pass)

**Interfaces:**
- Consumes: `matchesAllTokens` from `../../shared/text-search`.
- Produces: unchanged public API (`applyFilters`, etc.).

- [ ] **Step 1: Run existing spec to confirm green baseline**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/productos/productos-logic.spec.ts`
Expected: PASS.

- [ ] **Step 2: Replace the local helpers with the shared import**

In `productos-logic.ts`, change the top import line from:

```ts
import { ESTADO_ACTIVO, type ProductoDto } from "@serfel/shared";
```

to:

```ts
import { ESTADO_ACTIVO, type ProductoDto } from "@serfel/shared";
import { matchesAllTokens } from "../../shared/text-search";
```

Then delete the entire local block (the two JSDoc comments plus `normalizeSearch` and `matchesAllTokens`, lines 23-44). Leave `applyFilters` and everything below unchanged — it already calls `matchesAllTokens`.

- [ ] **Step 3: Run the spec to verify unchanged behavior**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/productos/productos-logic.spec.ts`
Expected: PASS (no behavior change; the function moved).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/productos/productos-logic.ts
git commit -m "refactor(productos): use shared token-search util

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: usuarios — use shared util, delete local copy

**Files:**
- Modify: `apps/frontend/src/app/features/usuarios/usuarios-logic.ts:13-19` (remove local helpers, add import)
- Test: `apps/frontend/src/app/features/usuarios/usuarios-logic.spec.ts` (existing — must still pass)

**Interfaces:**
- Consumes: `matchesAllTokens` from `../../shared/text-search`.
- Produces: unchanged public API.

- [ ] **Step 1: Run existing spec to confirm green baseline**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/usuarios/usuarios-logic.spec.ts`
Expected: PASS.

- [ ] **Step 2: Replace the local helpers with the shared import**

In `usuarios-logic.ts`, change:

```ts
import { ESTADO_ACTIVO, type UsuarioDto } from "@serfel/shared";
```

to:

```ts
import { ESTADO_ACTIVO, type UsuarioDto } from "@serfel/shared";
import { matchesAllTokens } from "../../shared/text-search";
```

Then delete the local `normalizeSearch` and `matchesAllTokens` functions (lines 13-19). `applyFilters` already calls `matchesAllTokens` and stays unchanged.

- [ ] **Step 3: Run the spec to verify unchanged behavior**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/usuarios/usuarios-logic.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/usuarios/usuarios-logic.ts
git commit -m "refactor(usuarios): use shared token-search util

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: prefacturacion — use shared util

**Files:**
- Modify: `apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.ts:10-21`
- Test: `apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts` if present; otherwise add a focused spec (see Step 1).

**Interfaces:**
- Consumes: `normalizeSearch` from `../../shared/text-search`.
- Produces: unchanged `applyFilter(rows, query)` signature.

Note: this file uses `normalize` + inline token loop over a concatenated haystack (multi-field). Keep that shape — only swap the private `normalize` for the shared `normalizeSearch` so the accent/punctuation rule is identical everywhere.

- [ ] **Step 1: Write/confirm the failing test**

If `prefacturacion-logic.spec.ts` does not exist, create it:

```ts
// apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts
import { describe, it, expect } from "vitest";
import type { PedidoPendienteDto } from "@serfel/shared";
import { applyFilter } from "./prefacturacion-logic";

function row(over: Partial<PedidoPendienteDto>): PedidoPendienteDto {
  return {
    idPedido: 1, fecha: "2026-08-20", rutCliente: "12345678-9",
    nomFantasia: "ALMACEN LONCO", nomLocal: "SUCURSAL CENTRO",
    contacto: "Juan Pérez", vendedor: "Ana", precioTotal: 1000,
  } as PedidoPendienteDto;
}

describe("applyFilter", () => {
  const rows = [row({}), row({ idPedido: 2, nomFantasia: "OTRO" })];
  it("matches tokens in any order across fields", () => {
    expect(applyFilter(rows, "lonco juan")).toHaveLength(1);
  });
  it("is accent-insensitive", () => {
    expect(applyFilter(rows, "perez")).toHaveLength(1);
  });
  it("empty query returns all", () => {
    expect(applyFilter(rows, "")).toHaveLength(2);
  });
});
```

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts`
Expected: PASS already for existing behavior EXCEPT confirm it runs (this task's change must keep it green). If the file already existed and passes, note the baseline.

- [ ] **Step 2: Swap the private normalize for the shared util**

In `prefacturacion-logic.ts`, add at the top (after the existing import):

```ts
import { normalizeSearch } from "../../shared/text-search";
```

Delete the local `normalize` function (lines 10-12). In `applyFilter`, replace both `normalize(...)` calls with `normalizeSearch(...)`:

```ts
export function applyFilter(rows: PedidoPendienteDto[], query: string): PedidoPendienteDto[] {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return rows;
  return rows.filter((r) => {
    const haystack = normalizeSearch(`${r.idPedido} ${r.rutCliente} ${r.nomFantasia} ${r.nomLocal} ${r.contacto} ${r.vendedor}`);
    return tokens.every((t) => haystack.includes(t));
  });
}
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.ts apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts
git commit -m "refactor(prefacturacion): use shared token-search util

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: marcas — tokenize nombre + quick

**Files:**
- Modify: `apps/frontend/src/app/features/marcas/marcas-logic.ts:1-19`
- Test: `apps/frontend/src/app/features/marcas/marcas-logic.spec.ts` (existing — extend)

**Interfaces:**
- Consumes: `matchesAllTokens` from `../../shared/text-search`.
- Produces: unchanged `applyFilters(rows, f)` signature.

- [ ] **Step 1: Write the failing test**

Add to `marcas-logic.spec.ts` (inside the `applyFilters` describe, or add one):

```ts
it("matches nombre tokens in any order", () => {
  const rows = [
    { nomMarca: "SOPROLE LIGHT", descMarca: "" } as MarcaDto,
    { nomMarca: "COLUN", descMarca: "" } as MarcaDto,
  ];
  expect(applyFilters(rows, { nombre: "light soprole", quick: "" })).toHaveLength(1);
});
it("quick matches across nombre + descMarca in any order", () => {
  const rows = [
    { nomMarca: "NESTLE", descMarca: "chocolates y leche" } as MarcaDto,
  ];
  expect(applyFilters(rows, { nombre: "", quick: "leche nestle" })).toHaveLength(1);
});
```

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/marcas/marcas-logic.spec.ts`
Expected: FAIL — current plain-substring code returns 0 for out-of-order queries.

- [ ] **Step 2: Switch the filter to token matching**

In `marcas-logic.ts`, add the import:

```ts
import type { MarcaDto } from "@serfel/shared";
import { matchesAllTokens } from "../../shared/text-search";
```

Replace `applyFilters` with:

```ts
export function applyFilters(rows: MarcaDto[], f: Filters): MarcaDto[] {
  const nombre = f.nombre.trim();
  const quick = f.quick.trim();
  return rows.filter((r) => {
    if (nombre && !matchesAllTokens(r.nomMarca, nombre)) return false;
    if (quick && !matchesAllTokens(`${r.nomMarca} ${r.descMarca}`, quick)) return false;
    return true;
  });
}
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run apps/frontend/src/app/features/marcas/marcas-logic.spec.ts`
Expected: PASS (new and existing cases).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/marcas/marcas-logic.ts apps/frontend/src/app/features/marcas/marcas-logic.spec.ts
git commit -m "feat(marcas): token search for nombre and quick filters

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: precios — tokenize the name portion of the search

**Files:**
- Modify: `apps/frontend/src/app/features/precios/precios-store.ts:33-37` (the `filteredRows` computed)

**Interfaces:**
- Consumes: `matchesAllTokens` from `../../shared/text-search`.
- Produces: unchanged store API.

Note: this is a store computed with no existing unit test; its token behavior is guaranteed by the Task 1 util spec. Verify via typecheck. Keep `codSerfel` inside the searchable haystack (numeric-as-text contains still works because a bare number token is a substring of the concatenated string).

- [ ] **Step 1: Add the import**

At the top of `precios-store.ts`, after the existing imports:

```ts
import { matchesAllTokens } from "../../shared/text-search";
```

- [ ] **Step 2: Update the computed**

Replace:

```ts
readonly filteredRows = computed(() => {
  const q = this.filter().trim().toLowerCase();
  if (!q) return this.rows();
  return this.rows().filter((r) =>
    `${r.codSerfel} ${r.nomProducto}`.toLowerCase().includes(q));
});
```

with:

```ts
readonly filteredRows = computed(() => {
  const q = this.filter().trim();
  if (!q) return this.rows();
  return this.rows().filter((r) =>
    matchesAllTokens(`${r.codSerfel} ${r.nomProducto}`, q));
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/precios/precios-store.ts
git commit -m "feat(precios): token search in the product filter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: listado-carga — tokenize the route-name filter

**Files:**
- Modify: `apps/frontend/src/app/features/listado-carga/listado-carga-store.ts:27-31` (the `filteredRutas` computed)

**Interfaces:**
- Consumes: `matchesAllTokens` from `../../shared/text-search`.
- Produces: unchanged store API.

Note: store computed, no existing unit test; behavior guaranteed by Task 1. Verify via typecheck.

- [ ] **Step 1: Add the import**

At the top of `listado-carga-store.ts`, after the existing imports:

```ts
import { matchesAllTokens } from "../../shared/text-search";
```

- [ ] **Step 2: Update the computed**

Replace:

```ts
readonly filteredRutas = computed(() => {
  const q = this.nameFilter().trim().toLowerCase();
  if (!q) return this.rutas();
  return this.rutas().filter((r) => r.nomRuta.toLowerCase().includes(q));
});
```

with:

```ts
readonly filteredRutas = computed(() => {
  const q = this.nameFilter().trim();
  if (!q) return this.rutas();
  return this.rutas().filter((r) => matchesAllTokens(r.nomRuta, q));
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/listado-carga/listado-carga-store.ts
git commit -m "feat(listado-carga): token search in the route filter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: clientes Lambda — tokenize the direccion filter (SQL)

**Files:**
- Modify: `lambdas/clientes/service.ts:127-136` (the `direccion` branch of `buildClienteWhere`)
- Test: `lambdas/clientes/tests/service.test.ts` (extend)

**Interfaces:**
- Consumes: existing `or`, `like`, `and`, `exists`, `sql` imports (already present at `service.ts:1`).
- Produces: unchanged `searchClientes` signature.

Pattern: mirror the `razonSocial` branch (`service.ts:121-126`) — split the query on whitespace and AND one predicate per token; each token must match either the client's `direccionCliente` OR any of its locals' `direccionLocalCliente`. Numeric `rut` stays untouched.

- [ ] **Step 1: Start MariaDB and confirm the baseline**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts
```
Expected: PASS (existing tests green before change).

- [ ] **Step 2: Write the failing test**

In `lambdas/clientes/tests/service.test.ts`, add a case that searches `direccion` with out-of-order tokens. Follow the file's existing seed/setup helpers (reuse whatever fixture inserts a cliente with a known `direccionCliente`, e.g. `"AV LOS CARRERA 1234"`), then:

```ts
it("matches direccion tokens in any order", async () => {
  // assumes a seeded cliente with direccionCliente "AV LOS CARRERA 1234"
  const res = await searchClientes(db, {
    estado: "todos", rut: "", razonSocial: "", direccion: "carrera los",
  });
  expect(res.some((c) => c.direccion.includes("CARRERA"))).toBe(true);
});
```

Adapt the seed reference to the actual helper names in the test file; do not invent a new seeding mechanism.

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: FAIL — single-substring `"carrera los"` does not match `"AV LOS CARRERA 1234"`.

- [ ] **Step 3: Tokenize the direccion branch**

In `service.ts`, replace the `direccion` branch:

```ts
if (params.direccion) {
  const pat = `%${params.direccion}%`;
  const localMatch = (db as Db)
    .select({ x: sql`1` })
    .from(t10MLocalCliente)
    .where(and(
      eq(t10MLocalCliente.rutCliente, t10MCliente.rutCliente),
      like(t10MLocalCliente.direccionLocalCliente, pat),
    ));
  conds.push(or(like(t10MCliente.direccionCliente, pat), exists(localMatch)));
}
```

with:

```ts
if (params.direccion) {
  for (const tok of params.direccion.split(/\s+/).filter(Boolean)) {
    const pat = `%${tok}%`;
    const localMatch = (db as Db)
      .select({ x: sql`1` })
      .from(t10MLocalCliente)
      .where(and(
        eq(t10MLocalCliente.rutCliente, t10MCliente.rutCliente),
        like(t10MLocalCliente.direccionLocalCliente, pat),
      ));
    conds.push(or(like(t10MCliente.direccionCliente, pat), exists(localMatch)));
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: PASS (new and existing cases).

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/service.ts lambdas/clientes/tests/service.test.ts
git commit -m "feat(clientes): token search for the direccion filter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: legacy Angular 14 — token search in crear-pedido

**Files:**
- Create: `apps/legacy-frontend/src/app/utils/text-search.ts`
- Create: `apps/legacy-frontend/src/app/utils/text-search.spec.ts`
- Modify: `apps/legacy-frontend/src/app/pages/pedidos/crear-pedido/crear-pedido.component.ts:190-193`

**Interfaces:**
- Consumes (component): `matchesAllTokens` from `../../../utils/text-search`.
- Produces: standalone `normalizeSearch` / `matchesAllTokens` (identical semantics to Task 1, no Angular deps).

- [ ] **Step 1: Write the failing test**

```ts
// apps/legacy-frontend/src/app/utils/text-search.spec.ts
import { normalizeSearch, matchesAllTokens } from './text-search';

describe('text-search', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeSearch('QUÉSO LONCO.200g')).toBe('queso lonco 200g');
  });
  it('matches tokens in any order', () => {
    expect(matchesAllTokens('QUESO LONCO 200g', 'lonco 200g queso')).toBe(true);
  });
  it('requires all tokens', () => {
    expect(matchesAllTokens('QUESO LONCO', 'queso nestle')).toBe(false);
  });
});
```

Run (Node 16):
```bash
cd apps/legacy-frontend
export NODE_OPTIONS=--openssl-legacy-provider
npx ng test --watch=false --include='**/text-search.spec.ts'
```
Expected: FAIL — module `./text-search` not found. (If the Karma harness is not runnable in this environment, note that and rely on the identical Task 1 vitest coverage plus manual verification in Step 4.)

- [ ] **Step 2: Create the standalone util**

```ts
// apps/legacy-frontend/src/app/utils/text-search.ts

/** Normaliza texto: minúsculas, sin tildes, puntuación → espacio. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** true si cada palabra de la consulta aparece como substring, en cualquier orden. */
export function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
```

- [ ] **Step 3: Wire it into buscarProducto()**

In `crear-pedido.component.ts`, add the import (with the other model/util imports near the top):

```ts
import { matchesAllTokens } from '../../../utils/text-search';
```

Replace the body of `buscarProducto()` lines 191-193:

```ts
this.nombreProducto = this.nombreProducto.toUpperCase();
const listaProductos: PrecioProductoModel[] = JSON.parse(localStorage.getItem('productos'));
this.productos = listaProductos.filter(item => item.nomProducto.toUpperCase().includes(this.nombreProducto));
```

with:

```ts
const listaProductos: PrecioProductoModel[] = JSON.parse(localStorage.getItem('productos'));
this.productos = listaProductos.filter(item => matchesAllTokens(item.nomProducto, this.nombreProducto));
```

(Drop the `.toUpperCase()` self-mutation so the modal's `filtroBusqueda` shows exactly what the user typed; `matchesAllTokens` normalizes internally.)

- [ ] **Step 4: Verify**

Run the legacy spec if the harness runs:
```bash
cd apps/legacy-frontend
export NODE_OPTIONS=--openssl-legacy-provider
npx ng test --watch=false --include='**/text-search.spec.ts'
```
Expected: PASS.

If Karma cannot run here, verify manually: `ng serve` the legacy app, open crear-pedido, type `"lonco 200g queso"` in "buscar por nombre producto", and confirm a product named `"QUESO LONCO 200g"` appears in the results modal.

- [ ] **Step 5: Commit**

```bash
git add apps/legacy-frontend/src/app/utils/text-search.ts apps/legacy-frontend/src/app/utils/text-search.spec.ts apps/legacy-frontend/src/app/pages/pedidos/crear-pedido/crear-pedido.component.ts
git commit -m "feat(legacy-pedidos): token search in buscar por nombre producto

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] Frontend suite: `pnpm --filter @serfel/frontend test` — all green.
- [ ] Lambda suite (MariaDB up): `pnpm --filter @serfel/lambdas test` — all green.
- [ ] `pnpm typecheck` — clean.
- [ ] Manual smoke: each maintainer's name filter finds an out-of-order multi-word query; legacy crear-pedido search does too.
