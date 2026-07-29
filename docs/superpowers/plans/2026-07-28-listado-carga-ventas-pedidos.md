# Listado Carga Ventas/Pedidos Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick Ventas or Pedidos on the Listado Carga page, producing the same cargo-list PDF against the pedido tables when Pedidos is chosen.

**Architecture:** Add a `tipo` field to the shared cargoList request contract. The `rutas` lambda service branches its three fetch queries on `tipo`: Ventas keeps the existing `t40MVenta` path; Pedidos queries `t30MPedido` / `t30MProductoPedido` filtered by `idEstado = 1`, skips porciones (no schema link), and reuses the identical assembly, subtotal formula, and PDF. The Angular feature adds a radio group bound to a store signal.

**Tech Stack:** TypeScript, Zod, Drizzle ORM (MySQL/MariaDB), Hono, Vitest, Angular (standalone components + signals), pnpm workspaces.

## Global Constraints

- Package manager: **pnpm** with workspaces. Run workspace scripts with `pnpm --filter <name> <script>`.
- Backend + shared tests use **Vitest** (`vitest run`); the rutas integration tests need MariaDB on `127.0.0.1:3307` (container `db-mariadb-1`, already running via `docker compose -f packages/db/docker-compose.yml up -d`, root password `serfel`).
- Report output (PDF layout, ordering, subtotal formula, `truncateLastChar` quirk, and the `Cantidad Facturas: N` footer label) MUST stay byte-for-byte identical between Ventas and Pedidos.
- Pedidos filter is exactly `t30MPedido.idEstado = 1`; there is no `entregado` concept for pedidos.
- Porciones (`obs`) are ALWAYS `[]` for Pedidos — `t20MPorcion` has no `idPedido` link. Do not invent one.
- Ventas is the default `tipo`; existing Ventas behavior must not change.
- No em dashes in any AWS resource names or descriptions (not relevant to these files, but repo-wide rule).

---

### Task 1: Shared request contract

**Files:**
- Modify: `packages/shared/src/rutas.ts`
- Test: `packages/shared/src/rutas.spec.ts` (create)

**Interfaces:**
- Consumes: existing `RutaSelectionSchema` (unchanged).
- Produces:
  - `CargoTipoSchema: z.ZodEnum<["ventas","pedidos"]>`
  - `type CargoTipo = "ventas" | "pedidos"`
  - `CargoListRequestSchema` parsing `{ tipo: CargoTipo (default "ventas"), rutas: RutaSelection }`
  - `type CargoListRequest = { tipo: CargoTipo; rutas: RutaSelection }`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/rutas.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CargoListRequestSchema } from "./rutas";

