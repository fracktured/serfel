# Rutas / Listado Carga Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy Express/Sequelize route service (`GET /routes`, `POST /routes/cargoList` PDF) to a new Drizzle + Hono `RutasFn` Lambda, and build the matching Listado Carga module in the new Angular app.

**Architecture:** A new `lambdas/rutas/` Lambda mirrors the `lambdas/products` split, adding a dedicated `pdf.ts` so the report layout is isolated from data access. `service.ts` returns a plain `CargoListData` object (no pdfkit), `pdf.ts` buffers a pdfkit document into bytes, and `app.ts` returns it as `application/pdf`. The frontend adds a `features/rutas/` module (api service + signals store + pure logic + standalone page) guarded by `moduleGuard('rutas')`.

**Tech Stack:** TypeScript, Hono, Drizzle ORM (mysql2), pdfkit, Zod, SST (Pulumi) + API Gateway v2, Angular (standalone + signals), Vitest.

## Global Constraints

- Node >= 22; pnpm workspace. Drizzle lambdas live in the `@serfel/lambdas` package (`lambdas/`), not a per-lambda package.
- Module access: `MODULE_ROLES.rutas = [1]` (Administrador only).
- Business filters (verified against legacy): active routes `id_estado = 1`; cargo-list ventas `entregado = 0 AND id_estado = 3` (FINALIZADO).
- No em dashes in AWS resource names/descriptions; use hyphens. Lambda physical name: `serfel-dev-rutas`.
- pdfkit MUST ship unbundled via SST `nodejs: { install: ["pdfkit"] }` (its runtime `.afm` font metrics are not traced by esbuild).
- Prefer IaC (SST). Do not auto-stop `serfel-dev-db`.
- Backend unit/integration tests run against a local MySQL at `127.0.0.1:3307`, user `root`, password `serfel` (same as `lambdas/products/tests`).
- Frontend tests are `*.spec.ts`, `environment: "node"` — test pure logic only, no TestBed/DOM.
- TypeScript: `module: ESNext`, `moduleResolution: bundler`, `strict: true`. Default imports (`import PDFDocument from "pdfkit"`) are allowed.
- Faithfully reproduce the legacy `sumCantidad` display quirk: the summed `DECIMAL(18,3)` string has its last character dropped (truncate to 2 decimals, e.g. `"5.000"` → `"5.00"`).
- Run `pnpm test` from `serfel/` root; typecheck with `pnpm typecheck` from root.

---

## File Structure

**Backend (`lambdas/rutas/`):**
- `types.ts` — `AppDeps`, `AppEnv`, and cargo-list data types (`DetailRow`, `CargoListRow`, `CargoListData`).
- `errors.ts` — `AppError` + `isDbUnreachable` (mirror of products).
- `authz.ts` — `requireModule` (mirror of products).
- `service.ts` — `listActiveRutas`, `getCargoListData`, `assembleCargoList`, `getUserTipo`, constants.
- `pdf.ts` — `renderCargoListPdf(data): Promise<Uint8Array>`.
- `app.ts` — Hono app: routes, auth middleware, error mapping.
- `index.ts` — Lambda handler (DB secret + JWT claim), mirror of products.
- `tests/helpers.ts` — test DB setup + cargo-list seed.
- `tests/service.test.ts`, `tests/pdf.test.ts`, `tests/app.test.ts`.

**Shared (`packages/shared/`):**
- `src/rutas.ts` (new), `src/index.ts` (export), `src/authz.ts` (add module), `tests/rutas.test.ts` (new).

**Infra:**
- `infra/api.ts` — add `RutasFn` + its two routes (products route refactor already applied).

**Frontend (`apps/frontend/src/app/`):**
- `features/rutas/rutas-logic.ts` (+ `.spec.ts`), `rutas-api.service.ts`, `rutas-store.ts`, `rutas-page.component.ts`.
- `app.routes.ts` — add the `rutas` route.

---

### Task 1: Shared — RutaDto, selection schema, rutas module role

**Files:**
- Create: `packages/shared/src/rutas.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/authz.ts:14` (add `rutas` to `MODULE_ROLES`)
- Test: `packages/shared/tests/rutas.test.ts`

**Interfaces:**
- Produces: `RutaDto` (interface), `RutaSelectionSchema` (Zod), `RutaSelection` (type = `{ idRuta: number; nomRuta: string }[]`), and `MODULE_ROLES.rutas = [1]`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/tests/rutas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { RutaSelectionSchema } from "../src/rutas";
import { MODULE_ROLES, tipoCanAccess, modulesForTipo } from "../src/authz";

describe("RutaSelectionSchema", () => {
  it("accepts a non-empty array of {idRuta, nomRuta}", () => {
    const r = RutaSelectionSchema.safeParse([{ idRuta: 1, nomRuta: "Ruta Norte" }]);
    expect(r.success).toBe(true);
  });
  it("rejects an empty array", () => {
    expect(RutaSelectionSchema.safeParse([]).success).toBe(false);
  });
  it("rejects a non-positive idRuta or empty nomRuta", () => {
    expect(RutaSelectionSchema.safeParse([{ idRuta: 0, nomRuta: "x" }]).success).toBe(false);
    expect(RutaSelectionSchema.safeParse([{ idRuta: 1, nomRuta: "" }]).success).toBe(false);
  });
});

