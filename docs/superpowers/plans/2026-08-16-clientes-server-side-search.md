# Clientes Server-Side Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the clientes maintainer's client-side filtering (which loads all ~6k clients up front) with server-side search by RUT, Razón Social, and Dirección, scoped by Estado, loading nothing until the user searches.

**Architecture:** `GET /clientes` gains optional `rut`/`razonSocial`/`direccion` query params (ANDed) alongside the existing `estado`. A new `ClienteSearchSchema` in `@serfel/shared` validates them and is reused by the Lambda and the Angular API service. The Lambda's `searchClientes` builds a filtered SQL query (LIKE-based, Dirección also matching any of the client's locales via an EXISTS subquery) and scopes the three derived-column aggregates to the matched ruts. The frontend keeps sort/pagination/CSV client-side over the returned result set; it fires an explicit search on a **Buscar** button / Enter, and confirms before an all-empty (full ~6k) search.

**Tech Stack:** TypeScript, Zod, Drizzle ORM (MariaDB), Hono (Lambda), Angular 20 (signals), Vitest.

## Global Constraints

- Node >= 22; pnpm workspaces. Run commands from repo root unless noted.
- Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` before running them.
- `@serfel/shared` is the single source of truth for DTOs/schemas — never duplicate DTOs between frontend and backend.
- Reuse `EstadoFilterSchema` / `EstadoFilter` from `@serfel/shared` (defined in `productos.ts`, default `"activos"`).
- No new API Gateway route is needed — `GET /clientes` already exists in `infra/api.ts`; only query params change.
- Drizzle operators available from `drizzle-orm`: `and`, `or`, `eq`, `ne`, `gt`, `like`, `inArray`, `exists`, `asc`, `sql`.
- The MariaDB collation is case/accent-insensitive; rely on it for folding (matches existing behavior).

---

### Task 1: Shared `ClienteSearchSchema`

**Files:**
- Modify: `packages/shared/src/clientes.ts`
- Test: `packages/shared/src/clientes.spec.ts`

**Interfaces:**
- Consumes: `EstadoFilterSchema` from `./productos`.
- Produces:
  - `ClienteSearchSchema` — a Zod object.
  - `type ClienteSearchParams = { estado: EstadoFilter; rut?: string; razonSocial?: string; direccion?: string }`. `rut` is digits-only (dots/DV stripped); empty text fields normalize to `undefined`.

- [ ] **Step 1: Write the failing test**

Append to `packages/shared/src/clientes.spec.ts`:

```typescript
import { ClienteSearchSchema } from "./clientes";

