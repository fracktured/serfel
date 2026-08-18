# Precio Producto Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy `listPrecioProducto` module to the new stack as a `precios` vertical slice — price-list CRUD plus a per-product pricing grid that surfaces and edits the volume-discount tramo tiers.

**Architecture:** New Hono Lambda (`lambdas/precios`) behind the Cognito JWT authorizer, admin-only. Pure pricing math lives in `@serfel/shared` and is imported by both the Lambda (source of truth) and the Angular drawer (live preview). Angular 20 feature `features/precios` with a page (list selector + grid + bulk bar) and a per-product edit drawer. No DB migration — the tramo columns already exist.

**Tech Stack:** TypeScript, Hono, Drizzle ORM (MySQL/MariaDB), Zod, Vitest, Angular 20 (standalone + signals), SST v3.

## Global Constraints

- Node >= 22, pnpm workspaces, ARM64 Lambda. Run commands from repo root.
- Module is **admin-only**: `MODULE_ROLES.precios = [1]` (1 = Administrador), matching legacy `idTipoUsuario == 1`.
- **Never read or write `40_m_precio_producto.porcen_desc`** — it is a dead column. On upsert it keeps its default (0). Discounts derive from `max_porcen_desc` + tramos only.
- **No DB schema migration.** The tramo columns already exist in `t40MPrecioProducto`.
- Pricing formulas (verbatim): `impuestos% = iva + (producto.impuesto>0 ? 99_p_impuesto.valor : 0)`; `precioBase = precioNeto + round(precioNeto*impuestos/100)`; sell price at discount `d%` = `round(precioBase*(1-d/100))`; `margen% = round((precioNeto*(1-d/100)/costoProm - 1)*100)`, `null` when `costoProm<=0`.
- `40_m_lista_precio.id_lista_precio` is **not** AUTO_INCREMENT. Create assigns `MAX(id_lista_precio)+1` inside a transaction (legacy behavior). This is the one sanctioned hand-assigned PK; do not add AUTO_INCREMENT (that ALTER on this populated FK-parent table is the documented 1834/1452 trap).
- Lambda tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` first.
- Every new API route MUST be added to `infra/api.ts` (explicit routes; a missing one is a browser CORS 404).
- Deploy to dev uses `AWS_PROFILE=admin-christian` + Node 22 + `./scripts/sst-deploy.sh --stage dev` (not needed during this plan; CI deploys on push to main).

---

## File Structure

- `packages/shared/src/precios.ts` — Zod schemas, DTO types, and pure pricing functions. **Created.**
- `packages/shared/src/precios.spec.ts` — schema + pricing unit tests. **Created.**
- `packages/shared/src/index.ts` — add `export * from "./precios";`. **Modified.**
- `packages/shared/src/authz.ts` — add `precios: [1]` to `MODULE_ROLES`. **Modified.**
- `lambdas/precios/{types,errors,authz,index,app,service}.ts` — Hono slice. **Created.**
- `lambdas/precios/tests/{helpers,service.test,app.test}.ts` — Vitest. **Created.**
- `infra/api.ts` — add `PreciosFn` + route array. **Modified.**
- `apps/frontend/src/app/features/precios/precios-api.service.ts` — HTTP client. **Created.**
- `apps/frontend/src/app/features/precios/precios-store.ts` — signal store. **Created.**
- `apps/frontend/src/app/features/precios/precios-page.component.ts` — page. **Created.**
- `apps/frontend/src/app/features/precios/precio-producto-drawer.component.ts` — drawer. **Created.**
- `apps/frontend/src/app/app.routes.ts` — add `/precios` route. **Modified.**
- `apps/frontend/src/app/core/nav.ts` — add Precios leaf. **Modified.**

---

## Task 1: Shared schemas, DTOs, and pure pricing (`@serfel/shared`)

**Files:**
- Create: `packages/shared/src/precios.ts`
- Create: `packages/shared/src/precios.spec.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/authz.ts`

**Interfaces:**
- Consumes: `ESTADO_ACTIVO`, `ESTADO_INACTIVO` from `./productos`.
- Produces (imported by Tasks 2–7):
  - Types: `ListaPrecioInput`, `ListaPrecioDto`, `Tramo`, `PrecioProductoInput`, `BulkAction`, `BulkInput`, `PrecioVentaValor`, `PrecioProductoRowDto`, `PricingParams`.
  - Schemas: `ListaPrecioInputSchema`, `PrecioProductoInputSchema`, `BulkInputSchema`.
  - Functions: `computePrecioBase(precioNeto, impuestosPorcen)`, `computeMargen(precioNeto, porcenDesc, costoProm)`, `computePreciosVenta(p: PricingParams)`, `buildPrecioProductoRow(args)`.
  - `MODULE_ROLES.precios`.

- [ ] **Step 1: Write the failing tests**

Create `packages/shared/src/precios.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ListaPrecioInputSchema, PrecioProductoInputSchema, BulkInputSchema,
  computePrecioBase, computeMargen, computePreciosVenta, buildPrecioProductoRow,
  type Tramo,
} from "./precios";

const ZERO_TRAMOS: Tramo[] = [
  { cantidad: 0, maxPorcen: 0 },
  { cantidad: 0, maxPorcen: 0 },
  { cantidad: 0, maxPorcen: 0 },
];

describe("precios schemas", () => {
  it("accepts a valid lista name and rejects empty / too long", () => {
    expect(ListaPrecioInputSchema.safeParse({ nombre: "Mayoristas" }).success).toBe(true);
    expect(ListaPrecioInputSchema.safeParse({ nombre: "" }).success).toBe(false);
    expect(ListaPrecioInputSchema.safeParse({ nombre: "x".repeat(16) }).success).toBe(false);
  });

  it("requires exactly 3 tramos and 0..100 percentages", () => {
    const base = { precioNeto: 1000, maxPorcenDesc: 10, tramos: ZERO_TRAMOS };
    expect(PrecioProductoInputSchema.safeParse(base).success).toBe(true);
    expect(PrecioProductoInputSchema.safeParse({ ...base, maxPorcenDesc: 101 }).success).toBe(false);
    expect(PrecioProductoInputSchema.safeParse({ ...base, tramos: ZERO_TRAMOS.slice(0, 2) }).success).toBe(false);
  });

  it("rejects non-ascending set tramo quantities", () => {
    const tramos: Tramo[] = [
      { cantidad: 10, maxPorcen: 5 },
      { cantidad: 10, maxPorcen: 8 },
      { cantidad: 0, maxPorcen: 0 },
    ];
    const r = PrecioProductoInputSchema.safeParse({ precioNeto: 1000, maxPorcenDesc: 0, tramos });
    expect(r.success).toBe(false);
  });

  it("bulk: valor required except for clearMaxDesc", () => {
    expect(BulkInputSchema.safeParse({ action: "clearMaxDesc", idProductos: [1] }).success).toBe(true);
    expect(BulkInputSchema.safeParse({ action: "setPrecioNeto", idProductos: [1] }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ action: "setMaxDesc", valor: 200, idProductos: [1] }).success).toBe(false);
  });
});