describe("rutas module role", () => {
  it("grants rutas to tipo 1 (admin) only", () => {
    expect(MODULE_ROLES.rutas).toEqual([1]);
    expect(tipoCanAccess("rutas", 1)).toBe(true);
    expect(tipoCanAccess("rutas", 3)).toBe(false);
  });
  it("admin modules include both productos and rutas", () => {
    expect(modulesForTipo(1)).toEqual(["productos", "rutas"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd serfel && pnpm --filter @serfel/shared test`
Expected: FAIL — cannot find module `../src/rutas`, and `MODULE_ROLES.rutas` is undefined.

- [ ] **Step 3: Create `packages/shared/src/rutas.ts`**

```ts
import { z } from "zod";

export interface RutaDto {
  idRuta: number;
  nomRuta: string;
  idUsuario: number;
  numDia: number;
  idEstado: number;
}

// cargoList body: only id + nom are needed (nom feeds the PDF "Rutas:" header).
export const RutaSelectionSchema = z
  .array(
    z.object({
      idRuta: z.number().int().positive(),
      nomRuta: z.string().trim().min(1),
    })
  )
  .min(1);
export type RutaSelection = z.infer<typeof RutaSelectionSchema>;
```

- [ ] **Step 4: Export it from `packages/shared/src/index.ts`**

```ts
export * from "./productos";
export * from "./authz";
export * from "./rutas";
```

- [ ] **Step 5: Add the module role in `packages/shared/src/authz.ts`**

Change the `MODULE_ROLES` object so it reads:

```ts
export const MODULE_ROLES = {
  productos: [1], // 1 = Administrador
  rutas: [1], // 1 = Administrador
} as const;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd serfel && pnpm --filter @serfel/shared test`
Expected: PASS (all rutas tests + existing authz/productos tests green).

- [ ] **Step 7: Commit**

```bash
cd serfel
git add packages/shared/src/rutas.ts packages/shared/src/index.ts packages/shared/src/authz.ts packages/shared/tests/rutas.test.ts docs/superpowers/specs docs/superpowers/plans
git commit -m "feat(shared): add RutaDto, cargo-list selection schema, rutas module role"
```

(The spec and plan docs are committed here as the baseline for this feature.)

---

### Task 2: Rutas lambda — data layer (service + seed + tests)

**Files:**
- Create: `lambdas/rutas/types.ts`, `lambdas/rutas/errors.ts`, `lambdas/rutas/service.ts`
- Create: `lambdas/rutas/tests/helpers.ts`, `lambdas/rutas/tests/service.test.ts`

**Interfaces:**
- Consumes: `RutaDto`, `RutaSelection`, `ESTADO_ACTIVO` from `@serfel/shared`; Drizzle tables from `@serfel/db`.
- Produces:
  - `types.ts`: `AppDeps = { getDb(): Promise<Db>; getIdUsuario(c: Context): number | null }`, `AppEnv = { Variables: { idUsuario: number; idTipoUsuario: number } }`, `DetailRow`, `CargoListRow`, `CargoListData`.
  - `service.ts`: `listActiveRutas(db: Db): Promise<RutaDto[]>`, `getCargoListData(db: Db, rutas: RutaSelection): Promise<CargoListData>`, `assembleCargoList(rutas, detail, porciones, totals): CargoListData`, `getUserTipo(db: Db, idUsuario: number): Promise<number | null>`.
  - `tests/helpers.ts`: `setupTestDb(dbName): Promise<{ db; pool; teardown }>`, `SEED` constants.

- [ ] **Step 1: Create `lambdas/rutas/errors.ts`** (identical contract to products)

```ts
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiErrorCode } from "@serfel/shared";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: ContentfulStatusCode,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** mysql2 network-level failures — the dev DB is stopped or unreachable. */
export function isDbUnreachable(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return (
    typeof code === "string" &&
    ["ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST"].includes(code)
  );
}
```

- [ ] **Step 2: Create `lambdas/rutas/types.ts`**

```ts
import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};

/** One row of the grouped cargo-list detail query (pre-assembly). */
export interface DetailRow {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  nomUm: string;
  nomTipoProducto: string;
  sumCantidad: string; // DECIMAL(18,3) sum, as returned by mysql2
  subtotal: string; // DECIMAL sum, as returned by mysql2
}

export interface CargoListRow {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  nomUm: string;
  nomTipoProducto: string;
  sumCantidad: string; // truncated to 2 decimals (legacy quirk)
  subtotal: number;
  obs: number[]; // porcion numeros, [] when none
}

export interface CargoListData {
  nomRutas: string; // "Ruta Norte, Ruta Sur"
  rows: CargoListRow[]; // ordered by tipo_producto, then nom_producto
  totals: { numFacturas: number; total: number };
}
```

- [ ] **Step 3: Write the failing service test**

Create `lambdas/rutas/tests/service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { listActiveRutas, getCargoListData, assembleCargoList } from "../service";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_rutas_service"));
});
afterAll(async () => {
  await teardown();
});

describe("listActiveRutas", () => {
  it("returns only active routes, ordered by nombre", async () => {
    const rutas = await listActiveRutas(db);
    expect(rutas.map((r) => r.nomRuta)).toEqual(["Ruta Norte", "Ruta Sur"]);
    expect(rutas.every((r) => r.idEstado === 1)).toBe(true);
  });
});

describe("getCargoListData", () => {
  it("aggregates per product across finalized, undelivered ventas in the routes", async () => {
    const data = await getCargoListData(db, [
      { idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" },
      { idRuta: SEED.rutaSur, nomRuta: "Ruta Sur" },
    ]);

    expect(data.nomRutas).toBe("Ruta Norte, Ruta Sur");
    // ordered by tipo (BEBIDAS < LACTEOS) then nombre
    expect(data.rows.map((r) => r.nomProducto)).toEqual(["Agua", "Leche"]);

    const agua = data.rows[0];
    expect(agua.sumCantidad).toBe("5.00"); // 2.000 + 3.000 -> "5.000" -> chop
    expect(agua.subtotal).toBe(2500); // 2*500 + 3*500
    expect(agua.obs).toEqual([]);

    const leche = data.rows[1];
    expect(leche.sumCantidad).toBe("1.00");
    expect(leche.subtotal).toBe(720); // 1*(800 - 10%)
    expect(leche.obs).toEqual([5]); // porcion numero from V1

    // V3 (entregado=1) and V4 (id_estado=1) are excluded
    expect(data.totals.numFacturas).toBe(2);
    expect(data.totals.total).toBe(3000); // 1000 + 2000
  });
});

describe("assembleCargoList", () => {
  it("chops the last char of sumCantidad and maps porcion numeros to obs", () => {
    const data = assembleCargoList(
      [{ idRuta: 1, nomRuta: "R1" }],
      [{ idProducto: 7, codSerfel: 100, nomProducto: "X", nomUm: "UNI", nomTipoProducto: "T", sumCantidad: "5.000", subtotal: "2500.000000" }],
      [{ idProducto: 7, numero: 2 }, { idProducto: 7, numero: 9 }],
      { numFacturas: 2, total: "3000" }
    );
    expect(data.rows[0].sumCantidad).toBe("5.00");
    expect(data.rows[0].subtotal).toBe(2500);
    expect(data.rows[0].obs).toEqual([2, 9]);
    expect(data.totals).toEqual({ numFacturas: 2, total: 3000 });
  });

  it("treats a null total as 0", () => {
    const data = assembleCargoList([{ idRuta: 1, nomRuta: "R1" }], [], [], {
      numFacturas: 0,
      total: null,
    });
    expect(data.totals).toEqual({ numFacturas: 0, total: 0 });
  });
});
```

- [ ] **Step 4: Create the test seed `lambdas/rutas/tests/helpers.ts`**

This seeds a full FK-valid graph: three routes (two active, one inactive), two product types, two products, four ventas (two matching, one delivered, one non-finalized), their producto_venta lines, and one porcion.

```ts
import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import { migrate } from "drizzle-orm/mysql2/migrator";
import {
  createDb,
  type Db,
  t99PEstado,
  t10PTipoUsuario,
  t10MUsuario,
  t40MListaPrecio,
  t10PTipoDocto,
  t10MEmpresa,
  t10MCliente,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t20MProducto,
  t40MRuta,
  t40MRutaLocalCliente,
  t40MVenta,
  t40MProductoVenta,
  t20MPorcion,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);
const NOW = "2026-01-01 00:00:00";

export const SEED = {
  usuarioAdmin: 1,
  usuarioVendedor: 2,
  tipoAdmin: 1,
  tipoVendedor: 2,
  empresa: 76000000,
  cliente: 55000000,
  marca: 1,
  tipoBebidas: 1,
  tipoLacteos: 2,
  um: 1,
  prodAgua: 1,
  prodLeche: 2,
  rutaNorte: 1,
  rutaSur: 2,
  rutaVieja: 3,
  localNorte: 500,
  localSur: 501,
  ESTADO_FINALIZADO: 3,
} as const;

export async function setupTestDb(
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
  await migrate(db, { migrationsFolder: MIGRATIONS });

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
    { idEstado: SEED.ESTADO_FINALIZADO, nomEstado: "Finalizado", descEstado: "Finalizado" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    { idUsuario: SEED.usuarioAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin", apellPatUsuario: "T", apellMatUsuario: "T", password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idUsuario: SEED.usuarioVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vend", apellPatUsuario: "T", apellMatUsuario: "T", password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t40MListaPrecio).values({ idListaPrecio: 1, nomListaPrecio: "GENERAL", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t10PTipoDocto).values({ idTipoDocto: 1, nomTipoDocto: "FACTURA", descTipoDocto: "Factura" });
  await db.insert(t10MEmpresa).values({
    rutEmpresa: SEED.empresa, dvEmpresa: "0", razonSocial: "SERFEL", nomFantasia: "SERFEL", direccionEmpresa: "-",
    idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, giro: "-", codActividadEconomica: 1,
    comuna: "-", ciudad: "-", rutRepresentanteLegal: 1, dvRepresentanteLegal: "0", fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });
  await db.insert(t10MCliente).values({
    rutCliente: SEED.cliente, dvCliente: "0", razonSocial: "CLIENTE", idListaPrecio: 1,
    idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t20PMarca).values({ idMarca: SEED.marca, nomMarca: "MARCA" });
  await db.insert(t20PTipoProducto).values([
    { idTipoProducto: SEED.tipoBebidas, nomTipoProducto: "BEBIDAS", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idTipoProducto: SEED.tipoLacteos, nomTipoProducto: "LACTEOS", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t20PUnidadMedida).values({ idUm: SEED.um, nomUm: "UNI" });
  await db.insert(t20MProducto).values([
    { idProducto: SEED.prodAgua, nomProducto: "Agua", descProducto: "", codBarraProducto: "", idTipoProducto: SEED.tipoBebidas, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, codSerfel: 100, impuesto: 0, usaPorciones: 0 },
    { idProducto: SEED.prodLeche, nomProducto: "Leche", descProducto: "", codBarraProducto: "", idTipoProducto: SEED.tipoLacteos, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, codSerfel: 200, impuesto: 0, usaPorciones: 1 },
  ]);
  await db.insert(t40MRuta).values([
    { idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte", idUsuario: SEED.usuarioAdmin, numDia: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idRuta: SEED.rutaSur, nomRuta: "Ruta Sur", idUsuario: SEED.usuarioAdmin, numDia: 2, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idRuta: SEED.rutaVieja, nomRuta: "Ruta Vieja", idUsuario: SEED.usuarioAdmin, numDia: 3, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 0 },
  ]);
  await db.insert(t40MRutaLocalCliente).values([
    { idRuta: SEED.rutaNorte, idLocalCliente: SEED.localNorte },
    { idRuta: SEED.rutaSur, idLocalCliente: SEED.localSur },
  ]);

  const venta = (idVenta: number, idLocalCliente: number, entregado: number, idEstado: number, precioTotal: number) => ({
    idVenta, idListaPrecio: 1, idUsuarioVenta: SEED.usuarioAdmin, numDoctoEmitido: idVenta,
    idTipoDoctoEmitido: 1, rutEmpresa: SEED.empresa, rutCliente: SEED.cliente, idLocalCliente,
    fechaVenta: NOW, entregado, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado, precioTotal,
  });
  await db.insert(t40MVenta).values([
    venta(1, SEED.localNorte, 0, SEED.ESTADO_FINALIZADO, 1000), // matches
    venta(2, SEED.localSur, 0, SEED.ESTADO_FINALIZADO, 2000), // matches
    venta(3, SEED.localNorte, 1, SEED.ESTADO_FINALIZADO, 9999), // entregado -> excluded
    venta(4, SEED.localNorte, 0, 1, 8888), // not finalized -> excluded
  ]);
  await db.insert(t40MProductoVenta).values([
    { idVenta: 1, idProducto: SEED.prodAgua, cantidad: "2.000", precio: 500, porcenDesc: 0 },
    { idVenta: 1, idProducto: SEED.prodLeche, cantidad: "1.000", precio: 800, porcenDesc: 10 },
    { idVenta: 2, idProducto: SEED.prodAgua, cantidad: "3.000", precio: 500, porcenDesc: 0 },
    { idVenta: 3, idProducto: SEED.prodAgua, cantidad: "99.000", precio: 500, porcenDesc: 0 },
    { idVenta: 4, idProducto: SEED.prodAgua, cantidad: "88.000", precio: 500, porcenDesc: 0 },
  ]);
  await db.insert(t20MPorcion).values({
    idProducto: SEED.prodLeche, fecha: NOW, grupo: 1, numero: 5, cantidad: "1.000",
    idVenta: 1, idUsuario: SEED.usuarioAdmin, idEstado: 1,
  });

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}
```

- [ ] **Step 5: Run the service test to verify it fails**

Run: `cd serfel && pnpm --filter @serfel/lambdas test rutas/tests/service`
Expected: FAIL — cannot find module `../service`.

- [ ] **Step 6: Create `lambdas/rutas/service.ts`**

```ts
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  t40MRuta,
  t40MRutaLocalCliente,
  t40MVenta,
  t40MProductoVenta,
  t20MProducto,
  t20MPorcion,
  t20PUnidadMedida,
  t20PTipoProducto,
  t10MUsuario,
  type Db,
} from "@serfel/db";
import { ESTADO_ACTIVO, type RutaDto, type RutaSelection } from "@serfel/shared";
import type { CargoListData, DetailRow } from "./types";

const ESTADO_FINALIZADO = 3;
const NO_ENTREGADO = 0;

export async function listActiveRutas(db: Db): Promise<RutaDto[]> {
  return db
    .select({
      idRuta: t40MRuta.idRuta,
      nomRuta: t40MRuta.nomRuta,
      idUsuario: t40MRuta.idUsuario,
      numDia: t40MRuta.numDia,
      idEstado: t40MRuta.idEstado,
    })
    .from(t40MRuta)
    .where(eq(t40MRuta.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t40MRuta.nomRuta));
}

async function fetchDetail(db: Db, idRutas: number[]): Promise<DetailRow[]> {
  return db
    .select({
      idProducto: t40MProductoVenta.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      nomUm: t20PUnidadMedida.nomUm,
      nomTipoProducto: t20PTipoProducto.nomTipoProducto,
      sumCantidad: sql<string>`SUM(${t40MProductoVenta.cantidad})`,
      subtotal: sql<string>`SUM(${t40MProductoVenta.cantidad} * (${t40MProductoVenta.precio} - ${t40MProductoVenta.precio} * ${t40MProductoVenta.porcenDesc} / 100))`,
    })
    .from(t40MProductoVenta)
    .innerJoin(
      t40MVenta,
      and(
        eq(t40MVenta.idVenta, t40MProductoVenta.idVenta),
        eq(t40MVenta.entregado, NO_ENTREGADO),
        eq(t40MVenta.idEstado, ESTADO_FINALIZADO)
      )
    )
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t40MVenta.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .innerJoin(t20MProducto, eq(t20MProducto.idProducto, t40MProductoVenta.idProducto))
    .innerJoin(t20PUnidadMedida, eq(t20PUnidadMedida.idUm, t20MProducto.idUm))
    .innerJoin(t20PTipoProducto, eq(t20PTipoProducto.idTipoProducto, t20MProducto.idTipoProducto))
    .groupBy(
      t40MProductoVenta.idProducto,
      t20MProducto.codSerfel,
      t20MProducto.nomProducto,
      t20PUnidadMedida.nomUm,
      t20PTipoProducto.nomTipoProducto
    )
    .orderBy(asc(t20PTipoProducto.nomTipoProducto), asc(t20MProducto.nomProducto));
}

async function fetchPorciones(
  db: Db,
  idRutas: number[]
): Promise<{ idProducto: number; numero: number }[]> {
  return db
    .select({ idProducto: t20MPorcion.idProducto, numero: t20MPorcion.numero })
    .from(t20MPorcion)
    .innerJoin(
      t40MVenta,
      and(
        eq(t40MVenta.idVenta, t20MPorcion.idVenta),
        eq(t40MVenta.entregado, NO_ENTREGADO),
        eq(t40MVenta.idEstado, ESTADO_FINALIZADO)
      )
    )
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t40MVenta.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .orderBy(asc(t20MPorcion.idProducto), asc(t20MPorcion.numero));
}

async function fetchTotals(
  db: Db,
  idRutas: number[]
): Promise<{ numFacturas: number | string; total: string | null }> {
  const rows = await db
    .select({
      numFacturas: sql<number>`COUNT(${t40MVenta.idVenta})`,
      total: sql<string | null>`SUM(${t40MVenta.precioTotal})`,
    })
    .from(t40MVenta)
    .innerJoin(
      t40MRutaLocalCliente,
      and(
        eq(t40MRutaLocalCliente.idLocalCliente, t40MVenta.idLocalCliente),
        inArray(t40MRutaLocalCliente.idRuta, idRutas)
      )
    )
    .where(and(eq(t40MVenta.entregado, NO_ENTREGADO), eq(t40MVenta.idEstado, ESTADO_FINALIZADO)));
  return rows[0] ?? { numFacturas: 0, total: null };
}

/**
 * Faithful port of the legacy display quirk: the summed DECIMAL(18,3) string
 * has its last character dropped, truncating to 2 decimals ("5.000" -> "5.00").
 */
function truncateLastChar(value: string): string {
  return value.slice(0, -1);
}

export function assembleCargoList(
  rutas: RutaSelection,
  detail: DetailRow[],
  porciones: { idProducto: number; numero: number }[],
  totals: { numFacturas: number | string; total: string | null }
): CargoListData {
  const obsByProducto = new Map<number, number[]>();
  for (const p of porciones) {
    const arr = obsByProducto.get(p.idProducto) ?? [];
    arr.push(p.numero);
    obsByProducto.set(p.idProducto, arr);
  }
  const rows = detail.map((d) => ({
    idProducto: d.idProducto,
    codSerfel: d.codSerfel,
    nomProducto: d.nomProducto,
    nomUm: d.nomUm,
    nomTipoProducto: d.nomTipoProducto,
    sumCantidad: truncateLastChar(String(d.sumCantidad)),
    subtotal: parseInt(String(d.subtotal), 10) || 0,
    obs: obsByProducto.get(d.idProducto) ?? [],
  }));
  return {
    nomRutas: rutas.map((r) => r.nomRuta).join(", "),
    rows,
    totals: {
      numFacturas: Number(totals.numFacturas) || 0,
      total: totals.total === null ? 0 : parseInt(String(totals.total), 10) || 0,
    },
  };
}

export async function getCargoListData(
  db: Db,
  rutas: RutaSelection
): Promise<CargoListData> {
  const idRutas = rutas.map((r) => r.idRuta);
  const [detail, porciones, totals] = await Promise.all([
    fetchDetail(db, idRutas),
    fetchPorciones(db, idRutas),
    fetchTotals(db, idRutas),
  ]);
  return assembleCargoList(rutas, detail, porciones, totals);
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}
```

- [ ] **Step 7: Run the service test to verify it passes**

Run: `cd serfel && pnpm --filter @serfel/lambdas test rutas/tests/service`
Expected: PASS (listActiveRutas, getCargoListData, assembleCargoList all green).

- [ ] **Step 8: Commit**

```bash
cd serfel
git add lambdas/rutas/errors.ts lambdas/rutas/types.ts lambdas/rutas/service.ts lambdas/rutas/tests/helpers.ts lambdas/rutas/tests/service.test.ts
git commit -m "feat(rutas): data layer for route list and cargo-list aggregation"
```

---

### Task 3: Rutas lambda — cargo-list PDF

**Files:**
- Create: `lambdas/rutas/pdf.ts`, `lambdas/rutas/tests/pdf.test.ts`
- Modify: `lambdas/package.json` (add `pdfkit` + `@types/pdfkit`)

**Interfaces:**
- Consumes: `CargoListData` from `./types`.
- Produces: `renderCargoListPdf(data: CargoListData): Promise<Uint8Array>`.

- [ ] **Step 1: Add pdfkit to `lambdas/package.json`**

Add to `dependencies`: `"pdfkit": "^0.15.0"`. Add to `devDependencies`: `"@types/pdfkit": "^0.13.0"`. Then install:

Run: `cd serfel && pnpm install`
Expected: lockfile updates, pdfkit + @types/pdfkit resolved.

- [ ] **Step 2: Write the failing PDF test**

Create `lambdas/rutas/tests/pdf.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderCargoListPdf } from "../pdf";
import type { CargoListData } from "../types";

const sample: CargoListData = {
  nomRutas: "Ruta Norte, Ruta Sur",
  rows: [
    { idProducto: 1, codSerfel: 100, nomProducto: "Agua", nomUm: "UNI", nomTipoProducto: "BEBIDAS", sumCantidad: "5.00", subtotal: 2500, obs: [] },
    { idProducto: 2, codSerfel: 200, nomProducto: "Leche", nomUm: "UNI", nomTipoProducto: "LACTEOS", sumCantidad: "1.00", subtotal: 720, obs: [5] },
  ],
  totals: { numFacturas: 2, total: 3000 },
};

describe("renderCargoListPdf", () => {
  it("returns PDF bytes for a multi-tipo document", async () => {
    const bytes = await renderCargoListPdf(sample);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // PDF magic number "%PDF"
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it("handles an empty document (no rows)", async () => {
    const bytes = await renderCargoListPdf({ nomRutas: "Ruta X", rows: [], totals: { numFacturas: 0, total: 0 } });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
```

- [ ] **Step 3: Run the PDF test to verify it fails**

Run: `cd serfel && pnpm --filter @serfel/lambdas test rutas/tests/pdf`
Expected: FAIL — cannot find module `../pdf`.

- [ ] **Step 4: Create `lambdas/rutas/pdf.ts`** (faithful port of the legacy pdfkit layout, buffered instead of streamed)

```ts
import PDFDocument from "pdfkit";
import type { CargoListData, CargoListRow } from "./types";

const MARGIN_LEFT = 10;
const COL_N = { width: 40, align: "center" as const };
const COL_NOM = { width: 320, align: "center" as const };
const COL_PRECIO = { width: 65, align: "center" as const };
const COL_CANT = { width: 50, align: "center" as const };
const COL_OBS = { width: 65, align: "center" as const };
const X_NOM = MARGIN_LEFT + COL_N.width + 1;
const X_PRECIO = X_NOM + COL_NOM.width;
const X_CANT = X_PRECIO + COL_PRECIO.width;
const X_UM = X_CANT + COL_CANT.width;
const X_OBS = X_UM + COL_N.width;
const PAGE_OPTIONS = { size: "Letter" as const, margins: { top: 20, bottom: 20, left: 10, right: 10 } };

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}
const money = (n: number) => new Intl.NumberFormat("de-DE").format(n);

export function renderCargoListPdf(data: CargoListData): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(PAGE_OPTIONS);
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);

    let page = 0;
    let currentTipo = "";

    const printHeader = () => {
      page++;
      doc
        .font("Helvetica-Bold").fontSize(13)
        .text("LISTADO CARGA", { align: "center" })
        .moveDown(1)
        .text("Rutas:")
        .text("Fecha Informe:")
        .moveUp(2)
        .font("Helvetica")
        .text(data.nomRutas, 120, doc.y + 1)
        .text(ddmmyyyy(new Date()), 120, undefined)
        .fontSize(8)
        .text(`Página   ${page}`, { align: "right" });
    };

    const printTipoTitle = () => {
      doc.fontSize(12).font("Helvetica-Bold").text(currentTipo, doc.page.margins.left, undefined, { align: "left" });
    };

    const printTableHeader = () => {
      doc
        .font("Helvetica-Bold").fontSize(11)
        .text("N", doc.page.margins.left, undefined, COL_N).moveUp()
        .text("Nombre Producto", X_NOM, undefined, COL_NOM).moveUp()
        .text("Precio Total", X_PRECIO, undefined, COL_PRECIO).moveUp()
        .text("Cantidad", X_CANT, undefined, COL_CANT).moveUp()
        .text("UM", X_UM, undefined, COL_N).moveUp()
        .text("Obs", X_OBS, undefined, COL_OBS)
        .moveTo(doc.page.margins.left, doc.y - 3)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
        .stroke()
        .font("Helvetica").fontSize(11);
    };

    doc.on("pageAdded", () => {
      printHeader();
      doc.moveDown();
      if (currentTipo) printTipoTitle();
      printTableHeader();
    });

    printHeader();

    const obsText = (row: CargoListRow): string =>
      row.obs.length > 0 ? `N(${row.obs.join("-")})` : "";

    for (const row of data.rows) {
      const isNewTipo = row.nomTipoProducto !== currentTipo;
      if (isNewTipo) {
        if (currentTipo !== "") {
          currentTipo = row.nomTipoProducto;
          doc.addPage();
        } else {
          currentTipo = row.nomTipoProducto;
          printTipoTitle();
          printTableHeader();
        }
      }
      const obs = obsText(row);
      doc
        .text(String(row.codSerfel), doc.page.margins.left, undefined, COL_N).moveUp()
        .text(row.nomProducto, X_NOM, undefined, { ...COL_NOM, align: "left" }).moveUp()
        .text(`$ ${money(row.subtotal)}`, X_PRECIO, undefined, { ...COL_PRECIO, align: "right" }).moveUp()
        .text(row.sumCantidad, X_CANT, undefined, { ...COL_CANT, align: "right" }).moveUp()
        .text(row.nomUm, X_UM, undefined, COL_N)
        .moveTo(X_OBS, doc.y - 3)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
        .stroke()
        .moveUp();
      if (obs.length > 0) {
        doc.text(obs, X_OBS, undefined, COL_OBS);
      } else {
        doc.moveDown();
      }
    }

    if (data.totals.numFacturas > 0) {
      doc
        .moveDown()
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(
          `Cantidad Facturas: ${data.totals.numFacturas}          Total: $ ${money(data.totals.total)}`,
          doc.page.margins.left,
          undefined,
          { align: "center" }
        );
    }

    doc.end();
  });
}
```

- [ ] **Step 5: Run the PDF test to verify it passes**

Run: `cd serfel && pnpm --filter @serfel/lambdas test rutas/tests/pdf`
Expected: PASS (both cases produce `%PDF` bytes).

- [ ] **Step 6: Commit**

```bash
cd serfel
git add lambdas/rutas/pdf.ts lambdas/rutas/tests/pdf.test.ts lambdas/package.json pnpm-lock.yaml
git commit -m "feat(rutas): cargo-list PDF renderer (pdfkit, buffered)"
```

---

### Task 4: Rutas lambda — authz, app routes, handler

**Files:**
- Create: `lambdas/rutas/authz.ts`, `lambdas/rutas/app.ts`, `lambdas/rutas/index.ts`
- Test: `lambdas/rutas/tests/app.test.ts`

**Interfaces:**
- Consumes: `listActiveRutas`, `getCargoListData`, `getUserTipo` from `./service`; `renderCargoListPdf` from `./pdf`; `RutaSelectionSchema`, `tipoCanAccess` from `@serfel/shared`.
- Produces: `createApp(deps: AppDeps): Hono<AppEnv>`; `requireModule(module, deps)`; `handler` (Lambda entry).

- [ ] **Step 1: Create `lambdas/rutas/authz.ts`** (mirror of products, module-agnostic)

```ts
import { createMiddleware } from "hono/factory";
import { tipoCanAccess, type ModuleName } from "@serfel/shared";
import { AppError } from "./errors";
import { getUserTipo } from "./service";
import type { AppDeps, AppEnv } from "./types";

/**
 * Authorization gate for a module. Assumes an earlier middleware has already
 * set `idUsuario` on the context (authenticated + mapped). Loads the user's
 * id_tipo_usuario from the DB and checks it against MODULE_ROLES.
 */
export function requireModule(module: ModuleName, deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const idUsuario = c.get("idUsuario");
    const tipo = await getUserTipo(await deps.getDb(), idUsuario);
    if (tipo === null) {
      throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no existe en el sistema");
    }
    if (!tipoCanAccess(module, tipo)) {
      throw new AppError("PROHIBIDO", 403, "No tienes acceso a este módulo");
    }
    c.set("idTipoUsuario", tipo);
    await next();
  });
}
```

- [ ] **Step 2: Write the failing app test**

Create `lambdas/rutas/tests/app.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { createApp } from "../app";

let db: Db;
let teardown: () => Promise<void>;
let currentUser: number | null = SEED.usuarioAdmin;

const appPromise = (async () => {
  ({ db, teardown } = await setupTestDb("serfel_rutas_app"));
  return createApp({ getDb: async () => db, getIdUsuario: () => currentUser });
})();

afterAll(async () => {
  await teardown();
});

function postJson(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("rutas app", () => {
  it("403 NO_AUTORIZADO when there is no id_usuario claim", async () => {
    const app = await appPromise;
    currentUser = null;
    try {
      const res = await app.request("/api/routes");
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
    } finally {
      currentUser = SEED.usuarioAdmin;
    }
  });

  it("403 PROHIBIDO when a vendedor hits routes", async () => {
    const app = await appPromise;
    currentUser = SEED.usuarioVendedor;
    try {
      const res = await app.request("/api/routes");
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("PROHIBIDO");
    } finally {
      currentUser = SEED.usuarioAdmin;
    }
  });

  it("GET /api/routes returns only active routes for admin", async () => {
    const app = await appPromise;
    const res = await app.request("/api/routes");
    expect(res.status).toBe(200);
    const rutas = await res.json();
    expect(rutas.map((r: { nomRuta: string }) => r.nomRuta)).toEqual(["Ruta Norte", "Ruta Sur"]);
  });

  it("POST /api/routes/cargoList 400s on an empty selection", async () => {
    const app = await appPromise;
    const res = await app.request("/api/routes/cargoList", postJson([]));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });

  it("POST /api/routes/cargoList returns a PDF for a valid selection", async () => {
    const app = await appPromise;
    const res = await app.request(
      "/api/routes/cargoList",
      postJson([{ idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" }])
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
```

- [ ] **Step 3: Run the app test to verify it fails**

Run: `cd serfel && pnpm --filter @serfel/lambdas test rutas/tests/app`
Expected: FAIL — cannot find module `../app`.

- [ ] **Step 4: Create `lambdas/rutas/app.ts`**

```ts
import { Hono } from "hono";
import { RutaSelectionSchema, type ApiErrorBody } from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { getCargoListData, listActiveRutas } from "./service";
import { renderCargoListPdf } from "./pdf";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (isDbUnreachable(err)) {
      return c.json(
        errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible en este momento. Intenta más tarde."),
        503
      );
    }
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) {
      throw new AppError(
        "NO_AUTORIZADO",
        403,
        "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)"
      );
    }
    c.set("idUsuario", idUsuario);
    await next();
  });

  const rutas = requireModule("rutas", deps);
  app.use("/routes", rutas);
  app.use("/routes/*", rutas);

  app.get("/routes", async (c) => c.json(await listActiveRutas(await deps.getDb())));

  app.post("/routes/cargoList", async (c) => {
    const raw = await c.req.json().catch(() => {
      throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
    });
    const parsed = RutaSelectionSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "Debe enviar al menos una ruta");
    }
    const data = await getCargoListData(await deps.getDb(), parsed.data);
    const pdf = await renderCargoListPdf(data);
    // application/pdf is treated as binary by hono/aws-lambda (base64-encoded,
    // isBase64Encoded=true), and HTTP API decodes it for the browser.
    return new Response(pdf, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  });

  return app;
}
```

- [ ] **Step 5: Create `lambdas/rutas/index.ts`** (mirror of products handler)

```ts
import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import { createApp } from "./app";

const sm = new SecretsManagerClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  if (!secret.SecretString) {
    throw new Error("DB secret has no SecretString");
  }
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, { ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") } }).db;
  return cachedDb;
}

interface JwtEnv {
  event?: {
    requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  };
}

const app = createApp({
  getDb,
  getIdUsuario: (c) => {
    const claims = (c.env as JwtEnv).event?.requestContext?.authorizer?.jwt?.claims;
    const parsed = Number(claims?.["custom:id_usuario"]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
});

export const handler = handle(app);
```

- [ ] **Step 6: Run the app test to verify it passes**

Run: `cd serfel && pnpm --filter @serfel/lambdas test rutas/tests/app`
Expected: PASS (auth gates, route list, cargoList validation + PDF).

- [ ] **Step 7: Run the whole lambdas suite + typecheck**

Run: `cd serfel && pnpm --filter @serfel/lambdas test && pnpm typecheck`
Expected: PASS — all products and rutas tests green; no type errors.

- [ ] **Step 8: Commit**

```bash
cd serfel
git add lambdas/rutas/authz.ts lambdas/rutas/app.ts lambdas/rutas/index.ts lambdas/rutas/tests/app.test.ts
git commit -m "feat(rutas): Hono app, module authz gate, and Lambda handler"
```

---

### Task 5: Infra — RutasFn function and routes

**Files:**
- Modify: `infra/api.ts` (add `RutasFn` + two routes; the products explicit-routes refactor is already applied in the working tree)

**Interfaces:**
- Consumes: `privateSubnetIds`, `sgLambdaId` (`./vpc`), `dbSecretArn` (`./database`), the existing `api` and `jwtAuthorizer` in this file.
- Produces: `serfel-dev-rutas` Lambda serving `GET /api/routes` and `POST /api/routes/cargoList`.

- [ ] **Step 1: Add the `RutasFn` function in `infra/api.ts`**

Immediately after the `productsFn` definition (before the `new sst.aws.ApiGatewayV2(...)` block), add:

```ts
const rutasFn = new sst.aws.Function("RutasFn", {
  handler: "lambdas/rutas/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  // pdfkit reads .afm font metrics at runtime; keep it unbundled so those
  // data files ship with the function.
  nodejs: { install: ["pdfkit"] },
  vpc: {
    privateSubnets: privateSubnetIds,
    securityGroups: [sgLambdaId],
  },
  environment: {
    DB_SECRET_ARN: dbSecretArn,
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] },
  ],
  copyFiles: [
    { from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" },
  ],
  transform: {
    function: { name: "serfel-dev-rutas" },
  },
});
```

- [ ] **Step 2: Register the two rutas routes**

After the `productsRoutes` loop, add:

```ts
api.route("GET /api/routes", rutasFn.arn, {
  auth: { jwt: { authorizer: jwtAuthorizer.id } },
});
api.route("POST /api/routes/cargoList", rutasFn.arn, {
  auth: { jwt: { authorizer: jwtAuthorizer.id } },
});
```

- [ ] **Step 3: Typecheck the infra**

Run: `cd serfel && npx sst diff 2>/dev/null || npx tsc --noEmit -p infra`
Expected: no TypeScript errors from `infra/api.ts`. (A full `sst diff` requires AWS credentials; if it cannot run, a clean `tsc` on the infra file is sufficient for this step.)

- [ ] **Step 4: Deploy smoke test (manual, requires AWS + running dev DB)**

> Ask the user to run this — it needs their AWS session and the dev DB started. Do not auto-start/stop the DB.

```bash
cd serfel && npx sst deploy --stage dev
```

Then, authenticated as an admin user, verify:
- `GET  {apiUrl}/api/routes` → `200` JSON array of active routes.
- `POST {apiUrl}/api/routes/cargoList` with `[{ "idRuta": <id>, "nomRuta": "<name>" }]` → `200`, `content-type: application/pdf`, body opens as a valid PDF.
- Existing `GET {apiUrl}/api/products?estado=activos` still `200` (products routes unaffected).

- [ ] **Step 5: Commit**

```bash
cd serfel
git add infra/api.ts
git commit -m "feat(infra): add RutasFn lambda and /api/routes routes; explicit products routes"
```

---

### Task 6: Frontend — rutas logic, API service, store

**Files:**
- Create: `apps/frontend/src/app/features/rutas/rutas-logic.ts`, `apps/frontend/src/app/features/rutas/rutas-api.service.ts`, `apps/frontend/src/app/features/rutas/rutas-store.ts`
- Test: `apps/frontend/src/app/features/rutas/rutas-logic.spec.ts`

**Interfaces:**
- Consumes: `RutaDto`, `RutaSelection` from `@serfel/shared`; `environment` from `../../../environments/environment`.
- Produces:
  - `rutas-logic.ts`: `toggleSelection(selected: ReadonlySet<number>, id: number): Set<number>`, `allSelected(routes: RutaDto[], selected: ReadonlySet<number>): boolean`, `selectedRutas(routes: RutaDto[], selected: ReadonlySet<number>): RutaSelection`.
  - `rutas-api.service.ts`: `RutasApi` with `list(): Observable<RutaDto[]>`, `cargoList(sel: RutaSelection): Observable<Blob>`.
  - `rutas-store.ts`: `RutasStore` with signals `rutas`, `selected`, `loading`, `generating`, `errorMsg`, computed `allChecked`, `hasSelection`; methods `load()`, `toggle(id)`, `toggleAll()`, `clear()`, `generatePdf(): Promise<Blob>`.

- [ ] **Step 1: Write the failing logic spec**

Create `apps/frontend/src/app/features/rutas/rutas-logic.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { RutaDto } from "@serfel/shared";
import { toggleSelection, allSelected, selectedRutas } from "./rutas-logic";

const routes: RutaDto[] = [
  { idRuta: 1, nomRuta: "Norte", idUsuario: 1, numDia: 1, idEstado: 1 },
  { idRuta: 2, nomRuta: "Sur", idUsuario: 1, numDia: 2, idEstado: 1 },
];

describe("toggleSelection", () => {
  it("adds an id that is not present and removes one that is", () => {
    const a = toggleSelection(new Set(), 1);
    expect([...a]).toEqual([1]);
    const b = toggleSelection(a, 1);
    expect([...b]).toEqual([]);
  });
  it("does not mutate the input set", () => {
    const input = new Set([1]);
    toggleSelection(input, 2);
    expect([...input]).toEqual([1]);
  });
});

describe("allSelected", () => {
  it("is true only when every route id is selected", () => {
    expect(allSelected(routes, new Set([1, 2]))).toBe(true);
    expect(allSelected(routes, new Set([1]))).toBe(false);
    expect(allSelected([], new Set())).toBe(false);
  });
});

describe("selectedRutas", () => {
  it("returns {idRuta, nomRuta} for selected routes only", () => {
    expect(selectedRutas(routes, new Set([2]))).toEqual([{ idRuta: 2, nomRuta: "Sur" }]);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `cd serfel && pnpm --filter frontend test`
Expected: FAIL — cannot find module `./rutas-logic`.

- [ ] **Step 3: Create `apps/frontend/src/app/features/rutas/rutas-logic.ts`**

```ts
import type { RutaDto, RutaSelection } from "@serfel/shared";

export function toggleSelection(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function allSelected(routes: RutaDto[], selected: ReadonlySet<number>): boolean {
  return routes.length > 0 && routes.every((r) => selected.has(r.idRuta));
}

export function selectedRutas(routes: RutaDto[], selected: ReadonlySet<number>): RutaSelection {
  return routes
    .filter((r) => selected.has(r.idRuta))
    .map((r) => ({ idRuta: r.idRuta, nomRuta: r.nomRuta }));
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `cd serfel && pnpm --filter frontend test`
Expected: PASS (rutas-logic + existing specs green).

- [ ] **Step 5: Create `apps/frontend/src/app/features/rutas/rutas-api.service.ts`**

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { RutaDto, RutaSelection } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class RutasApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list() {
    return this.http.get<RutaDto[]>(`${this.base}/routes`);
  }
  cargoList(sel: RutaSelection) {
    return this.http.post(`${this.base}/routes/cargoList`, sel, {
      responseType: "blob",
    });
  }
}
```

- [ ] **Step 6: Create `apps/frontend/src/app/features/rutas/rutas-store.ts`**

```ts
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type { ApiErrorBody, RutaDto } from "@serfel/shared";
import { RutasApi } from "./rutas-api.service";
import { allSelected, selectedRutas, toggleSelection } from "./rutas-logic";

/** Extracts the structured API error body, or null for network/unknown errors. */
export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class RutasStore {
  private api = inject(RutasApi);

  readonly rutas = signal<RutaDto[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  readonly generating = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly allChecked = computed(() => allSelected(this.rutas(), this.selected()));
  readonly hasSelection = computed(() => this.selected().size > 0);

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.rutas.set(await firstValueFrom(this.api.list()));
    } catch (err) {
      const known = apiError(err);
      this.errorMsg.set(known?.message ?? "No se pudieron cargar las rutas. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  toggle(id: number): void {
    this.selected.set(toggleSelection(this.selected(), id));
  }

  toggleAll(): void {
    this.selected.set(
      this.allChecked() ? new Set() : new Set(this.rutas().map((r) => r.idRuta))
    );
  }

  clear(): void {
    this.selected.set(new Set());
  }

  async generatePdf(): Promise<Blob> {
    this.generating.set(true);
    try {
      return await firstValueFrom(
        this.api.cargoList(selectedRutas(this.rutas(), this.selected()))
      );
    } finally {
      this.generating.set(false);
    }
  }
}
```

- [ ] **Step 7: Commit**

```bash
cd serfel
git add apps/frontend/src/app/features/rutas/rutas-logic.ts apps/frontend/src/app/features/rutas/rutas-logic.spec.ts apps/frontend/src/app/features/rutas/rutas-api.service.ts apps/frontend/src/app/features/rutas/rutas-store.ts
git commit -m "feat(frontend): rutas logic, API service, and store"
```

---

### Task 7: Frontend — Listado Carga page and route

**Files:**
- Create: `apps/frontend/src/app/features/rutas/rutas-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `RutasStore` (`./rutas-store`), `SessionService`, `AuthService`, `ToastService`, `ToastComponent`, `moduleGuard`.
- Produces: `RutasPageComponent` (standalone); route `{ path: 'rutas', component: RutasPageComponent, canActivate: [moduleGuard('rutas')] }`.

- [ ] **Step 1: Create `apps/frontend/src/app/features/rutas/rutas-page.component.ts`**

Reuses the global shell classes (`.header`, `.hero`, `.page-body`, `.login-error`, `.hero-btn*`) from `styles.scss`; adds component-scoped styles only for the route list.

```ts
import { Component, inject, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { SessionService } from "../../core/session.service";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { RutasStore, apiError } from "./rutas-store";

@Component({
  selector: "app-rutas-page",
  standalone: true,
  imports: [ToastComponent],
  template: `
    <header class="header">
      <div class="header-inner">
        <div class="header-logo">
          <div class="logo-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          Serfel
        </div>
        <nav class="header-nav">
          @if (session.canAccess('rutas')) {
            <div class="nav-item active">Listado Carga</div>
          }
        </nav>
        <div class="header-spacer"></div>
        <div class="header-avatar" (click)="logout()" [title]="(session.me()?.nomUsuario ?? '') + ' — Cerrar sesión'">⎋</div>
      </div>
    </header>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Listado Carga</h1>
          <p>Selecciona las rutas e imprime el listado de carga</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-white" [disabled]="!store.hasSelection() || store.generating()" (click)="imprimir()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
            {{ store.generating() ? 'Generando…' : 'Imprimir listado' }}
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) {
        <div class="login-error">{{ msg }}</div>
      }

      <div class="rutas-card">
        @if (store.loading()) {
          <p class="rutas-empty">Cargando rutas…</p>
        } @else if (store.rutas().length === 0) {
          <p class="rutas-empty">No hay rutas activas.</p>
        } @else {
          <label class="ruta-row ruta-all">
            <input type="checkbox" [checked]="store.allChecked()" (change)="store.toggleAll()" />
            <span>Seleccionar todas</span>
          </label>
          @for (ruta of store.rutas(); track ruta.idRuta) {
            <label class="ruta-row">
              <input type="checkbox" [checked]="store.selected().has(ruta.idRuta)" (change)="store.toggle(ruta.idRuta)" />
              <span>{{ ruta.nomRuta }}</span>
            </label>
          }
        }
      </div>
    </div>

    <app-toast />
  `,
  styles: [`
    .rutas-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; max-width: 480px; }
    .ruta-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .ruta-row:hover { background: #f8fafc; }
    .ruta-row input { width: 16px; height: 16px; accent-color: var(--accent, #7c3aed); }
    .ruta-all { font-weight: 600; border-bottom: 1px solid #eef2f7; border-radius: 8px 8px 0 0; }
    .rutas-empty { padding: 16px; color: #6b7280; font-size: 14px; }
  `],
})
export class RutasPageComponent implements OnInit {
  readonly store = inject(RutasStore);
  readonly session = inject(SessionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  ngOnInit(): void {
    void this.store.load();
  }

  async imprimir(): Promise<void> {
    try {
      const blob = await this.store.generatePdf();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      const known = apiError(err);
      this.toast.show(known?.message ?? "No se pudo generar el listado.", "error");
    }
  }

  async logout(): Promise<void> {
    this.session.clear();
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
```

- [ ] **Step 2: Add the route in `apps/frontend/src/app/app.routes.ts`**

Add the import and the route entry (place the route before the `**` wildcard):

```ts
import { RutasPageComponent } from './features/rutas/rutas-page.component';
```

```ts
  { path: 'rutas', component: RutasPageComponent, canActivate: [moduleGuard('rutas')] },
```

- [ ] **Step 3: Typecheck the frontend build**

Run: `cd serfel && pnpm --filter frontend exec tsc --noEmit -p tsconfig.app.json`
Expected: no type errors. (If the frontend has no `tsconfig.app.json`, use `pnpm --filter frontend build` instead.)

- [ ] **Step 4: Manual verification (requires the dev API + an admin login)**

> Ask the user to run the frontend dev server and verify, since it needs a live API and Cognito login.

1. `cd serfel && pnpm --filter frontend start`
2. Log in as an Administrador (tipo 1). Navigate to `/rutas`.
3. Confirm: the active routes list loads; "Seleccionar todas" toggles all; "Imprimir listado" is disabled with no selection.
4. Select routes, click "Imprimir listado" → a new tab opens the cargo-list PDF.
5. Log in as a non-admin (tipo 2 or 3) and navigate to `/rutas` → redirected to `/sin-acceso`.

- [ ] **Step 5: Run the full test suite**

Run: `cd serfel && pnpm --filter @serfel/shared test && pnpm --filter @serfel/lambdas test && pnpm --filter frontend test && pnpm typecheck`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
cd serfel
git add apps/frontend/src/app/features/rutas/rutas-page.component.ts apps/frontend/src/app/app.routes.ts
git commit -m "feat(frontend): Listado Carga page and guarded /rutas route"
```

---

## Self-Review

**Spec coverage:**
- Separate `RutasFn` lambda + explicit routes → Task 5 (and products refactor already applied). ✓
- `service.ts` pure data / `pdf.ts` buffered / `app.ts` returns PDF → Tasks 2, 3, 4. ✓
- `listActiveRutas` (active, ordered) → Task 2. ✓
- Detail query with two simplifications (direct `ruta_local_cliente` join; group by all selected columns) → Task 2 `fetchDetail`. ✓
- Separate deterministic porciones query → Task 2 `fetchPorciones` (ordered for determinism). ✓
- Totals query → Task 2 `fetchTotals`. ✓
- `sumCantidad` truncate-to-2 quirk → Task 2 `truncateLastChar` + tests. ✓
- Shared `RutaDto`, `RutaSelectionSchema`, `MODULE_ROLES.rutas = [1]` → Task 1. ✓
- Exact pdfkit layout, `dateformat` dropped for inline formatter → Task 3. ✓
- pdfkit unbundled (`nodejs.install`) → Task 5. ✓
- Binary/PDF response path → Task 4 `app.ts` (`new Response`, application/pdf). ✓
- Frontend api/store/logic/page + `moduleGuard('rutas')` route, native UI → Tasks 6, 7. ✓
- Error contract (NO_AUTORIZADO / PROHIBIDO / VALIDACION / DB_NO_DISPONIBLE) → Task 4 + tests. ✓
- Admin-only access (vendedor 403) → Task 4 app test. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full code; every command has an expected result. ✓

**Type consistency:** `AppDeps`/`AppEnv` match products; `CargoListData`/`CargoListRow`/`DetailRow` defined in `types.ts` (Task 2) and consumed identically in `service.ts` (Task 2) and `pdf.ts` (Task 3); `getCargoListData(db, rutas: RutaSelection)` signature used consistently in `service.ts` and `app.ts`; `RutasStore` method/computed names (`allChecked`, `hasSelection`, `toggleAll`, `generatePdf`) match between store (Task 6) and page (Task 7); `renderCargoListPdf` returns `Uint8Array` in both definition (Task 3) and consumer (Task 4). ✓

**Open risks (from spec, non-blocking):** the `sumCantidad` truncation and porciones-obs semantics are reproduced per the spec and covered by tests; confirm with the user during review whether the legacy truncation should be kept long-term.