describe("ClienteSearchSchema", () => {
  it("defaults estado to activos and leaves filters undefined", () => {
    const r = ClienteSearchSchema.safeParse({});
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.estado).toBe("activos");
    expect(r.data.rut).toBeUndefined();
    expect(r.data.razonSocial).toBeUndefined();
    expect(r.data.direccion).toBeUndefined();
  });

  it("strips dots and DV from rut to digits", () => {
    const r = ClienteSearchSchema.parse({ rut: "12.345.678" });
    expect(r.rut).toBe("12345678");
  });

  it("trims razonSocial and direccion, mapping empty to undefined", () => {
    const r = ClienteSearchSchema.parse({ razonSocial: "  espiga  ", direccion: "   " });
    expect(r.razonSocial).toBe("espiga");
    expect(r.direccion).toBeUndefined();
  });

  it("rejects an invalid estado", () => {
    expect(ClienteSearchSchema.safeParse({ estado: "nope" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/shared exec vitest run src/clientes.spec.ts`
Expected: FAIL — `ClienteSearchSchema` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `packages/shared/src/clientes.ts`, add the import at the top (below the existing `import { rutValido } from "./rut";`):

```typescript
import { EstadoFilterSchema, type EstadoFilter } from "./productos";
```

Then add at the end of the file:

```typescript
const optDigits = z.string().optional().transform((s) => {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length ? d : undefined;
});
const optTrimmed = z.string().optional().transform((s) => {
  const t = (s ?? "").trim();
  return t.length ? t : undefined;
});

/** Server-side clientes search params. All filters optional and ANDed. */
export const ClienteSearchSchema = z.object({
  estado: EstadoFilterSchema,
  rut: optDigits,
  razonSocial: optTrimmed,
  direccion: optTrimmed,
});
export type ClienteSearchParams = z.infer<typeof ClienteSearchSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/shared exec vitest run src/clientes.spec.ts`
Expected: PASS (all describes, including the existing create/update ones).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/clientes.ts packages/shared/src/clientes.spec.ts
git commit -m "feat(shared): ClienteSearchSchema for server-side clientes search"
```

---

### Task 2: Lambda `searchClientes`

**Files:**
- Modify: `lambdas/clientes/service.ts` (replace `listClientes`, add filter builder + aggregate scoping)
- Test: `lambdas/clientes/tests/service.test.ts`

**Interfaces:**
- Consumes: `ClienteSearchParams` from `@serfel/shared`; Drizzle operators `or`, `like`, `inArray`, `exists`.
- Produces: `searchClientes(db: Db, params: ClienteSearchParams): Promise<ClienteDto[]>`. Replaces the old `listClientes(db, estado)`. Returns `[]` when filters match nothing. Derived columns (`dias`, `ultFactura`, `ultNotaCredito`) are correct and, when any text filter is present, scoped to the matched ruts.

- [ ] **Step 1: Write the failing test**

Append to `lambdas/clientes/tests/service.test.ts` — first add `searchClientes` to the import from `../service` (add it to the existing named import list), then add:

```typescript
describe("searchClientes", () => {
  const now = "2026-02-01 00:00:00";
  beforeAll(async () => {
    await db.insert(t10MCliente).values([
      { rutCliente: 7000000, dvCliente: "8", razonSocial: "Panaderia La Espiga SpA",
        direccionCliente: "Av Manquehue 1200", idListaPrecio: SEED.idListaPrecio,
        idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
      { rutCliente: 7000001, dvCliente: "6", razonSocial: "Ferreteria El Clavo Ltda",
        direccionCliente: "Los Militares 5000", idListaPrecio: SEED.idListaPrecio,
        idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    ]);
    // A local whose address differs from its client's own address.
    await db.insert(t10MLocalCliente).values({
      rutCliente: 7000001, nomLocalCliente: "Bodega Sur",
      direccionLocalCliente: "Camino Melipilla 999",
      idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
    });
  });

  const ruts = (rows: { rutCliente: number }[]) => rows.map((r) => r.rutCliente).sort((a, b) => a - b);

  it("matches by razon social token", async () => {
    const rows = await searchClientes(db, { estado: "activos", razonSocial: "espiga" });
    expect(ruts(rows)).toEqual([7000000]);
  });

  it("matches by multiple razon social tokens (ANDed)", async () => {
    const rows = await searchClientes(db, { estado: "activos", razonSocial: "el clavo" });
    expect(ruts(rows)).toEqual([7000001]);
  });

  it("matches by rut substring", async () => {
    const rows = await searchClientes(db, { estado: "activos", rut: "7000000" });
    expect(ruts(rows)).toEqual([7000000]);
  });

  it("matches by the client's own direccion", async () => {
    const rows = await searchClientes(db, { estado: "activos", direccion: "manquehue" });
    expect(ruts(rows)).toEqual([7000000]);
  });

  it("matches by a local's direccion (not the client's own)", async () => {
    const rows = await searchClientes(db, { estado: "activos", direccion: "melipilla" });
    expect(ruts(rows)).toEqual([7000001]);
  });

  it("ANDs filters across fields", async () => {
    const rows = await searchClientes(db, { estado: "activos", razonSocial: "ferreteria", direccion: "melipilla" });
    expect(ruts(rows)).toEqual([7000001]);
  });

  it("returns [] when nothing matches", async () => {
    const rows = await searchClientes(db, { estado: "activos", razonSocial: "zzzznomatch" });
    expect(rows).toEqual([]);
  });

  it("keeps derived columns correct and scoped when filtering by rut", async () => {
    const rows = await searchClientes(db, { estado: "activos", rut: String(SEED.rutClienteConVenta) });
    const seeded = rows.find((r) => r.rutCliente === SEED.rutClienteConVenta);
    expect(seeded).toBeDefined();
    expect(seeded!.dias).toEqual([1, 3]);
    expect(seeded!.ultFactura).toBe(1050);
    expect(seeded!.ultNotaCredito).toBe(77);
  });

  it("with no text filters returns all active clients", async () => {
    const rows = await searchClientes(db, { estado: "activos" });
    const set = new Set(rows.map((r) => r.rutCliente));
    expect(set.has(7000000)).toBe(true);
    expect(set.has(7000001)).toBe(true);
    expect(rows.every((r) => r.idEstado === 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait`
Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: FAIL — `searchClientes` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `lambdas/clientes/service.ts`:

Update the drizzle import (line 1) to add `or`, `like`, `inArray`, `exists`:

```typescript
import { and, asc, eq, ne, gt, or, like, inArray, exists, sql } from "drizzle-orm";
```

Update the `@serfel/shared` import to add `ClienteSearchParams` to the existing type import list (add `type ClienteSearchParams,`).

Replace the whole `listClientes` function (lines 112-154) with the filter builder, aggregate helpers, and `searchClientes`:

```typescript
/** Build the ANDed WHERE for a search. Returns undefined when unconstrained. */
function buildClienteWhere(db: DbOrTx, params: ClienteSearchParams) {
  const conds = [];
  if (params.estado !== "todos") {
    conds.push(eq(t10MCliente.idEstado, params.estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO));
  }
  if (params.rut) {
    conds.push(sql`CAST(${t10MCliente.rutCliente} AS CHAR) LIKE ${`%${params.rut}%`}`);
  }
  if (params.razonSocial) {
    for (const tok of params.razonSocial.split(/\s+/).filter(Boolean)) {
      const pat = `%${tok}%`;
      conds.push(or(like(t10MCliente.razonSocial, pat), like(t10MCliente.nomFantasia, pat)));
    }
  }
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
  return conds.length ? and(...conds) : undefined;
}

export async function searchClientes(db: Db, params: ClienteSearchParams): Promise<ClienteDto[]> {
  const where = buildClienteWhere(db, params);
  const base = clienteQuery(db);
  const rows = (await (where ? base.where(where) : base).orderBy(asc(t10MCliente.razonSocial))) as Row[];
  if (rows.length === 0) return [];

  // When any text filter narrows the set, scope the derived-column aggregates to
  // the matched ruts; on an unfiltered ("all") search they run unbounded as before.
  const hasText = !!(params.rut || params.razonSocial || params.direccion);
  const scope = hasText ? rows.map((r) => r.rutCliente) : null;

  const diasWhere = scope
    ? and(gt(t40MRuta.idEstado, 0), inArray(t10MLocalCliente.rutCliente, scope))
    : gt(t40MRuta.idEstado, 0);
  const diasRows = await db
    .select({ rut: t10MLocalCliente.rutCliente, numDia: t40MRuta.numDia })
    .from(t40MRuta)
    .innerJoin(t40MRutaLocalCliente, eq(t40MRuta.idRuta, t40MRutaLocalCliente.idRuta))
    .innerJoin(t10MLocalCliente, eq(t40MRutaLocalCliente.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .where(diasWhere)
    .groupBy(t10MLocalCliente.rutCliente, t40MRuta.numDia);

  const factWhere = scope
    ? and(gt(t40MVenta.idEstado, 0), inArray(t40MVenta.rutCliente, scope))
    : gt(t40MVenta.idEstado, 0);
  const factRows = await db
    .select({ rut: t40MVenta.rutCliente, num: sql<number>`MAX(${t40MVenta.numDoctoEmitido})` })
    .from(t40MVenta).where(factWhere)
    .groupBy(t40MVenta.rutCliente);

  const ncWhere = scope
    ? and(gt(t40MNotaCredito.idEstado, 0), inArray(t40MVenta.rutCliente, scope))
    : gt(t40MNotaCredito.idEstado, 0);
  const ncRows = await db
    .select({ rut: t40MVenta.rutCliente, num: sql<number>`MAX(${t40MNotaCredito.numNotaCredito})` })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(ncWhere)
    .groupBy(t40MVenta.rutCliente);

  const dias = new Map<number, Set<number>>();
  for (const r of diasRows) (dias.get(r.rut) ?? dias.set(r.rut, new Set()).get(r.rut)!).add(r.numDia);
  const maxBy = (rs: { rut: number; num: number }[]) => {
    const m = new Map<number, number>();
    for (const r of rs) m.set(r.rut, Math.max(m.get(r.rut) ?? 0, r.num));
    return m;
  };
  const fact = maxBy(factRows);
  const nc = maxBy(ncRows);

  return rows.map((r) => toDto(
    r,
    [...(dias.get(r.rutCliente) ?? new Set<number>())].sort((a, b) => a - b),
    fact.get(r.rutCliente) ?? null,
    nc.get(r.rutCliente) ?? null,
  ));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: PASS — the new `searchClientes` describe plus all existing describes (the old `listClientes derived columns` describe is updated in Task 3's file edits; if it still imports `listClientes` here it will fail to compile, so also update its two `listClientes(...)` calls to `searchClientes(db, { estado: "todos" })` and `searchClientes(db, { estado: "activos" })` respectively, and drop the now-unused `listClientes` import).

Concretely, in the existing `describe("listClientes derived columns", …)` block change:
- `const rows = await listClientes(db, "todos");` → `const rows = await searchClientes(db, { estado: "todos" });`
- `const activos = await listClientes(db, "activos");` → `const activos = await searchClientes(db, { estado: "activos" });`

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/service.ts lambdas/clientes/tests/service.test.ts
git commit -m "feat(clientes): searchClientes with server-side rut/razon/direccion filters"
```

---

### Task 3: Wire `GET /clientes` to `searchClientes`

**Files:**
- Modify: `lambdas/clientes/app.ts` (lines 8-12 import block; lines 66-70 route)
- Test: `lambdas/clientes/tests/app.test.ts`

**Interfaces:**
- Consumes: `searchClientes` (Task 2), `ClienteSearchSchema` (Task 1).
- Produces: `GET /clientes?estado=&rut=&razonSocial=&direccion=` → `ClienteDto[]`. Invalid `estado` → 400 `VALIDACION`.

- [ ] **Step 1: Write the failing test**

In `lambdas/clientes/tests/app.test.ts`: rename the `listClientes` mock key to `searchClientes` in the `vi.hoisted` mocks object, then add tests inside `describe("clientes app", …)`:

```typescript
  it("passes search params through to searchClientes", async () => {
    mocks.searchClientes.mockResolvedValue([{ rutCliente: 7000000 }]);
    const res = await makeApp().request("/api/clientes?estado=activos&razonSocial=espiga&direccion=manquehue&rut=7.000.000");
    expect(res.status).toBe(200);
    expect(mocks.searchClientes).toHaveBeenCalledWith(fakeDb, {
      estado: "activos", razonSocial: "espiga", direccion: "manquehue", rut: "7000000",
    });
  });

  it("400s on an invalid estado", async () => {
    const res = await makeApp().request("/api/clientes?estado=nope");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });
```

Also update the existing `"lists clientes"` test to use `mocks.searchClientes` instead of `mocks.listClientes`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/app.test.ts`
Expected: FAIL — app still imports/calls `listClientes`.

- [ ] **Step 3: Write minimal implementation**

In `lambdas/clientes/app.ts`:

Update the `@serfel/shared` import (lines 2-5) to add `ClienteSearchSchema` and drop `EstadoFilterSchema` if it is no longer used elsewhere in the file — note it is still used by the `/clientes/:rut/locales` route (line 102), so **keep** `EstadoFilterSchema` and just add `ClienteSearchSchema`:

```typescript
import {
  EstadoFilterSchema, ClienteSearchSchema, ClienteCreateSchema, ClienteUpdateSchema,
  LocalCreateSchema, LocalUpdateSchema, type ApiErrorBody,
} from "@serfel/shared";
```

Update the service import (lines 8-12) to replace `listClientes` with `searchClientes`.

Replace the `GET /clientes` route (lines 66-70) with:

```typescript
  app.get("/clientes", async (c) => {
    const parsed = ClienteSearchSchema.safeParse({
      estado: c.req.query("estado"),
      rut: c.req.query("rut"),
      razonSocial: c.req.query("razonSocial"),
      direccion: c.req.query("direccion"),
    });
    if (!parsed.success) throw new AppError("VALIDACION", 400, "parámetros de búsqueda inválidos");
    return c.json(await searchClientes(await deps.getDb(), parsed.data));
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/app.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/app.ts lambdas/clientes/tests/app.test.ts
git commit -m "feat(clientes): wire GET /clientes to searchClientes query params"
```

---

### Task 4: Frontend logic — drop `applyFilters`, reshape `Filters`

**Files:**
- Modify: `apps/frontend/src/app/features/clientes/clientes-logic.ts`
- Test: `apps/frontend/src/app/features/clientes/clientes-logic.spec.ts`

**Interfaces:**
- Produces: `interface Filters = { rut: string; razonSocial: string; direccion: string }`. `applyFilters` is removed. `sortRows`, `paginate`, `toCsv`, `computeStats`, `WEEKDAYS`, `SortKey`, `Sort` unchanged.

- [ ] **Step 1: Write the failing test**

In `clientes-logic.spec.ts`: remove `applyFilters` from the import on line 3, and delete the entire `describe("applyFilters", …)` block (the three `it` cases that reference `applyFilters`). Leave the `sortRows`, `paginate`, `computeStats`, `toCsv` describes intact.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/clientes-logic.spec.ts`
Expected: FAIL — `Filters` still has `quick`/`idListaPrecio` and `applyFilters` is still exported/used elsewhere causing type errors is not yet the case, but the spec compiles; the true failure appears once Step 3 removes `applyFilters`. If Step 1 alone passes, proceed — the meaningful gate is Step 4 after the source edit.

- [ ] **Step 3: Write minimal implementation**

In `clientes-logic.ts`: replace the `Filters` interface (lines 3-8) with:

```typescript
export interface Filters {
  rut: string;
  razonSocial: string;
  direccion: string;
}
```

Delete the `applyFilters` function (lines 27-38) and the two search helpers it is the only user of — `normalizeSearch` and `matchesAllTokens` (lines 19-25). Keep everything else (`sortRows`, `paginate`, `toCsv`, `computeStats`, `WEEKDAYS`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/clientes-logic.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/clientes/clientes-logic.ts apps/frontend/src/app/features/clientes/clientes-logic.spec.ts
git commit -m "refactor(clientes): reshape Filters and drop client-side applyFilters"
```

---

### Task 5: Frontend API service + store — server-side `search()`

**Files:**
- Modify: `apps/frontend/src/app/features/clientes/clientes-api.service.ts`
- Modify: `apps/frontend/src/app/features/clientes/clientes-store.ts`

**Interfaces:**
- Consumes: `Filters` (Task 4), `EstadoFilter`.
- Produces:
  - `ClientesApi.search(params: { estado: EstadoFilter } & Filters): Observable<ClienteDto[]>` (replaces `list`).
  - `ClientesStore`: `hasSearched: Signal<boolean>`, `search(): Promise<void>`, `EMPTY_FILTERS = { rut: "", razonSocial: "", direccion: "" }`. `load()` fetches lookups only. Writes re-run `search()` when `hasSearched()` is true.

- [ ] **Step 1: Update the API service**

In `clientes-api.service.ts`: remove the `list` method and add:

```typescript
  search(params: { estado: EstadoFilter; rut: string; razonSocial: string; direccion: string }) {
    const p: Record<string, string> = { estado: params.estado };
    if (params.rut.trim()) p["rut"] = params.rut.trim();
    if (params.razonSocial.trim()) p["razonSocial"] = params.razonSocial.trim();
    if (params.direccion.trim()) p["direccion"] = params.direccion.trim();
    return this.http.get<ClienteDto[]>(`${this.base}/clientes`, { params: p });
  }
```

- [ ] **Step 2: Update the store**

In `clientes-store.ts`:

Replace the `EMPTY_FILTERS` constant (line 10):

```typescript
const EMPTY_FILTERS: Filters = { rut: "", razonSocial: "", direccion: "" };
```

Replace the `applyFilters` import (line 8) with one that drops it:

```typescript
import { computeStats, paginate, sortRows, type Filters, type Sort, type SortKey } from "./clientes-logic";
```

Add a `hasSearched` signal (below `filters`):

```typescript
  readonly hasSearched = signal(false);
```

Change the `filtered` computed (line 40) to sort the result set with no client-side filtering:

```typescript
  readonly filtered = computed(() => sortRows(this.clientes(), this.sort()));
```

Replace `load()` (lines 44-59) so it only fetches lookups:

```typescript
  async load(): Promise<void> {
    if (this.lookups()) return;
    this.errorMsg.set(null);
    try {
      this.lookups.set(await firstValueFrom(this.api.lookups()));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar la configuración de clientes.");
    }
  }

  async search(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const clientes = await firstValueFrom(
        this.api.search({ estado: this.estadoFilter(), ...this.filters() }),
      );
      this.clientes.set(clientes);
      this.hasSearched.set(true);
      this.page.set(1);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo buscar clientes. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }
```

Replace `setEstado` (line 61) so it re-searches only after a first search:

```typescript
  async setEstado(estado: EstadoFilter): Promise<void> {
    this.estadoFilter.set(estado); this.page.set(1);
    if (this.hasSearched()) await this.search();
  }
```

Replace the four write methods (lines 66-69) so they refresh via `search()` only when a search is active:

```typescript
  async create(input: ClienteCreateInput): Promise<void> { await firstValueFrom(this.api.create(input)); if (this.hasSearched()) await this.search(); }
  async update(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.update(rut, input)); if (this.hasSearched()) await this.search(); }
  async activate(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.activate(rut, input)); if (this.hasSearched()) await this.search(); }
  async deactivate(rut: number): Promise<void> { await firstValueFrom(this.api.deactivate(rut)); if (this.hasSearched()) await this.search(); }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc --noEmit -p tsconfig.app.json`
Expected: errors only in `clientes-page.component.ts` (still references removed `quick`/`idListaPrecio`/`store.filtered` filtering and the navbar search) — those are fixed in Task 6. The store and api service files must be error-free themselves.

If `tsconfig.app.json` is not the right project file, use `pnpm typecheck` from repo root and confirm the only remaining errors are in `clientes-page.component.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/clientes/clientes-api.service.ts apps/frontend/src/app/features/clientes/clientes-store.ts
git commit -m "feat(clientes): store.search() server-side flow, lookups-only load"
```

---

### Task 6: Frontend page — filter bar, Buscar, remove navbar search

**Files:**
- Modify: `apps/frontend/src/app/features/clientes/clientes-page.component.ts`

**Interfaces:**
- Consumes: `ClientesStore.search()`, `hasSearched()`, `filters()`, `setFilter()`, `setEstado()`.
- Produces: the reworked maintainer UI. No new exports.

- [ ] **Step 1: Remove the navbar quick-search**

In the template, delete the entire `<div class="header-search">…</div>` block inside `<app-navbar>` (lines 16-22 region), leaving `<app-navbar></app-navbar>`.

- [ ] **Step 2: Rework the filter bar**

Replace the `<div class="filter-dropdowns">…</div>` block with RUT / Razón Social / Dirección inputs (Enter triggers search), a **Buscar** button, the Estado selector, and Limpiar:

```html
      <div class="filter-dropdowns">
        <div class="fd-field"><label for="f-rut">RUT</label>
          <input id="f-rut" type="text" placeholder="12345678" style="width:150px"
                 [ngModel]="store.filters().rut" (ngModelChange)="store.setFilter({ rut: $event })"
                 (keyup.enter)="onSearch()" /></div>
        <div class="fd-field" style="flex:1"><label for="f-rs">Razón Social</label>
          <input id="f-rs" type="text" placeholder="Buscar por razón social…"
                 [ngModel]="store.filters().razonSocial" (ngModelChange)="store.setFilter({ razonSocial: $event })"
                 (keyup.enter)="onSearch()" /></div>
        <div class="fd-field" style="flex:1"><label for="f-dir">Dirección</label>
          <input id="f-dir" type="text" placeholder="Buscar por dirección…"
                 [ngModel]="store.filters().direccion" (ngModelChange)="store.setFilter({ direccion: $event })"
                 (keyup.enter)="onSearch()" /></div>
        <div class="fd-field"><label for="f-estado">Estado</label>
          <select id="f-estado" [ngModel]="store.estadoFilter()" (ngModelChange)="setEstado($event)">
            <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
          </select></div>
        <button class="hero-btn hero-btn-white" style="align-self:flex-end" (click)="onSearch()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Buscar
        </button>
        <button class="btn-clear" (click)="store.clearFilters()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg> Limpiar
        </button>
      </div>
```

- [ ] **Step 3: Add the empty-state variants**

Replace the `@else if (!store.loading())` empty-state block (near the end of `.page-body`) with a search-aware version:

```html
      } @else if (!store.loading()) {
        @if (store.hasSearched()) {
          <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No se encontraron clientes</div><div class="empty-sub">Intenta con otros filtros</div></div>
        } @else {
          <div class="empty-state"><div class="empty-icon">🔎</div><div class="empty-title">Busca clientes</div><div class="empty-sub">Ingresa un RUT, razón social o dirección y presiona Buscar</div></div>
        }
      }
```

- [ ] **Step 4: Add the `onSearch()` handler**

In the component class, add a method that confirms before an all-empty (full) search:

```typescript
  onSearch(): void {
    const f = this.store.filters();
    const empty = !f.rut.trim() && !f.razonSocial.trim() && !f.direccion.trim();
    if (empty && !confirm("Esto cargará todos los clientes (~6k). ¿Continuar?")) return;
    void this.store.search();
  }
```

- [ ] **Step 5: Typecheck + build**

Run: `pnpm typecheck`
Expected: PASS (no remaining references to `quick`/`idListaPrecio`).

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app/features/clientes/clientes-page.component.ts
git commit -m "feat(clientes): server-side search UI (Buscar, direccion filter, empty states)"
```

---

### Task 7: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full workspace test suite**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait`
Run: `pnpm -r test`
Expected: PASS across `@serfel/shared`, `@serfel/db`, `@serfel/lambdas`, `@serfel/frontend`.

- [ ] **Step 2: Typecheck the monorepo**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Manual smoke (optional, if a dev API is reachable)**

Drive the maintainer in the browser: open Clientes → confirm the table is empty with the "Busca clientes" prompt → search by a known razón social → results appear → search by a dirección that only a local has → the parent client appears → clear + Buscar → confirm dialog → all clients load and paginate.

- [ ] **Step 4: Final commit (if any doc/worklog updates)**

```bash
git add -A
git commit -m "chore(clientes): server-side search verification pass" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** filter set RUT/Razón Social/Dirección + Estado (Tasks 1-3, 6); Dirección matches client OR any local (Task 2 EXISTS subquery + test); explicit Buscar + Enter and empty→confirm (Task 6); stat cards scoped to result set (Task 5 — `computeStats(clientes, filtered)` where both are the result set, so "Filtrados" collapses to `null` and shows `—`, "Clientes" = result count, with no source change needed); navbar quick-search removed (Task 6); sort/paginate/CSV stay client-side (unchanged `sortRows`/`paginate`/`toCsv`); aggregate scoping to matched ruts (Task 2 + test).
- **Placeholders:** none — every code step has concrete content.
- **Type consistency:** `searchClientes(db, ClienteSearchParams)` used identically in service, tests, and app; `Filters = { rut, razonSocial, direccion }` used identically in logic, store, api service, and page; `ClienteSearchSchema`/`ClienteSearchParams` names consistent across shared, service, app.
- **Stat cards:** no code change is required for scoping because the store already computes `stats` from `computeStats(this.clientes(), this.filtered())`, and both now derive from the search result set. This is intentional, not an omission.