describe("pricing math", () => {
  it("precioBase adds rounded taxes", () => {
    expect(computePrecioBase(1000, 19)).toBe(1190);
    expect(computePrecioBase(1000, 39)).toBe(1390); // 19 iva + 20 extra
  });

  it("margen is null when costoProm <= 0, else rounded percent", () => {
    expect(computeMargen(1000, 0, 0)).toBeNull();
    expect(computeMargen(1000, 0, 900)).toBe(11); // (1000/900-1)*100
    expect(computeMargen(1000, 10, 900)).toBe(0);  // (900/900-1)*100
  });

  it("computePreciosVenta yields only V1 when no tramos set", () => {
    const vals = computePreciosVenta({
      precioNeto: 1000, maxPorcenDesc: 10, tramos: ZERO_TRAMOS, costoProm: 900, impuestosPorcen: 19,
    });
    expect(vals).toHaveLength(1);
    expect(vals[0].precioVenta).toBe(1071); // round(1190*0.9)
  });

  it("computePreciosVenta adds a value per set tramo", () => {
    const tramos: Tramo[] = [
      { cantidad: 10, maxPorcen: 15 },
      { cantidad: 50, maxPorcen: 20 },
      { cantidad: 0, maxPorcen: 0 },
    ];
    const vals = computePreciosVenta({
      precioNeto: 1000, maxPorcenDesc: 10, tramos, costoProm: 900, impuestosPorcen: 19,
    });
    expect(vals.map((v) => v.etiqueta)).toEqual(["1+", "≥10", "≥50"]);
    expect(vals[2].precioVenta).toBe(952); // round(1190*0.8)
  });

  it("buildPrecioProductoRow flags bajoCosto when a tier sells below cost", () => {
    const row = buildPrecioProductoRow({
      idProducto: 1, codSerfel: 100, nomProducto: "P", costoProm: 1000,
      precioNeto: 1000, maxPorcenDesc: 0,
      tramos: [{ cantidad: 10, maxPorcen: 30 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
      impuestosPorcen: 19,
    });
    expect(row.bajoCosto).toBe(true); // round(1190*0.7)=833 < 1000
    expect(row.preciosVenta).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/shared exec vitest run src/precios.spec.ts`
Expected: FAIL — `Cannot find module './precios'`.

- [ ] **Step 3: Implement `packages/shared/src/precios.ts`**

```ts
import { z } from "zod";
import { ESTADO_ACTIVO, ESTADO_INACTIVO } from "./productos";

export { ESTADO_ACTIVO, ESTADO_INACTIVO };

/** ---- Listas de Precio ---- */
export const ListaPrecioInputSchema = z.object({
  nombre: z.string().trim().min(1).max(15),
});
export type ListaPrecioInput = z.infer<typeof ListaPrecioInputSchema>;

export interface ListaPrecioDto {
  idListaPrecio: number;
  nombre: string;
  idEstado: number;
}

/** ---- Tramos (volume tiers) ---- */
export const TramoSchema = z.object({
  cantidad: z.number().int().nonnegative(), // 0 = tier unused
  maxPorcen: z.number().int().min(0).max(100),
});
export type Tramo = z.infer<typeof TramoSchema>;

export const PrecioProductoInputSchema = z
  .object({
    precioNeto: z.number().int().nonnegative(),
    maxPorcenDesc: z.number().int().min(0).max(100),
    tramos: z.array(TramoSchema).length(3),
  })
  .superRefine((val, ctx) => {
    const setQ = val.tramos.filter((t) => t.cantidad > 0).map((t) => t.cantidad);
    for (let i = 1; i < setQ.length; i++) {
      if (setQ[i] <= setQ[i - 1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tramos"],
          message: "Las cantidades de los tramos deben ser estrictamente ascendentes",
        });
        break;
      }
    }
  });
export type PrecioProductoInput = z.infer<typeof PrecioProductoInputSchema>;

/** ---- Bulk actions ---- */
export const BulkActionSchema = z.enum(["setPrecioNeto", "setMaxDesc", "clearMaxDesc"]);
export type BulkAction = z.infer<typeof BulkActionSchema>;

export const BulkInputSchema = z
  .object({
    action: BulkActionSchema,
    valor: z.number().int().nonnegative().optional(),
    idProductos: z.array(z.number().int().positive()).min(1),
  })
  .superRefine((v, ctx) => {
    if (v.action !== "clearMaxDesc" && v.valor === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "valor es requerido" });
    }
    if (v.action === "setMaxDesc" && v.valor !== undefined && v.valor > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "El descuento máximo es 100" });
    }
  });
export type BulkInput = z.infer<typeof BulkInputSchema>;

/** ---- Grid DTOs ---- */
export interface PrecioVentaValor {
  etiqueta: string; // "1+", "≥10", ...
  cantidadDesde: number;
  porcenDesc: number;
  precioVenta: number;
  margen: number | null;
}

export interface PrecioProductoRowDto {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  costoProm: number;
  precioNeto: number;
  precioBase: number;
  maxPorcenDesc: number;
  tramos: Tramo[]; // length 3
  impuestosPorcen: number;
  margenBase: number | null;
  preciosVenta: PrecioVentaValor[]; // 1..4
  bajoCosto: boolean;
}

/** ---- Pure pricing ---- */
export interface PricingParams {
  precioNeto: number;
  maxPorcenDesc: number;
  tramos: Tramo[];
  costoProm: number;
  impuestosPorcen: number;
}

export function computePrecioBase(precioNeto: number, impuestosPorcen: number): number {
  return precioNeto + Math.round((precioNeto * impuestosPorcen) / 100);
}

export function computeMargen(
  precioNeto: number,
  porcenDesc: number,
  costoProm: number
): number | null {
  if (!costoProm || costoProm <= 0) return null;
  const netoConDesc = precioNeto * (1 - porcenDesc / 100);
  return Math.round((netoConDesc / costoProm - 1) * 100);
}

export function computePreciosVenta(p: PricingParams): PrecioVentaValor[] {
  const base = computePrecioBase(p.precioNeto, p.impuestosPorcen);
  const make = (etiqueta: string, cantidadDesde: number, porcenDesc: number): PrecioVentaValor => ({
    etiqueta,
    cantidadDesde,
    porcenDesc,
    precioVenta: Math.round(base * (1 - porcenDesc / 100)),
    margen: computeMargen(p.precioNeto, porcenDesc, p.costoProm),
  });
  const values = [make("1+", 1, p.maxPorcenDesc)];
  for (const t of p.tramos) {
    if (t.cantidad > 0) values.push(make(`≥${t.cantidad}`, t.cantidad, t.maxPorcen));
  }
  return values;
}

export function buildPrecioProductoRow(args: {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  costoProm: number;
  precioNeto: number;
  maxPorcenDesc: number;
  tramos: Tramo[];
  impuestosPorcen: number;
}): PrecioProductoRowDto {
  const preciosVenta = computePreciosVenta(args);
  return {
    idProducto: args.idProducto,
    codSerfel: args.codSerfel,
    nomProducto: args.nomProducto,
    costoProm: args.costoProm,
    precioNeto: args.precioNeto,
    precioBase: computePrecioBase(args.precioNeto, args.impuestosPorcen),
    maxPorcenDesc: args.maxPorcenDesc,
    tramos: args.tramos,
    impuestosPorcen: args.impuestosPorcen,
    margenBase: computeMargen(args.precioNeto, args.maxPorcenDesc, args.costoProm),
    preciosVenta,
    bajoCosto: args.costoProm > 0 && preciosVenta.some((v) => args.costoProm >= v.precioVenta),
  };
}
```

- [ ] **Step 4: Wire exports and authz**

In `packages/shared/src/index.ts` add at the end:

```ts
export * from "./precios";
```

In `packages/shared/src/authz.ts`, add the `precios` key inside `MODULE_ROLES`:

```ts
  marcas: [1], // 1 = Administrador
  precios: [1], // 1 = Administrador
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @serfel/shared exec vitest run src/precios.spec.ts`
Expected: PASS (all).
Then `pnpm --filter @serfel/shared exec tsc --noEmit` — Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/precios.ts packages/shared/src/precios.spec.ts packages/shared/src/index.ts packages/shared/src/authz.ts
git commit -m "feat(shared): precios schemas, DTOs, and pure pricing math"
```

---

## Task 2: Lambda scaffolding + list CRUD service

**Files:**
- Create: `lambdas/precios/types.ts`, `lambdas/precios/errors.ts`, `lambdas/precios/authz.ts`, `lambdas/precios/index.ts`, `lambdas/precios/service.ts`
- Create: `lambdas/precios/tests/helpers.ts`, `lambdas/precios/tests/service.test.ts`

**Interfaces:**
- Consumes: `@serfel/shared` (Task 1), `@serfel/db` (`t40MListaPrecio`, `t20MProducto`, `t40MPrecioProducto`, `t99PIva`, `t99PImpuesto`, plus seed tables), Drizzle.
- Produces (used by Tasks 3–4): `AppDeps`, `AppEnv` (types.ts); `AppError`, `isDbUnreachable` (errors.ts); `requireModule` (authz.ts); service fns `getUserTipo`, `listListas`, `createLista`, `updateLista`, `deactivateLista`.

- [ ] **Step 1: Add `precios` error codes to shared**

The Lambda's `AppError` uses `ApiErrorCode`. In `packages/shared/src/productos.ts`, extend the `ApiErrorCode` union with the two new codes (append before the closing `;`):

```ts
  | "LISTA_NO_ENCONTRADA"
  | "PRECIO_PRODUCTO_NO_ENCONTRADO";
```

Run `pnpm --filter @serfel/shared exec tsc --noEmit` — Expected: no errors. Commit later with Task 2.

- [ ] **Step 2: Create scaffolding files (copied from the `marcas` slice, retargeted)**

`lambdas/precios/types.ts`:

```ts
import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  getIdUsuario: (c: Context) => number | null;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};
```

`lambdas/precios/errors.ts`: identical to `lambdas/marcas/errors.ts` (copy verbatim).

`lambdas/precios/authz.ts`: identical to `lambdas/marcas/authz.ts` (copy verbatim — it imports `getUserTipo` from `./service`, which Task 2 defines).

`lambdas/precios/index.ts`: identical to `lambdas/marcas/index.ts` except the final import is `import { createApp } from "./app";` (unchanged). Copy verbatim; `app.ts` arrives in Task 4, so `index.ts` will not typecheck until then — that is expected and covered by Task 4's typecheck.

- [ ] **Step 3: Write the failing list-CRUD tests**

Create `lambdas/precios/tests/helpers.ts`:

```ts
import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb, migrateSchemaOnly, type Db,
  t99PEstado, t10PTipoUsuario, t10MUsuario,
  t20PMarca, t20PUnidadMedida, t20PTipoProducto, t20MProducto,
  t99PIva, t99PImpuesto, t40MListaPrecio,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));

export const SEED = {
  idUsuario: 1, tipoAdmin: 1, tipoVendedor: 2, idUsuarioVendedor: 2,
  // productos
  prodBarato: 101, prodCaro: 102,
  iva: 19, impuestoExtraId: 1, impuestoExtraValor: 20,
} as const;

export async function setupPreciosTestDb(
  dbName: string
): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false }
  );
  await migrateSchemaOnly(db, MIGRATIONS);

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    { idUsuario: SEED.idUsuario, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin Test",
      apellPatUsuario: "User", apellMatUsuario: "X", password: "unused", idTipoUsuario: SEED.tipoAdmin,
      direccionUsuario: "-", idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1 },
    { idUsuario: SEED.idUsuarioVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vendedor Test",
      apellPatUsuario: "User", apellMatUsuario: "Y", password: "unused", idTipoUsuario: SEED.tipoVendedor,
      direccionUsuario: "-", idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1 },
  ]);

  // pricing prerequisites
  await db.insert(t99PIva).values([{ iva: SEED.iva }]);
  await db.insert(t99PImpuesto).values([
    { idImpuesto: SEED.impuestoExtraId, nomImpuesto: "IABA", valor: SEED.impuestoExtraValor, idImpIss: 0 },
  ]);
  await db.insert(t20PMarca).values([{ idMarca: 1, nomMarca: "MARCA", descMarca: "", idEstado: 1 }]);
  await db.insert(t20PUnidadMedida).values([{ idUm: 1, nomUm: "UN" }]);
  await db.insert(t20PTipoProducto).values([{ idTipoProducto: 0, nomTipoProducto: "SIN TIPO", descTipoProducto: "" }]);
  await db.insert(t20MProducto).values([
    { idProducto: SEED.prodBarato, nomProducto: "Barato", descProducto: "", codBarraProducto: "",
      idTipoProducto: 0, idMarca: 1, idUm: 1, idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
      idEstado: 1, costoProm: "900.00", ultFechaCompra: null, codSerfel: 101, impuesto: 0, usaPorciones: 0 },
    { idProducto: SEED.prodCaro, nomProducto: "Caro", descProducto: "", codBarraProducto: "",
      idTipoProducto: 0, idMarca: 1, idUm: 1, idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
      idEstado: 1, costoProm: "5000.00", ultFechaCompra: null, codSerfel: 102, impuesto: SEED.impuestoExtraId, usaPorciones: 0 },
  ]);

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}

/** Helper to seed a lista directly (bypasses createLista) for grid tests. */
export async function seedLista(db: Db, id: number, nombre: string, idEstado = 1): Promise<void> {
  await db.insert(t40MListaPrecio).values({
    idListaPrecio: id, nomListaPrecio: nombre, idUsuarioMod: SEED.idUsuario,
    ultFechaMod: "2026-01-01 00:00:00", idEstado,
  });
}
```

Create `lambdas/precios/tests/service.test.ts` (list-CRUD portion):

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { listListas, createLista, updateLista, deactivateLista } from "../service";
import { setupPreciosTestDb, SEED } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupPreciosTestDb("serfel_test_precios_service"));
});
afterAll(async () => { await teardown(); });