describe("CargoListRequestSchema", () => {
  const rutas = [{ idRuta: 1, nomRuta: "Ruta Norte" }];

  it("defaults tipo to ventas when omitted", () => {
    const parsed = CargoListRequestSchema.parse({ rutas });
    expect(parsed.tipo).toBe("ventas");
    expect(parsed.rutas).toEqual(rutas);
  });

  it("accepts an explicit pedidos tipo", () => {
    const parsed = CargoListRequestSchema.parse({ tipo: "pedidos", rutas });
    expect(parsed.tipo).toBe("pedidos");
  });

  it("rejects an unknown tipo", () => {
    expect(CargoListRequestSchema.safeParse({ tipo: "otros", rutas }).success).toBe(false);
  });

  it("rejects an empty rutas array", () => {
    expect(CargoListRequestSchema.safeParse({ tipo: "ventas", rutas: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/shared test`
Expected: FAIL — `CargoListRequestSchema` is not exported.

- [ ] **Step 3: Add the schema**

Append to `packages/shared/src/rutas.ts` (after the existing `RutaSelectionSchema` / `RutaSelection`):

```ts
export const CargoTipoSchema = z.enum(["ventas", "pedidos"]);
export type CargoTipo = z.infer<typeof CargoTipoSchema>;

// cargoList body: which source to report on + the selected rutas.
export const CargoListRequestSchema = z.object({
  tipo: CargoTipoSchema.default("ventas"),
  rutas: RutaSelectionSchema,
});
export type CargoListRequest = z.infer<typeof CargoListRequestSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/shared test`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/rutas.ts packages/shared/src/rutas.spec.ts
git commit -m "feat(shared): CargoListRequest schema with ventas/pedidos tipo"
```

---

### Task 2: Pedido seed data for rutas tests

**Files:**
- Modify: `lambdas/rutas/tests/helpers.ts`

**Interfaces:**
- Consumes: existing `SEED`, `setupTestDb`.
- Produces: new `SEED` keys `pedidoUno`, `pedidoDos`, `pedidoAnulado`, `ESTADO_PEDIDO_VIGENTE`; pedido rows seeded so a Pedidos cargo list over both rutas yields Agua `sumCantidad "5.00"` / `subtotal 2500`, Leche `sumCantidad "2.00"` / `subtotal 1440`, totals `{ numFacturas: 2, total: 4000 }`, all `obs: []`.

This task has no separate test; it is verified by Task 3, which consumes the seed. Commit it together with Task 3 if preferred, but the steps below keep it self-contained.

- [ ] **Step 1: Import the pedido tables**

In `lambdas/rutas/tests/helpers.ts`, add `t30MPedido` and `t30MProductoPedido` to the existing `@serfel/db` import block (alongside `t40MVenta`, `t40MProductoVenta`, `t20MPorcion`):

```ts
  t40MVenta,
  t40MProductoVenta,
  t30MPedido,
  t30MProductoPedido,
  t20MPorcion,
```

- [ ] **Step 2: Add SEED keys**

In the `SEED` object, add these keys (place near `ESTADO_FINALIZADO`):

```ts
  pedidoUno: 1,
  pedidoDos: 2,
  pedidoAnulado: 3,
  ESTADO_PEDIDO_VIGENTE: 1,
```

- [ ] **Step 3: Seed pedido rows**

In `setupTestDb`, after the `t20MPorcion` insert (near the end, before `const teardown`), add:

```ts
  const pedido = (idPedido: number, idLocalCliente: number, idEstado: number, precioTotal: number) => ({
    idPedido, fechaPedido: NOW, idLocalCliente, idListaPrecio: 1, idEstado, precioTotal,
  });
  await db.insert(t30MPedido).values([
    pedido(SEED.pedidoUno, SEED.localNorte, SEED.ESTADO_PEDIDO_VIGENTE, 1500), // matches
    pedido(SEED.pedidoDos, SEED.localSur, SEED.ESTADO_PEDIDO_VIGENTE, 2500), // matches
    pedido(SEED.pedidoAnulado, SEED.localNorte, 0, 7777), // id_estado != 1 -> excluded
  ]);
  await db.insert(t30MProductoPedido).values([
    { idPedido: SEED.pedidoUno, idProducto: SEED.prodAgua, cantidad: "4.000", precio: 500, porcenDesc: 0 },
    { idPedido: SEED.pedidoUno, idProducto: SEED.prodLeche, cantidad: "2.000", precio: 800, porcenDesc: 10 },
    { idPedido: SEED.pedidoDos, idProducto: SEED.prodAgua, cantidad: "1.000", precio: 500, porcenDesc: 0 },
    { idPedido: SEED.pedidoAnulado, idProducto: SEED.prodAgua, cantidad: "50.000", precio: 500, porcenDesc: 0 },
  ]);
```

- [ ] **Step 4: Sanity-check the arithmetic (no command, reasoning only)**

Agua across vigente pedidos: `4.000 + 1.000 = 5.000` -> `truncateLastChar` -> `"5.00"`; subtotal `4*500 + 1*500 = 2500`.
Leche: `2.000` -> `"2.00"`; subtotal `2*(800 - 800*10/100) = 2*720 = 1440`.
Totals: `COUNT = 2`, `SUM(precioTotal) = 1500 + 2500 = 4000`. Pedido 3 excluded (idEstado 0).

- [ ] **Step 5: Commit (or defer to Task 3)**

```bash
git add lambdas/rutas/tests/helpers.ts
git commit -m "test(rutas): seed pedido rows for cargo-list tests"
```

---

### Task 3: Service branches on tipo (Pedidos path)

**Files:**
- Modify: `lambdas/rutas/service.ts`
- Test: `lambdas/rutas/tests/service.test.ts`

**Interfaces:**
- Consumes: `CargoTipo` from `@serfel/shared`; `t30MPedido`, `t30MProductoPedido` from `@serfel/db`; `SEED` from Task 2.
- Produces: `getCargoListData(db: Db, rutas: RutaSelection, tipo: CargoTipo): Promise<CargoListData>` — the added third parameter. Ventas branch unchanged; Pedidos branch skips porciones.

- [ ] **Step 1: Write the failing test**

Append to `lambdas/rutas/tests/service.test.ts` inside the existing `describe("getCargoListData", ...)` block (add `tipo` to the existing Ventas call too — see Step 4):

```ts
  it("aggregates per product across vigente pedidos when tipo is pedidos", async () => {
    const data = await getCargoListData(
      db,
      [
        { idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" },
        { idRuta: SEED.rutaSur, nomRuta: "Ruta Sur" },
      ],
      "pedidos"
    );

    expect(data.rows.map((r) => r.nomProducto)).toEqual(["Agua", "Leche"]);

    const agua = data.rows[0];
    expect(agua.sumCantidad).toBe("5.00"); // 4.000 + 1.000 -> "5.000" -> chop
    expect(agua.subtotal).toBe(2500);
    expect(agua.obs).toEqual([]); // pedidos never carry porciones

    const leche = data.rows[1];
    expect(leche.sumCantidad).toBe("2.00");
    expect(leche.subtotal).toBe(1440); // 2*(800 - 10%)
    expect(leche.obs).toEqual([]);

    // pedido 3 (id_estado != 1) is excluded
    expect(data.totals.numFacturas).toBe(2);
    expect(data.totals.total).toBe(4000); // 1500 + 2500
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas test -- rutas/tests/service.test.ts`
Expected: FAIL — `getCargoListData` takes 2 args / pedidos path not implemented.

- [ ] **Step 3: Implement the Pedidos path**

In `lambdas/rutas/service.ts`:

3a. Add `t30MPedido`, `t30MProductoPedido` to the `@serfel/db` import block and `CargoTipo` to the `@serfel/shared` import:

```ts
import {
  t40MRuta,
  t40MRutaLocalCliente,
  t40MVenta,
  t40MProductoVenta,
  t30MPedido,
  t30MProductoPedido,
  t20MProducto,
  t20MPorcion,
  t20PUnidadMedida,
  t20PTipoProducto,
  t10MUsuario,
  type Db,
} from "@serfel/db";
import { ESTADO_ACTIVO, type CargoTipo, type RutaDto, type RutaSelection } from "@serfel/shared";
```

3b. Add a constant next to the existing `ESTADO_FINALIZADO` / `NO_ENTREGADO`:

```ts
const ESTADO_PEDIDO_VIGENTE = 1;
```

3c. Add the two Pedidos fetch helpers (place them after `fetchTotals`):

```ts
async function fetchDetailPedido(db: Db, idRutas: number[]): Promise<DetailRow[]> {
  return db
    .select({
      idProducto: t30MProductoPedido.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      nomUm: t20PUnidadMedida.nomUm,
      nomTipoProducto: t20PTipoProducto.nomTipoProducto,
      sumCantidad: sql<string>`SUM(${t30MProductoPedido.cantidad})`,
      subtotal: sql<string>`SUM(${t30MProductoPedido.cantidad} * (${t30MProductoPedido.precio} - ${t30MProductoPedido.precio} * ${t30MProductoPedido.porcenDesc} / 100))`,
    })
    .from(t30MProductoPedido)
    .innerJoin(
      t30MPedido,
      and(
        eq(t30MPedido.idPedido, t30MProductoPedido.idPedido),
        eq(t30MPedido.idEstado, ESTADO_PEDIDO_VIGENTE)
      )
    )
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t30MPedido.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .innerJoin(t20MProducto, eq(t20MProducto.idProducto, t30MProductoPedido.idProducto))
    .innerJoin(t20PUnidadMedida, eq(t20PUnidadMedida.idUm, t20MProducto.idUm))
    .innerJoin(t20PTipoProducto, eq(t20PTipoProducto.idTipoProducto, t20MProducto.idTipoProducto))
    .groupBy(
      t30MProductoPedido.idProducto,
      t20MProducto.codSerfel,
      t20MProducto.nomProducto,
      t20PUnidadMedida.nomUm,
      t20PTipoProducto.nomTipoProducto
    )
    .orderBy(asc(t20PTipoProducto.nomTipoProducto), asc(t20MProducto.nomProducto));
}

async function fetchTotalsPedido(
  db: Db,
  idRutas: number[]
): Promise<{ numFacturas: number | string; total: string | null }> {
  const rows = await db
    .select({
      numFacturas: sql<number>`COUNT(${t30MPedido.idPedido})`,
      total: sql<string | null>`SUM(${t30MPedido.precioTotal})`,
    })
    .from(t30MPedido)
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t30MPedido.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .where(eq(t30MPedido.idEstado, ESTADO_PEDIDO_VIGENTE));
  return rows[0] ?? { numFacturas: 0, total: null };
}
```

3d. Replace `getCargoListData` with the tipo-aware version:

```ts
export async function getCargoListData(
  db: Db,
  rutas: RutaSelection,
  tipo: CargoTipo
): Promise<CargoListData> {
  const idRutas = rutas.map((r) => r.idRuta);
  if (tipo === "pedidos") {
    const [detail, totals] = await Promise.all([
      fetchDetailPedido(db, idRutas),
      fetchTotalsPedido(db, idRutas),
    ]);
    // Pedidos have no porcion link, so obs is always [].
    return assembleCargoList(rutas, detail, [], totals);
  }
  const [detail, porciones, totals] = await Promise.all([
    fetchDetail(db, idRutas),
    fetchPorciones(db, idRutas),
    fetchTotals(db, idRutas),
  ]);
  return assembleCargoList(rutas, detail, porciones, totals);
}
```

- [ ] **Step 4: Update the existing Ventas test call to pass tipo**

In `lambdas/rutas/tests/service.test.ts`, the existing test `"aggregates per product across finalized, undelivered ventas in the routes"` calls `getCargoListData(db, [...])`. Add the tipo argument:

```ts
    const data = await getCargoListData(db, [
      { idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" },
      { idRuta: SEED.rutaSur, nomRuta: "Ruta Sur" },
    ], "ventas");
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas test -- rutas/tests/service.test.ts`
Expected: PASS — both the Ventas and new Pedidos cases, plus the `assembleCargoList` unit tests.

- [ ] **Step 6: Commit**

```bash
git add lambdas/rutas/service.ts lambdas/rutas/tests/service.test.ts lambdas/rutas/tests/helpers.ts
git commit -m "feat(rutas): pedidos source for cargo-list data"
```

---

### Task 4: App parses the new request body

**Files:**
- Modify: `lambdas/rutas/app.ts`
- Test: `lambdas/rutas/tests/app.test.ts`

**Interfaces:**
- Consumes: `CargoListRequestSchema` from `@serfel/shared`; `getCargoListData(db, rutas, tipo)` from Task 3.
- Produces: `POST /api/routes/cargoList` now expects body `{ tipo?: CargoTipo, rutas: RutaSelection }` and returns the PDF.

- [ ] **Step 1: Write the failing tests**

In `lambdas/rutas/tests/app.test.ts`, replace the existing `"returns a PDF for a valid selection"` test body to use the new shape, and add a pedidos case plus an invalid-tipo case:

```ts
  it("POST /api/routes/cargoList returns a PDF for a valid ventas selection", async () => {
    const app = await appPromise;
    const res = await app.request(
      "/api/routes/cargoList",
      postJson({ tipo: "ventas", rutas: [{ idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" }] })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it("POST /api/routes/cargoList returns a PDF for a pedidos selection", async () => {
    const app = await appPromise;
    const res = await app.request(
      "/api/routes/cargoList",
      postJson({ tipo: "pedidos", rutas: [{ idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" }] })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
  });

  it("POST /api/routes/cargoList 400s on an invalid tipo", async () => {
    const app = await appPromise;
    const res = await app.request(
      "/api/routes/cargoList",
      postJson({ tipo: "otros", rutas: [{ idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" }] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });
```

Note: the existing `"400s on an empty selection"` test posts `[]`; leave it — a bare array no longer matches `CargoListRequestSchema`, so it still yields 400 VALIDACION.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/lambdas test -- rutas/tests/app.test.ts`
Expected: FAIL — app still parses `RutaSelectionSchema`, so `{ tipo, rutas }` bodies don't reach the PDF path.

- [ ] **Step 3: Update the route handler**

In `lambdas/rutas/app.ts`:

3a. Change the import:

```ts
import { CargoListRequestSchema, type ApiErrorBody } from "@serfel/shared";
```

3b. Replace the `cargoList` handler body's parse + call:

```ts
  app.post("/routes/cargoList", async (c) => {
    const raw = await c.req.json().catch(() => {
      throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
    });
    const parsed = CargoListRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "Debe enviar al menos una ruta");
    }
    const data = await getCargoListData(await deps.getDb(), parsed.data.rutas, parsed.data.tipo);
    const pdf = await renderCargoListPdf(data);
    // application/pdf is treated as binary by hono/aws-lambda (base64-encoded,
    // isBase64Encoded=true), and HTTP API decodes it for the browser.
    return new Response(pdf as BodyInit, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  });
```

(`RutaSelectionSchema` is no longer referenced in `app.ts`; ensure it is removed from the import.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas test -- rutas/tests/app.test.ts`
Expected: PASS — all cargoList cases green.

- [ ] **Step 5: Commit**

```bash
git add lambdas/rutas/app.ts lambdas/rutas/tests/app.test.ts
git commit -m "feat(rutas): cargoList endpoint accepts tipo in request body"
```

---

### Task 5: Frontend — send tipo from the API service and store

**Files:**
- Modify: `apps/frontend/src/app/features/listado-carga/listado-carga-api.service.ts`
- Modify: `apps/frontend/src/app/features/listado-carga/listado-carga-store.ts`

**Interfaces:**
- Consumes: `CargoTipo`, `RutaSelection` from `@serfel/shared`; `selectedRutas` from `listado-carga-logic`.
- Produces:
  - `ListadoCargaApi.cargoList(sel: RutaSelection, tipo: CargoTipo)` → posts `{ tipo, rutas: sel }`.
  - `ListadoCargaStore.tipo: WritableSignal<CargoTipo>` (default `"ventas"`), consumed by the component and passed through `generatePdf()`.

This task has no unit test (no store spec exists and the spec keeps `listado-carga-logic.spec.ts` unchanged); it is verified by typecheck in Task 7 and by the component wiring in Task 6.

- [ ] **Step 1: Update the API service**

Replace `listado-carga-api.service.ts`'s `cargoList`:

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { CargoTipo, RutaDto, RutaSelection } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ListadoCargaApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list() {
    return this.http.get<RutaDto[]>(`${this.base}/routes`);
  }
  cargoList(sel: RutaSelection, tipo: CargoTipo) {
    return this.http.post(`${this.base}/routes/cargoList`, { tipo, rutas: sel }, {
      responseType: "blob",
    });
  }
}
```

- [ ] **Step 2: Add the tipo signal to the store**

In `listado-carga-store.ts`:

2a. Add `CargoTipo` to the `@serfel/shared` type import:

```ts
import type { ApiErrorBody, CargoTipo, RutaDto } from "@serfel/shared";
```

2b. Add the signal next to the other signals (after `errorMsg`):

```ts
  readonly tipo = signal<CargoTipo>("ventas");
```

2c. Pass it through `generatePdf()`:

```ts
  async generatePdf(): Promise<Blob> {
    this.generating.set(true);
    try {
      return await firstValueFrom(
        this.api.cargoList(selectedRutas(this.rutas(), this.selected()), this.tipo())
      );
    } finally {
      this.generating.set(false);
    }
  }
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm --filter @serfel/frontend exec tsc -p tsconfig.app.json --noEmit`
Expected: PASS (no type errors in the two files). If `tsconfig.app.json` is absent, use `pnpm --filter @serfel/frontend exec tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/listado-carga/listado-carga-api.service.ts apps/frontend/src/app/features/listado-carga/listado-carga-store.ts
git commit -m "feat(frontend): thread cargo-list tipo through store and api"
```

---

### Task 6: Frontend — radio group in the page component

**Files:**
- Modify: `apps/frontend/src/app/features/listado-carga/listado-carga-page.component.ts`

**Interfaces:**
- Consumes: `ListadoCargaStore.tipo` (writable signal) from Task 5.
- Produces: two radios ("Ventas" / "Pedidos") above the rutas card, bound to `store.tipo`, default Ventas.

- [ ] **Step 1: Add the radio group to the template**

In `listado-carga-page.component.ts`, insert this block inside `.page-body`, immediately before `<div class="rutas-card">` (and after the `@if (store.errorMsg()...)` block):

```html
      <div class="tipo-row">
        <label class="tipo-opt">
          <input type="radio" name="tipo" [checked]="store.tipo() === 'ventas'" (change)="store.tipo.set('ventas')" />
          <span>Ventas</span>
        </label>
        <label class="tipo-opt">
          <input type="radio" name="tipo" [checked]="store.tipo() === 'pedidos'" (change)="store.tipo.set('pedidos')" />
          <span>Pedidos</span>
        </label>
      </div>
```

- [ ] **Step 2: Add matching styles**

In the same component's `styles` array, add these rules (append inside the existing template-literal string, after the `.rutas-empty` rule):

```css
    .tipo-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .tipo-opt { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
    .tipo-opt input { width: 16px; height: 16px; accent-color: var(--accent, #7c3aed); }
```

- [ ] **Step 3: Verify it typechecks / builds**

Run: `pnpm --filter @serfel/frontend exec tsc -p tsconfig.app.json --noEmit`
Expected: PASS. (`store.tipo.set(...)` is valid because `tipo` is a `WritableSignal`.)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/listado-carga/listado-carga-page.component.ts
git commit -m "feat(frontend): ventas/pedidos radio on Listado Carga page"
```

---

### Task 7: Full verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Backend + shared tests**

Ensure MariaDB is up: `docker compose -f packages/db/docker-compose.yml up -d` (container `db-mariadb-1` on `127.0.0.1:3307`).
Run: `pnpm --filter @serfel/shared test && pnpm --filter @serfel/lambdas test`
Expected: all green — shared schema cases, rutas service (Ventas + Pedidos), rutas app (all cargoList cases), pdf tests.

- [ ] **Step 2: Repo typecheck**

Run: `pnpm typecheck`
Expected: PASS (root `tsc --noEmit`).

- [ ] **Step 3: Frontend build**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds; no template or type errors for the listado-carga feature.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Start the frontend (`pnpm --filter @serfel/frontend start`), open the Listado Carga page, confirm the Ventas/Pedidos radios render with Ventas preselected, select rutas, and click "Imprimir listado" under each tipo to confirm a PDF opens. Pedidos rows should show an empty Obs column.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore(rutas): verification fixups for ventas/pedidos toggle"
```
(Skip if nothing changed.)