describe("listas de precio CRUD", () => {
  it("creates the first lista with id 1 and lists it", async () => {
    const created = await createLista(db, { nombre: "Mayoristas" }, SEED.idUsuario);
    expect(created.idListaPrecio).toBe(1);
    expect(created.idEstado).toBe(1);
    expect((await listListas(db)).map((l) => l.nombre)).toContain("Mayoristas");
  });

  it("assigns MAX+1 for the next lista", async () => {
    const created = await createLista(db, { nombre: "Minoristas" }, SEED.idUsuario);
    expect(created.idListaPrecio).toBe(2);
  });

  it("rejects a duplicate active name", async () => {
    await expect(createLista(db, { nombre: "Mayoristas" }, SEED.idUsuario))
      .rejects.toMatchObject({ code: "NOMBRE_EN_USO" });
  });

  it("renames a lista", async () => {
    const created = await createLista(db, { nombre: "Temporal" }, SEED.idUsuario);
    const renamed = await updateLista(db, created.idListaPrecio, { nombre: "Definitiva" }, SEED.idUsuario);
    expect(renamed.nombre).toBe("Definitiva");
  });

  it("deactivate then re-create reactivates the same id", async () => {
    const created = await createLista(db, { nombre: "Reciclable" }, SEED.idUsuario);
    const del = await deactivateLista(db, created.idListaPrecio, SEED.idUsuario);
    expect(del.idEstado).toBe(0);
    expect((await listListas(db)).map((l) => l.nombre)).not.toContain("Reciclable");
    const again = await createLista(db, { nombre: "Reciclable" }, SEED.idUsuario);
    expect(again.idListaPrecio).toBe(created.idListaPrecio); // reactivated, not a new id
    expect(again.idEstado).toBe(1);
  });

  it("throws LISTA_NO_ENCONTRADA renaming a missing id", async () => {
    await expect(updateLista(db, 999, { nombre: "X" }, SEED.idUsuario))
      .rejects.toMatchObject({ code: "LISTA_NO_ENCONTRADA" });
  });
});
```

- [ ] **Step 3b: Run the tests to verify they fail**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait`
Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/precios/tests/service.test.ts`
Expected: FAIL — `../service` has no `listListas`/`createLista`/etc.

- [ ] **Step 4: Implement the list-CRUD half of `lambdas/precios/service.ts`**

```ts
import { and, asc, eq, ne, sql } from "drizzle-orm";
import {
  t40MListaPrecio, t10MUsuario, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO,
  type ListaPrecioDto, type ListaPrecioInput,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const NOW = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const listaColumns = {
  idListaPrecio: t40MListaPrecio.idListaPrecio,
  nombre: t40MListaPrecio.nomListaPrecio,
  idEstado: t40MListaPrecio.idEstado,
};

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

async function getListaDto(db: DbOrTx, id: number): Promise<ListaPrecioDto> {
  const rows = await (db as Db).select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.idListaPrecio, id));
  if (rows.length === 0) {
    throw new AppError("LISTA_NO_ENCONTRADA", 404, `Lista de precio ${id} no existe`);
  }
  return rows[0];
}

export async function listListas(db: Db): Promise<ListaPrecioDto[]> {
  return db.select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t40MListaPrecio.nomListaPrecio));
}

async function findByName(tx: DbOrTx, nombre: string) {
  const rows = await (tx as Db).select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.nomListaPrecio, nombre));
  return rows[0] ?? null;
}

export async function createLista(
  db: Db, input: ListaPrecioInput, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    const existing = await findByName(tx, input.nombre);
    if (existing && existing.idEstado === ESTADO_ACTIVO) {
      throw new AppError("NOMBRE_EN_USO", 409, `La lista "${input.nombre}" ya existe`);
    }
    if (existing && existing.idEstado === ESTADO_INACTIVO) {
      await tx.update(t40MListaPrecio)
        .set({ idEstado: ESTADO_ACTIVO, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
        .where(eq(t40MListaPrecio.idListaPrecio, existing.idListaPrecio));
      return getListaDto(tx, existing.idListaPrecio);
    }
    const [{ next }] = await tx
      .select({ next: sql<number>`COALESCE(MAX(${t40MListaPrecio.idListaPrecio}), 0) + 1` })
      .from(t40MListaPrecio);
    await tx.insert(t40MListaPrecio).values({
      idListaPrecio: next, nomListaPrecio: input.nombre,
      idUsuarioMod: idUsuario, ultFechaMod: NOW(), idEstado: ESTADO_ACTIVO,
    });
    return getListaDto(tx, next);
  });
}

export async function updateLista(
  db: Db, id: number, input: ListaPrecioInput, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    await getListaDto(tx, id); // 404 if missing
    const clash = await (tx as Db).select({ id: t40MListaPrecio.idListaPrecio })
      .from(t40MListaPrecio)
      .where(and(
        eq(t40MListaPrecio.idEstado, ESTADO_ACTIVO),
        eq(t40MListaPrecio.nomListaPrecio, input.nombre),
        ne(t40MListaPrecio.idListaPrecio, id),
      ));
    if (clash.length > 0) {
      throw new AppError("NOMBRE_EN_USO", 409, `La lista "${input.nombre}" ya existe`);
    }
    await tx.update(t40MListaPrecio)
      .set({ nomListaPrecio: input.nombre, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
      .where(eq(t40MListaPrecio.idListaPrecio, id));
    return getListaDto(tx, id);
  });
}

export async function deactivateLista(
  db: Db, id: number, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    const current = await getListaDto(tx, id);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx.update(t40MListaPrecio)
      .set({ idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
      .where(eq(t40MListaPrecio.idListaPrecio, id));
    return getListaDto(tx, id);
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/precios/tests/service.test.ts`
Expected: PASS (list-CRUD describe block).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/productos.ts lambdas/precios/types.ts lambdas/precios/errors.ts lambdas/precios/authz.ts lambdas/precios/index.ts lambdas/precios/service.ts lambdas/precios/tests/helpers.ts lambdas/precios/tests/service.test.ts
git commit -m "feat(precios): lambda scaffolding + listas de precio CRUD"
```

---

## Task 3: Grid query, per-product upsert, and bulk apply

**Files:**
- Modify: `lambdas/precios/service.ts`
- Modify: `lambdas/precios/tests/service.test.ts`

**Interfaces:**
- Consumes: Task 2 service helpers + `buildPrecioProductoRow`, `PrecioProductoInput`, `BulkInput` from `@serfel/shared`.
- Produces: `getGrid(db, idLista)`, `upsertPrecioProducto(db, idLista, idProducto, input)`, `bulkApply(db, idLista, input)` → all return `PrecioProductoRowDto`(s).

- [ ] **Step 1: Append the failing grid/upsert/bulk tests**

Add to `lambdas/precios/tests/service.test.ts`:

Add these imports to the top of the file (alongside the existing ones):

```ts
import { and, eq } from "drizzle-orm";
import { t40MPrecioProducto } from "@serfel/db";
import { getGrid, upsertPrecioProducto, bulkApply } from "../service";
import { seedLista } from "./helpers"; // SEED is already imported in Task 2's block

describe("grid + pricing writes", () => {
  const LISTA = 50;
  beforeAll(async () => { await seedLista(db, LISTA, "Grid"); });

  it("grid returns a row per active product, unpriced products default to 0", async () => {
    const rows = await getGrid(db, LISTA);
    expect(rows).toHaveLength(2);
    const barato = rows.find((r) => r.idProducto === SEED.prodBarato)!;
    expect(barato.precioNeto).toBe(0);
    expect(barato.preciosVenta).toHaveLength(1); // no tramos
    expect(barato.impuestosPorcen).toBe(19); // producto.impuesto = 0
    const caro = rows.find((r) => r.idProducto === SEED.prodCaro)!;
    expect(caro.impuestosPorcen).toBe(39); // 19 iva + 20 extra
  });

  it("upsert sets precio_neto, derives precio, stores tramos, and re-reads", async () => {
    const updated = await upsertPrecioProducto(db, LISTA, SEED.prodBarato, {
      precioNeto: 1000, maxPorcenDesc: 10,
      tramos: [{ cantidad: 10, maxPorcen: 15 }, { cantidad: 50, maxPorcen: 20 }, { cantidad: 0, maxPorcen: 0 }],
    });
    expect(updated.precioBase).toBe(1190);
    expect(updated.preciosVenta.map((v) => v.etiqueta)).toEqual(["1+", "≥10", "≥50"]);

    // persisted: a second read reflects it
    const rows = await getGrid(db, LISTA);
    const barato = rows.find((r) => r.idProducto === SEED.prodBarato)!;
    expect(barato.precioNeto).toBe(1000);
    expect(barato.tramos[1].cantidad).toBe(50);
  });

  it("upsert never writes porcen_desc (stays 0)", async () => {
    await upsertPrecioProducto(db, LISTA, SEED.prodCaro, {
      precioNeto: 5000, maxPorcenDesc: 5,
      tramos: [{ cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
    });
    // assert the dead column directly via a select on the raw table
    const rows = await db.select({ pd: t40MPrecioProducto.porcenDesc })
      .from(t40MPrecioProducto)
      .where(and(
        eq(t40MPrecioProducto.idListaPrecio, LISTA),
        eq(t40MPrecioProducto.idProducto, SEED.prodCaro),
      ));
    expect(rows[0].pd).toBe(0);
  });

  it("bulk setPrecioNeto applies to all listed products", async () => {
    const affected = await bulkApply(db, LISTA, {
      action: "setPrecioNeto", valor: 2000, idProductos: [SEED.prodBarato, SEED.prodCaro],
    });
    expect(affected.every((r) => r.precioNeto === 2000)).toBe(true);
  });

  it("bulk clearMaxDesc zeroes max_porcen_desc", async () => {
    await upsertPrecioProducto(db, LISTA, SEED.prodBarato, {
      precioNeto: 1000, maxPorcenDesc: 30,
      tramos: [{ cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
    });
    const affected = await bulkApply(db, LISTA, {
      action: "clearMaxDesc", idProductos: [SEED.prodBarato],
    });
    expect(affected[0].maxPorcenDesc).toBe(0);
  });

  it("getGrid throws LISTA_NO_ENCONTRADA for a missing list", async () => {
    await expect(getGrid(db, 9999)).rejects.toMatchObject({ code: "LISTA_NO_ENCONTRADA" });
  });
});
```

> Note: keep the raw-column assertion in the "never writes porcen_desc" test as the direct `db.select` shown; delete the stray `db.execute?.(...)` placeholder lines when implementing — they are illustrative only.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/precios/tests/service.test.ts`
Expected: FAIL — `getGrid`/`upsertPrecioProducto`/`bulkApply` not exported.

- [ ] **Step 3: Implement the grid/write half of `service.ts`**

Add imports at the top of `service.ts`:

```ts
import { inArray } from "drizzle-orm";
import { t20MProducto, t40MPrecioProducto, t99PIva, t99PImpuesto } from "@serfel/db";
import {
  buildPrecioProductoRow, computePrecioBase,
  type BulkInput, type PrecioProductoInput, type PrecioProductoRowDto, type Tramo,
} from "@serfel/shared";
```

Append these functions:

```ts
async function getIva(db: DbOrTx): Promise<number> {
  const rows = await (db as Db).select({ iva: t99PIva.iva }).from(t99PIva).limit(1);
  return rows.length > 0 ? rows[0].iva : 0;
}

/** id_impuesto -> valor%, for products whose impuesto > 0. */
async function getImpuestoValores(db: DbOrTx): Promise<Map<number, number>> {
  const rows = await (db as Db)
    .select({ id: t99PImpuesto.idImpuesto, valor: t99PImpuesto.valor })
    .from(t99PImpuesto);
  return new Map(rows.map((r) => [r.id, r.valor]));
}

function impuestosPorcenFor(iva: number, productoImpuesto: number, valores: Map<number, number>): number {
  return iva + (productoImpuesto > 0 ? valores.get(productoImpuesto) ?? 0 : 0);
}

function tramosFromRow(pp: {
  cantTramo1: number; maxPorcenTramo1: number;
  cantTramo2: number; maxPorcenTramo2: number;
  cantTramo3: number; maxPorcenTramo3: number;
} | null): Tramo[] {
  return [
    { cantidad: pp?.cantTramo1 ?? 0, maxPorcen: pp?.maxPorcenTramo1 ?? 0 },
    { cantidad: pp?.cantTramo2 ?? 0, maxPorcen: pp?.maxPorcenTramo2 ?? 0 },
    { cantidad: pp?.cantTramo3 ?? 0, maxPorcen: pp?.maxPorcenTramo3 ?? 0 },
  ];
}

export async function getGrid(db: Db, idLista: number): Promise<PrecioProductoRowDto[]> {
  await getListaDto(db, idLista); // 404 if missing
  const iva = await getIva(db);
  const valores = await getImpuestoValores(db);

  const rows = await db
    .select({
      idProducto: t20MProducto.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      costoProm: t20MProducto.costoProm,
      impuesto: t20MProducto.impuesto,
      precioNeto: t40MPrecioProducto.precioNeto,
      maxPorcenDesc: t40MPrecioProducto.maxPorcenDesc,
      cantTramo1: t40MPrecioProducto.cantTramo1,
      maxPorcenTramo1: t40MPrecioProducto.maxPorcenTramo1,
      cantTramo2: t40MPrecioProducto.cantTramo2,
      maxPorcenTramo2: t40MPrecioProducto.maxPorcenTramo2,
      cantTramo3: t40MPrecioProducto.cantTramo3,
      maxPorcenTramo3: t40MPrecioProducto.maxPorcenTramo3,
    })
    .from(t20MProducto)
    .leftJoin(
      t40MPrecioProducto,
      and(
        eq(t40MPrecioProducto.idProducto, t20MProducto.idProducto),
        eq(t40MPrecioProducto.idListaPrecio, idLista),
      ),
    )
    .where(eq(t20MProducto.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t20MProducto.nomProducto));

  return rows.map((r) =>
    buildPrecioProductoRow({
      idProducto: r.idProducto,
      codSerfel: r.codSerfel,
      nomProducto: r.nomProducto,
      costoProm: Number(r.costoProm ?? 0),
      precioNeto: r.precioNeto ?? 0,
      maxPorcenDesc: r.maxPorcenDesc ?? 0,
      tramos: tramosFromRow(r.precioNeto === null ? null : r),
      impuestosPorcen: impuestosPorcenFor(iva, r.impuesto, valores),
    }),
  );
}

/** Loads iva + the product's impuesto valor to derive precio (base) for a write. */
async function impuestosForProducto(tx: DbOrTx, idProducto: number): Promise<number> {
  const iva = await getIva(tx);
  const prod = await (tx as Db)
    .select({ impuesto: t20MProducto.impuesto })
    .from(t20MProducto)
    .where(eq(t20MProducto.idProducto, idProducto))
    .limit(1);
  const impuesto = prod[0]?.impuesto ?? 0;
  if (impuesto <= 0) return iva;
  const valores = await getImpuestoValores(tx);
  return iva + (valores.get(impuesto) ?? 0);
}

async function writeRow(
  tx: DbOrTx,
  idLista: number,
  idProducto: number,
  patch: {
    precioNeto?: number;
    maxPorcenDesc?: number;
    tramos?: Tramo[];
  },
): Promise<void> {
  const impuestos = await impuestosForProducto(tx, idProducto);
  const precioNeto = patch.precioNeto ?? 0;
  const precio = patch.precioNeto !== undefined ? computePrecioBase(precioNeto, impuestos) : 0;
  const t = patch.tramos;
  // INSERT ... ON DUPLICATE KEY UPDATE — porcen_desc is never in the update set.
  const insertValues = {
    idListaPrecio: idLista,
    idProducto,
    precioNeto: patch.precioNeto ?? 0,
    precio,
    porcenDesc: 0,
    maxPorcenDesc: patch.maxPorcenDesc ?? 0,
    cantTramo1: t?.[0].cantidad ?? 0, maxPorcenTramo1: t?.[0].maxPorcen ?? 0,
    cantTramo2: t?.[1].cantidad ?? 0, maxPorcenTramo2: t?.[1].maxPorcen ?? 0,
    cantTramo3: t?.[2].cantidad ?? 0, maxPorcenTramo3: t?.[2].maxPorcen ?? 0,
  };
  const updateSet: Record<string, number> = {};
  if (patch.precioNeto !== undefined) { updateSet.precioNeto = precioNeto; updateSet.precio = precio; }
  if (patch.maxPorcenDesc !== undefined) updateSet.maxPorcenDesc = patch.maxPorcenDesc;
  if (t) {
    updateSet.cantTramo1 = t[0].cantidad; updateSet.maxPorcenTramo1 = t[0].maxPorcen;
    updateSet.cantTramo2 = t[1].cantidad; updateSet.maxPorcenTramo2 = t[1].maxPorcen;
    updateSet.cantTramo3 = t[2].cantidad; updateSet.maxPorcenTramo3 = t[2].maxPorcen;
  }
  await (tx as Db).insert(t40MPrecioProducto).values(insertValues).onDuplicateKeyUpdate({ set: updateSet });
}

async function readRow(db: DbOrTx, idLista: number, idProducto: number): Promise<PrecioProductoRowDto> {
  const grid = await getGrid(db as Db, idLista);
  const row = grid.find((r) => r.idProducto === idProducto);
  if (!row) {
    throw new AppError("PRECIO_PRODUCTO_NO_ENCONTRADO", 404,
      `Producto ${idProducto} no está activo en la lista ${idLista}`);
  }
  return row;
}

export async function upsertPrecioProducto(
  db: Db, idLista: number, idProducto: number, input: PrecioProductoInput
): Promise<PrecioProductoRowDto> {
  await getListaDto(db, idLista);
  await db.transaction(async (tx) => {
    await writeRow(tx, idLista, idProducto, {
      precioNeto: input.precioNeto, maxPorcenDesc: input.maxPorcenDesc, tramos: input.tramos,
    });
  });
  return readRow(db, idLista, idProducto);
}

export async function bulkApply(
  db: Db, idLista: number, input: BulkInput
): Promise<PrecioProductoRowDto[]> {
  await getListaDto(db, idLista);
  await db.transaction(async (tx) => {
    for (const idProducto of input.idProductos) {
      if (input.action === "setPrecioNeto") {
        await writeRow(tx, idLista, idProducto, { precioNeto: input.valor! });
      } else if (input.action === "setMaxDesc") {
        await writeRow(tx, idLista, idProducto, { maxPorcenDesc: input.valor! });
      } else {
        await writeRow(tx, idLista, idProducto, { maxPorcenDesc: 0 });
      }
    }
  });
  const grid = await getGrid(db, idLista);
  const wanted = new Set(input.idProductos);
  return grid.filter((r) => wanted.has(r.idProducto));
}
```

> `void inArray` import is unused only if you don't reference it; remove the `inArray` import if the final code doesn't use it to keep the linter happy.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/precios/tests/service.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add lambdas/precios/service.ts lambdas/precios/tests/service.test.ts
git commit -m "feat(precios): grid query, per-product upsert, and bulk apply"
```

---

## Task 4: Hono router + app tests

**Files:**
- Create: `lambdas/precios/app.ts`
- Create: `lambdas/precios/tests/app.test.ts`

**Interfaces:**
- Consumes: service fns (Tasks 2–3), `requireModule`, schemas from `@serfel/shared`.
- Produces: `createApp(deps: AppDeps)` mounting all routes at `/api`.

- [ ] **Step 1: Write the failing app tests**

Create `lambdas/precios/tests/app.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { createApp } from "../app";
import { setupPreciosTestDb, seedLista, SEED } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;

function makeApp(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario });
}

beforeAll(async () => {
  ({ db, teardown } = await setupPreciosTestDb("serfel_test_precios_app"));
  await seedLista(db, 70, "AppLista");
});
afterAll(async () => { await teardown(); });

describe("precios app", () => {
  const app = () => makeApp(SEED.idUsuario);

  it("POST then GET /api/listas-precio round-trips", async () => {
    const post = await app().request("/api/listas-precio", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Nueva" }),
    });
    expect(post.status).toBe(201);
    const get = await app().request("/api/listas-precio");
    const list = (await get.json()) as { nombre: string }[];
    expect(list.map((l) => l.nombre)).toContain("Nueva");
  });

  it("GET grid returns rows", async () => {
    const res = await app().request("/api/listas-precio/70/productos");
    expect(res.status).toBe(200);
    expect(((await res.json()) as unknown[]).length).toBe(2);
  });

  it("PATCH a product upserts pricing", async () => {
    const res = await app().request(`/api/listas-precio/70/productos/${SEED.prodBarato}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        precioNeto: 1000, maxPorcenDesc: 10,
        tramos: [{ cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
      }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { precioBase: number }).precioBase).toBe(1190);
  });

  it("POST bulk validates body (400 on missing valor)", async () => {
    const res = await app().request("/api/listas-precio/70/productos/bulk", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "setPrecioNeto", idProductos: [SEED.prodBarato] }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDACION");
  });

  it("403 when user is not mapped", async () => {
    const res = await makeApp(null).request("/api/listas-precio");
    expect(res.status).toBe(403);
  });

  it("403 PROHIBIDO for a non-admin tipo", async () => {
    const res = await makeApp(SEED.idUsuarioVendedor).request("/api/listas-precio");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("PROHIBIDO");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/precios/tests/app.test.ts`
Expected: FAIL — `../app` has no `createApp`.

- [ ] **Step 3: Implement `lambdas/precios/app.ts`**

```ts
import { Hono, type Context } from "hono";
import {
  ListaPrecioInputSchema, PrecioProductoInputSchema, BulkInputSchema,
  type ApiErrorBody, type ApiErrorCode,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import {
  listListas, createLista, updateLista, deactivateLista,
  getGrid, upsertPrecioProducto, bulkApply,
} from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorCode, message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseIntParam(c: Context, name: string, label: string): number {
  const v = Number(c.req.param(name));
  if (!Number.isInteger(v) || v <= 0) {
    throw new AppError("VALIDACION", 400, `${label} inválido`);
  }
  return v;
}

async function parseBody<T>(c: Context, schema: { safeParse: (x: unknown) => any }): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data as T;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json(errorBody(err.code, err.message), err.status);
    if (isDbUnreachable(err)) {
      return c.json(errorBody("DB_NO_DISPONIBLE",
        "La base de datos no está disponible en este momento. Intenta más tarde."), 503);
    }
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) {
      throw new AppError("NO_AUTORIZADO", 403,
        "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)");
    }
    c.set("idUsuario", idUsuario);
    await next();
  });

  const gate = requireModule("precios", deps);
  app.use("/listas-precio", gate);
  app.use("/listas-precio/*", gate);

  app.get("/listas-precio", async (c) =>
    c.json(await listListas(await deps.getDb())));

  app.post("/listas-precio", async (c) => {
    const input = await parseBody(c, ListaPrecioInputSchema);
    return c.json(await createLista(await deps.getDb(), input as any, c.get("idUsuario")), 201);
  });

  app.patch("/listas-precio/:id", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    const input = await parseBody(c, ListaPrecioInputSchema);
    return c.json(await updateLista(await deps.getDb(), id, input as any, c.get("idUsuario")));
  });

  app.delete("/listas-precio/:id", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    return c.json(await deactivateLista(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.get("/listas-precio/:id/productos", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    return c.json(await getGrid(await deps.getDb(), id));
  });

  app.patch("/listas-precio/:id/productos/:idProducto", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    const idProducto = parseIntParam(c, "idProducto", "id de producto");
    const input = await parseBody(c, PrecioProductoInputSchema);
    return c.json(await upsertPrecioProducto(await deps.getDb(), id, idProducto, input as any));
  });

  app.post("/listas-precio/:id/productos/bulk", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    const input = await parseBody(c, BulkInputSchema);
    return c.json(await bulkApply(await deps.getDb(), id, input as any));
  });

  return app;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/precios/tests/app.test.ts`
Expected: PASS (all).
Run: `pnpm typecheck`
Expected: no errors (this also confirms `index.ts` from Task 2 now compiles).

- [ ] **Step 5: Commit**

```bash
git add lambdas/precios/app.ts lambdas/precios/tests/app.test.ts
git commit -m "feat(precios): Hono router + app tests"
```

---

## Task 5: SST wiring (`infra/api.ts`)

**Files:**
- Modify: `infra/api.ts`

**Interfaces:**
- Consumes: nothing new. Mirrors the `MarcasFn` block and `marcasRoutes` array.
- Produces: a deployed `PreciosFn` reachable at the routes below (verified by typecheck; deploy happens in CI).

- [ ] **Step 1: Add the Function definition**

After the `marcasFn` block in `infra/api.ts`, add:

```ts
const preciosFn = new sst.aws.Function("PreciosFn", {
  handler: "lambdas/precios/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-precios`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```

- [ ] **Step 2: Add the route array**

After the `marcasRoutes` loop, add:

```ts
const preciosRoutes = [
  "GET /api/listas-precio",
  "POST /api/listas-precio",
  "PATCH /api/listas-precio/{id}",
  "DELETE /api/listas-precio/{id}",
  "GET /api/listas-precio/{id}/productos",
  "PATCH /api/listas-precio/{id}/productos/{idProducto}",
  "POST /api/listas-precio/{id}/productos/bulk",
] as const;
for (const route of preciosRoutes) {
  api.route(route, preciosFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add infra/api.ts
git commit -m "feat(precios): SST function + API Gateway routes"
```

---

## Task 6: Frontend data layer (api service + store)

**Files:**
- Create: `apps/frontend/src/app/features/precios/precios-api.service.ts`
- Create: `apps/frontend/src/app/features/precios/precios-store.ts`

**Interfaces:**
- Consumes: `@serfel/shared` DTOs/inputs, `environment.apiUrl`.
- Produces: `PreciosApi` (HTTP), `PreciosStore` (signals: `listas`, `selectedListaId`, `rows`, `loading`, `errorMsg`, `selectedIds`; methods `loadListas`, `selectLista`, `createLista`, `renameLista`, `deleteLista`, `saveProducto`, `applyBulk`, `toggleRow`, `selectAll`, `clearSelection`), plus `apiError`.

- [ ] **Step 1: Create the API service**

`apps/frontend/src/app/features/precios/precios-api.service.ts`:

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  ListaPrecioDto, ListaPrecioInput, PrecioProductoRowDto, PrecioProductoInput, BulkInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class PreciosApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  listas() {
    return this.http.get<ListaPrecioDto[]>(`${this.base}/listas-precio`);
  }
  createLista(input: ListaPrecioInput) {
    return this.http.post<ListaPrecioDto>(`${this.base}/listas-precio`, input);
  }
  renameLista(id: number, input: ListaPrecioInput) {
    return this.http.patch<ListaPrecioDto>(`${this.base}/listas-precio/${id}`, input);
  }
  deleteLista(id: number) {
    return this.http.delete<ListaPrecioDto>(`${this.base}/listas-precio/${id}`);
  }
  grid(id: number) {
    return this.http.get<PrecioProductoRowDto[]>(`${this.base}/listas-precio/${id}/productos`);
  }
  saveProducto(id: number, idProducto: number, input: PrecioProductoInput) {
    return this.http.patch<PrecioProductoRowDto>(
      `${this.base}/listas-precio/${id}/productos/${idProducto}`, input);
  }
  bulk(id: number, input: BulkInput) {
    return this.http.post<PrecioProductoRowDto[]>(
      `${this.base}/listas-precio/${id}/productos/bulk`, input);
  }
}
```

- [ ] **Step 2: Create the store**

`apps/frontend/src/app/features/precios/precios-store.ts`:

```ts
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, ListaPrecioDto, ListaPrecioInput,
  PrecioProductoRowDto, PrecioProductoInput, BulkInput,
} from "@serfel/shared";
import { PreciosApi } from "./precios-api.service";

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class PreciosStore {
  private api = inject(PreciosApi);

  readonly listas = signal<ListaPrecioDto[]>([]);
  readonly selectedListaId = signal<number | null>(null);
  readonly rows = signal<PrecioProductoRowDto[]>([]);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly filter = signal("");
  readonly selectedIds = signal<Set<number>>(new Set());

  readonly selectedLista = computed(() =>
    this.listas().find((l) => l.idListaPrecio === this.selectedListaId()) ?? null);

  readonly filteredRows = computed(() => {
    const q = this.filter().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) =>
      `${r.codSerfel} ${r.nomProducto}`.toLowerCase().includes(q));
  });

  async loadListas(): Promise<void> {
    this.errorMsg.set(null);
    try {
      const listas = await firstValueFrom(this.api.listas());
      this.listas.set(listas);
      if (this.selectedListaId() === null && listas.length > 0) {
        await this.selectLista(listas[0].idListaPrecio);
      }
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudieron cargar las listas de precio.");
    }
  }

  async selectLista(id: number): Promise<void> {
    this.selectedListaId.set(id);
    this.clearSelection();
    await this.loadGrid();
  }

  async loadGrid(): Promise<void> {
    const id = this.selectedListaId();
    if (id === null) { this.rows.set([]); return; }
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.rows.set(await firstValueFrom(this.api.grid(id)));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar la lista de productos.");
    } finally {
      this.loading.set(false);
    }
  }

  async createLista(input: ListaPrecioInput): Promise<ListaPrecioDto> {
    const created = await firstValueFrom(this.api.createLista(input));
    await this.loadListas();
    await this.selectLista(created.idListaPrecio);
    return created;
  }
  async renameLista(id: number, input: ListaPrecioInput): Promise<void> {
    await firstValueFrom(this.api.renameLista(id, input));
    await this.loadListas();
  }
  async deleteLista(id: number): Promise<void> {
    await firstValueFrom(this.api.deleteLista(id));
    this.selectedListaId.set(null);
    await this.loadListas();
  }

  async saveProducto(idProducto: number, input: PrecioProductoInput): Promise<void> {
    const id = this.selectedListaId();
    if (id === null) return;
    const updated = await firstValueFrom(this.api.saveProducto(id, idProducto, input));
    this.rows.update((rs) => rs.map((r) => (r.idProducto === idProducto ? updated : r)));
  }

  async applyBulk(input: BulkInput): Promise<void> {
    const id = this.selectedListaId();
    if (id === null) return;
    const affected = await firstValueFrom(this.api.bulk(id, input));
    const byId = new Map(affected.map((r) => [r.idProducto, r]));
    this.rows.update((rs) => rs.map((r) => byId.get(r.idProducto) ?? r));
    this.clearSelection();
  }

  toggleRow(idProducto: number): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      next.has(idProducto) ? next.delete(idProducto) : next.add(idProducto);
      return next;
    });
  }
  selectAll(): void {
    this.selectedIds.set(new Set(this.filteredRows().map((r) => r.idProducto)));
  }
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }
  setFilter(q: string): void { this.filter.set(q); }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. (The store and api service have no Angular templates, so the root `tsc --noEmit` fully covers them; the components' template compilation is verified by the frontend build in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/precios/precios-api.service.ts apps/frontend/src/app/features/precios/precios-store.ts
git commit -m "feat(frontend): precios data layer (api service + store)"
```

---

## Task 7: Frontend UI (drawer + page) and routing/nav

**Files:**
- Create: `apps/frontend/src/app/features/precios/precio-producto-drawer.component.ts`
- Create: `apps/frontend/src/app/features/precios/precios-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`
- Modify: `apps/frontend/src/app/core/nav.ts`

**Interfaces:**
- Consumes: `PreciosStore`, shared pricing (`computePreciosVenta`, `computePrecioBase`) for live preview, `PrecioProductoRowDto`, `PrecioProductoInputSchema`.
- Produces: `PrecioProductoDrawerComponent`, `PreciosPageComponent` (route `/precios`).

- [ ] **Step 1: Create the drawer component**

`apps/frontend/src/app/features/precios/precio-producto-drawer.component.ts`:

```ts
import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  PrecioProductoInputSchema, computePreciosVenta, computePrecioBase,
  type PrecioProductoRowDto, type PrecioProductoInput, type Tramo,
} from "@serfel/shared";

@Component({
  selector: "app-precio-producto-drawer",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <aside class="drawer" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ row.nomProducto }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="form-grid">
          <div class="form-field">
            <label>Precio Neto</label>
            <input type="number" min="0" [(ngModel)]="precioNeto" (ngModelChange)="touch()" />
          </div>
          <div class="form-field">
            <label>Máx. % Descuento</label>
            <input type="number" min="0" max="100" [(ngModel)]="maxPorcenDesc" (ngModelChange)="touch()" />
          </div>
          <div class="form-field full">
            <label>Precio Base (con impuestos {{ row.impuestosPorcen }}%)</label>
            <div class="readout">{{ preview().base | number:'1.0-0' }}</div>
          </div>

          <div class="form-field full"><strong>Tramos por volumen</strong></div>
          @for (t of tramos; track $index) {
            <div class="form-field">
              <label>Tramo {{ $index + 1 }} — cantidad desde</label>
              <input type="number" min="0" [(ngModel)]="t.cantidad" (ngModelChange)="touch()" />
            </div>
            <div class="form-field">
              <label>Máx. % en tramo {{ $index + 1 }}</label>
              <input type="number" min="0" max="100" [(ngModel)]="t.maxPorcen" (ngModelChange)="touch()" />
            </div>
          }

          <div class="form-field full">
            <label>Precio Venta (preview)</label>
            <ul class="preview-list">
              @for (v of preview().values; track v.etiqueta) {
                <li>
                  <span class="badge">{{ v.etiqueta }}</span>
                  {{ v.precioVenta | number:'1.0-0' }}
                  <em [class.neg]="v.margen !== null && v.margen <= 0">
                    ({{ v.margen === null ? '—' : (v.margen + '%') }})
                  </em>
                </li>
              }
            </ul>
          </div>

          @if (tramoWarning(); as w) { <span class="soft-warn full">{{ w }}</span> }
          @if (error(); as e) { <span class="login-error full" style="padding:6px 10px">{{ e }}</span> }
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .drawer { position: fixed; top: 0; right: 0; height: 100vh; width: min(480px, 92vw);
      background: #fff; box-shadow: -8px 0 24px rgba(0,0,0,.15); overflow-y: auto; padding: 20px; }
    .readout { font-weight: 700; font-size: 18px; }
    .preview-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .preview-list .badge { display: inline-block; min-width: 44px; padding: 2px 8px; border-radius: 999px;
      background: #eff6ff; color: #2563eb; font-weight: 600; text-align: center; margin-right: 8px; }
    .preview-list em { color: #16a34a; font-style: normal; }
    .preview-list em.neg { color: #dc2626; }
    .soft-warn { color: #b45309; background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 8px; padding: 6px 10px; font-size: 13px; }
    .form-field.full, .full { grid-column: 1 / -1; }
  `],
})
export class PrecioProductoDrawerComponent implements OnInit {
  @Input({ required: true }) row!: PrecioProductoRowDto;
  @Output() save = new EventEmitter<PrecioProductoInput>();
  @Output() cancel = new EventEmitter<void>();

  precioNeto = 0;
  maxPorcenDesc = 0;
  tramos: Tramo[] = [];
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  private readonly rev = signal(0);

  readonly preview = computed(() => {
    this.rev();
    const base = computePrecioBase(this.num(this.precioNeto), this.row.impuestosPorcen);
    const values = computePreciosVenta({
      precioNeto: this.num(this.precioNeto),
      maxPorcenDesc: this.num(this.maxPorcenDesc),
      tramos: this.tramos.map((t) => ({ cantidad: this.num(t.cantidad), maxPorcen: this.num(t.maxPorcen) })),
      costoProm: this.row.costoProm,
      impuestosPorcen: this.row.impuestosPorcen,
    });
    return { base, values };
  });

  // Soft, non-blocking: deeper volume tiers should give an equal-or-larger
  // discount than shallower ones. Warn, but never prevent saving.
  readonly tramoWarning = computed(() => {
    this.rev();
    const pcts = [this.num(this.maxPorcenDesc)];
    for (const t of this.tramos) if (this.num(t.cantidad) > 0) pcts.push(this.num(t.maxPorcen));
    for (let i = 1; i < pcts.length; i++) {
      if (pcts[i] < pcts[i - 1]) {
        return "Un tramo de mayor volumen tiene un % de descuento menor que uno anterior.";
      }
    }
    return null;
  });

  ngOnInit(): void {
    this.precioNeto = this.row.precioNeto;
    this.maxPorcenDesc = this.row.maxPorcenDesc;
    this.tramos = this.row.tramos.map((t) => ({ ...t }));
  }

  private num(v: number): number { return Number.isFinite(+v) ? Math.trunc(+v) : 0; }
  touch(): void { this.rev.update((n) => n + 1); }

  onSave(): void {
    const payload = {
      precioNeto: this.num(this.precioNeto),
      maxPorcenDesc: this.num(this.maxPorcenDesc),
      tramos: this.tramos.map((t) => ({ cantidad: this.num(t.cantidad), maxPorcen: this.num(t.maxPorcen) })),
    };
    const parsed = PrecioProductoInputSchema.safeParse(payload);
    if (!parsed.success) {
      this.error.set(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    this.save.emit(parsed.data);
  }

  setServerError(message: string): void { this.busy.set(false); this.error.set(message); }
}
```

- [ ] **Step 2: Create the page component**

`apps/frontend/src/app/features/precios/precios-page.component.ts`:

```ts
import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import type { PrecioProductoInput, PrecioProductoRowDto } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { PreciosStore, apiError } from "./precios-store";
import { PrecioProductoDrawerComponent } from "./precio-producto-drawer.component";

@Component({
  selector: "app-precios-page",
  standalone: true,
  imports: [FormsModule, DecimalPipe, NavbarComponent, ToastComponent, PrecioProductoDrawerComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Precios de Productos</h1>
          <p>Gestiona las listas de precio y los precios de venta</p>
        </div>
        <div class="hero-actions">
          <select [ngModel]="store.selectedListaId()" (ngModelChange)="onSelectLista($event)">
            @for (l of store.listas(); track l.idListaPrecio) {
              <option [ngValue]="l.idListaPrecio">{{ l.nombre }}</option>
            }
          </select>
          <button class="hero-btn hero-btn-white" (click)="onNewLista()">+ Nueva</button>
          <button class="hero-btn hero-btn-outline" (click)="onRenameLista()" [disabled]="!store.selectedLista()">Renombrar</button>
          <button class="hero-btn hero-btn-outline" (click)="onDeleteLista()" [disabled]="!store.selectedLista()">Eliminar</button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="toolbar">
        <input type="search" placeholder="Buscar producto…"
               [ngModel]="store.filter()" (ngModelChange)="store.setFilter($event)" />
        @if (store.selectedIds().size > 0) {
          <div class="bulk-bar">
            <span>{{ store.selectedIds().size }} seleccionados</span>
            <select [(ngModel)]="bulkAction">
              <option value="setPrecioNeto">Precio Neto</option>
              <option value="setMaxDesc">Máx. % Desc.</option>
              <option value="clearMaxDesc">Borrar Máx. %</option>
            </select>
            @if (bulkAction !== 'clearMaxDesc') {
              <input type="number" min="0" [(ngModel)]="bulkValor" placeholder="valor" />
            }
            <button class="btn-save" (click)="onBulk()">Aplicar</button>
          </div>
        }
      </div>

      @if (store.loading()) { <p>Cargando…</p> }
      @else {
        <table class="grid">
          <thead>
            <tr>
              <th><input type="checkbox" (change)="toggleAll($event)" /></th>
              <th>N</th><th>Producto</th><th>Costo</th><th>Neto</th><th>Base</th>
              <th>Máx%</th><th>Margen</th><th>Precio Venta</th>
            </tr>
          </thead>
          <tbody>
            @for (r of store.filteredRows(); track r.idProducto) {
              <tr [class.bajo-costo]="r.bajoCosto">
                <td><input type="checkbox"
                      [checked]="store.selectedIds().has(r.idProducto)"
                      (change)="store.toggleRow(r.idProducto)" /></td>
                <td>{{ r.codSerfel }}</td>
                <td><button class="link" (click)="openDrawer(r)">{{ r.nomProducto }}</button></td>
                <td>{{ r.costoProm | number:'1.0-0' }}</td>
                <td>{{ r.precioNeto | number:'1.0-0' }}</td>
                <td>{{ r.precioBase | number:'1.0-0' }}</td>
                <td>{{ r.maxPorcenDesc }}%</td>
                <td [class.neg]="r.margenBase !== null && r.margenBase <= 0">
                  {{ r.margenBase === null ? '—' : (r.margenBase + '%') }}
                </td>
                <td>
                  <ul class="pv">
                    @for (v of r.preciosVenta; track v.etiqueta) {
                      <li><span class="badge">{{ v.etiqueta }}</span>
                        {{ v.precioVenta | number:'1.0-0' }}
                        <em [class.neg]="v.margen !== null && v.margen <= 0">
                          ({{ v.margen === null ? '—' : (v.margen + '%') }})</em>
                      </li>
                    }
                  </ul>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-toast></app-toast>

    @if (drawerRow(); as r) {
      <app-precio-producto-drawer #drawer [row]="r"
        (save)="onSaveProducto(r.idProducto, $event)" (cancel)="drawerRow.set(null)">
      </app-precio-producto-drawer>
    }
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .bulk-bar { display: flex; gap: 8px; align-items: center; }
    table.grid { width: 100%; border-collapse: collapse; }
    .grid th, .grid td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
    tr.bajo-costo { background: #fee2e2; }
    .neg { color: #dc2626; font-weight: 600; }
    .link { background: none; border: none; color: #2563eb; cursor: pointer; padding: 0; font: inherit; text-align: left; }
    ul.pv { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
    ul.pv .badge { display: inline-block; min-width: 40px; padding: 1px 6px; border-radius: 999px;
      background: #eff6ff; color: #2563eb; font-weight: 600; text-align: center; margin-right: 6px; font-size: 12px; }
    ul.pv em { color: #16a34a; font-style: normal; }
  `],
})
export class PreciosPageComponent implements OnInit {
  readonly store = inject(PreciosStore);
  private toast = inject(ToastService);
  readonly drawer = viewChild(PrecioProductoDrawerComponent);

  readonly drawerRow = signal<PrecioProductoRowDto | null>(null);
  bulkAction: "setPrecioNeto" | "setMaxDesc" | "clearMaxDesc" = "setPrecioNeto";
  bulkValor: number | null = null;

  async ngOnInit(): Promise<void> {
    await this.store.loadListas();
  }

  async onSelectLista(id: number): Promise<void> { await this.store.selectLista(id); }

  openDrawer(r: PrecioProductoRowDto): void { this.drawerRow.set(r); }

  async onSaveProducto(idProducto: number, input: PrecioProductoInput): Promise<void> {
    try {
      await this.store.saveProducto(idProducto, input);
      this.toast.show("Precio guardado");
      this.drawerRow.set(null);
    } catch (err) {
      this.drawer()?.setServerError(apiError(err)?.message ?? "No se pudo guardar.");
    }
  }

  toggleAll(ev: Event): void {
    (ev.target as HTMLInputElement).checked ? this.store.selectAll() : this.store.clearSelection();
  }

  async onBulk(): Promise<void> {
    const ids = [...this.store.selectedIds()];
    if (ids.length === 0) return;
    try {
      await this.store.applyBulk({
        action: this.bulkAction,
        valor: this.bulkAction === "clearMaxDesc" ? undefined : Number(this.bulkValor ?? 0),
        idProductos: ids,
      });
      this.toast.show("Cambios aplicados");
      this.bulkValor = null;
    } catch (err) {
      this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo aplicar el cambio.");
    }
  }

  async onNewLista(): Promise<void> {
    const nombre = prompt("Nombre de la nueva lista (máx. 15):")?.trim();
    if (!nombre) return;
    try { await this.store.createLista({ nombre }); this.toast.show("Lista creada"); }
    catch (err) { this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo crear la lista."); }
  }

  async onRenameLista(): Promise<void> {
    const lista = this.store.selectedLista();
    if (!lista) return;
    const nombre = prompt("Nuevo nombre:", lista.nombre)?.trim();
    if (!nombre) return;
    try { await this.store.renameLista(lista.idListaPrecio, { nombre }); this.toast.show("Lista renombrada"); }
    catch (err) { this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo renombrar."); }
  }

  async onDeleteLista(): Promise<void> {
    const lista = this.store.selectedLista();
    if (!lista) return;
    if (!confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return;
    try { await this.store.deleteLista(lista.idListaPrecio); this.toast.show("Lista eliminada"); }
    catch (err) { this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo eliminar."); }
  }
}
```

> Before implementing, open `apps/frontend/src/app/core/toast.service.ts` and confirm the method name for showing a message (the plan assumes `show(msg)`). If it differs (e.g. `success`/`push`), use the actual name. Same for `ToastComponent`'s selector (`app-toast`).

- [ ] **Step 3: Register the route**

In `apps/frontend/src/app/app.routes.ts`: add the import and route.

```ts
import { PreciosPageComponent } from './features/precios/precios-page.component';
```
```ts
  { path: 'precios', component: PreciosPageComponent, canActivate: [moduleGuard('precios')] },
```

- [ ] **Step 4: Add the nav leaf**

In `apps/frontend/src/app/core/nav.ts`, inside the "Productos" section's `children` array (next to Marcas), add:

```ts
          { module: "precios", label: "Precios", path: "/precios", icon: SALES_ICON },
```

- [ ] **Step 5: Build to verify**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds (Angular compiles templates + typecheck).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app/features/precios/precio-producto-drawer.component.ts apps/frontend/src/app/features/precios/precios-page.component.ts apps/frontend/src/app/app.routes.ts apps/frontend/src/app/core/nav.ts
git commit -m "feat(frontend): precios page + per-product drawer, route and nav"
```

---

## Task 8: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Root typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 2: All workspace tests**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait`
Run: `pnpm -r test`
Expected: PASS, including `@serfel/shared` precios specs and `@serfel/lambdas` precios service+app tests.

- [ ] **Step 3: Frontend build**

Run: `pnpm --filter @serfel/frontend build`
Expected: success.

- [ ] **Step 4: Commit any fixups, then hand off**

If Steps 1–3 required fixes, commit them:

```bash
git add -A && git commit -m "chore(precios): verification fixups"
```

Deployment happens via CI on push to `main` (builds legacy Angular first, then typecheck → MariaDB → tests → `sst deploy --stage dev` → migrations). No manual deploy step in this plan.

---

## Notes on legacy parity

- Legacy bulk *Nuevo Precio* set `precio_neto = input` and `precio = input + round(input*impuestos/100)`. Reproduced in `writeRow` via `setPrecioNeto`.
- Legacy *Máx. % Descuento* / *Borrar* set/zeroed `max_porcen_desc`. Reproduced via `setMaxDesc` / `clearMaxDesc`.
- Legacy read but never edited the tramo columns; they are now editable only through the per-product drawer (`PATCH .../productos/:idProducto`).
- The disabled legacy *Recargo* action is intentionally omitted.

## Deviation from the spec (intentional)

The spec listed a frontend `precios-logic.spec.ts` for backend/frontend calc parity. Instead of a duplicate frontend pricing module, the pure pricing math lives once in `@serfel/shared` (`precios.ts`) and is imported by both the Lambda and the Angular drawer. Parity is therefore structural (one implementation) and is covered by `packages/shared/src/precios.spec.ts` — no separate frontend logic file is needed. This is stricter DRY than the spec sketch and matches the repo's "one schema, two uses" convention.
