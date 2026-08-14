# Clientes Maintainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Clientes maintainer to the new Angular frontend as a vertical slice (shared Zod schema → Hono Lambda → Angular feature) for the `10_m_cliente` entity, mirroring the existing `usuarios` maintainer.

**Architecture:** One Zod contract in `@serfel/shared` reused by the Lambda and the Angular forms; a Hono Lambda (`lambdas/clientes`) keyed by the client's RUT (the table's primary key) exposing list/create/update/deactivate/activate; an Angular feature (`features/clientes`) reusing the existing layout primitives. The list is enriched with per-client route weekdays and last invoice / credit-note numbers via 4 index-friendly queries merged in JS by `rut_cliente`.

**Tech Stack:** TypeScript, Zod, Drizzle ORM (MySQL/MariaDB), Hono, Angular 20 (standalone + signals), Vitest, SST v3.

## Global Constraints

- Node >= 22; pnpm workspaces; run commands from repo root.
- Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` first.
- Primary key of `10_m_cliente` is `rut_cliente` (int). The RUT **is** the identity — immutable, unique by definition. API routes are keyed by the rut int.
- `40_m_nota_credito` has **no** `rut_cliente`; reach the client via `nc.id_venta → 40_m_venta.rut_cliente`. Its number column is `num_nota_credito` (not `num_docto_emitido`).
- Never hand-assign primary keys elsewhere, but `rut_cliente` is caller-supplied (parsed from the RUT), matching the schema.
- Auth identity: `custom:id_usuario` from the Cognito ID token, already extracted by the handler.
- Every new Hono route MUST also be registered in `infra/api.ts` (explicit route list, not catch-all) or the browser gets a CORS 404.
- Admin-only module: `id_tipo_usuario = 1`.
- Spanish UI copy; no em dashes in identifiers.
- `NAV_ITEMS` is a full `Record<ModuleName, …>`: adding `clientes` to `MODULE_ROLES` will not compile until `nav.ts` also gets a `clientes` entry.

---

### Task 1: Extract RUT helpers into `rut.ts`

Pure refactor so both `usuarios` and `clientes` share the módulo-11 helpers. Behaviour unchanged; existing tests must stay green.

**Files:**
- Create: `packages/shared/src/rut.ts`
- Modify: `packages/shared/src/usuarios.ts` (remove helper defs lines 1-39, import from `./rut`)
- Modify: `packages/shared/src/index.ts` (add `export * from "./rut";`)

**Interfaces:**
- Produces: `computeDv(rut: number): string`, `parseRut(input: string): { rut: number; dv: string } | null`, `rutValido(input: string): boolean`, `formatRut(rut: number, dv: string): string`.

- [ ] **Step 1: Create `packages/shared/src/rut.ts`** by moving the four functions verbatim from `usuarios.ts`:

```typescript
/**
 * Chilean RUT check digit (módulo 11). Returns "0"-"9" or "K".
 * The multiplier cycles 2..7 over the digits from right to left.
 */
export function computeDv(rut: number): string {
  let sum = 0;
  let mul = 2;
  let n = Math.trunc(rut);
  while (n > 0) {
    sum += (n % 10) * mul;
    n = Math.floor(n / 10);
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}

/** Parses "12.345.678-5" / "12345678-5" / "6371526-k" into its parts, or null. */
export function parseRut(input: string): { rut: number; dv: string } | null {
  const clean = input.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  const m = clean.match(/^(\d+)-?([\dK])$/);
  if (!m) return null;
  const rut = Number(m[1]);
  if (!Number.isInteger(rut) || rut <= 0) return null;
  return { rut, dv: m[2] };
}

export function rutValido(input: string): boolean {
  const p = parseRut(input);
  return p !== null && computeDv(p.rut) === p.dv;
}

export function formatRut(rut: number, dv: string): string {
  return `${rut}-${dv}`;
}
```

- [ ] **Step 2: Edit `packages/shared/src/usuarios.ts`** — delete the four functions (old lines 1-39) and replace the top of the file with:

```typescript
import { z } from "zod";
import { rutValido, parseRut, formatRut, computeDv } from "./rut";

export { rutValido, parseRut, formatRut, computeDv };
```

Keep the rest of `usuarios.ts` (from `const REQUIRED` onward) unchanged. The re-export preserves existing `@serfel/shared` imports of these names.

- [ ] **Step 3: Add the export to `packages/shared/src/index.ts`** — insert near the other exports:

```typescript
export * from "./rut";
```

Note: `usuarios.ts` re-exports the same names, but `export *` de-duplicates identical re-exports; if TS reports an ambiguity, remove the `export { … } from "./rut"` re-export line from `usuarios.ts` and instead import without re-exporting. Verify with typecheck in Step 4.

- [ ] **Step 4: Run typecheck + shared tests**

Run: `pnpm typecheck && pnpm --filter @serfel/shared test`
Expected: PASS (usuarios RUT tests still green; no behaviour change).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/rut.ts packages/shared/src/usuarios.ts packages/shared/src/index.ts
git commit -m "refactor(shared): extract RUT helpers into rut.ts for reuse"
```

---

### Task 2: Shared clientes contract

Zod schemas, DTO, lookups, new error codes, authz module, nav entry.

**Files:**
- Create: `packages/shared/src/clientes.ts`
- Create: `packages/shared/src/clientes.spec.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from "./clientes";`)
- Modify: `packages/shared/src/productos.ts:54-71` (extend `ApiErrorCode`)
- Modify: `packages/shared/src/authz.ts` (add `clientes: [1]`)
- Modify: `apps/frontend/src/app/core/nav.ts` (add `clientes` entry)

**Interfaces:**
- Consumes: `rutValido` from Task 1.
- Produces: `ClienteCreateSchema`, `ClienteUpdateSchema`, `ClienteCreateInput`, `ClienteUpdateInput`, `ClienteDto`, `ClienteLookupsDto`. New `ApiErrorCode` members: `"RAZON_SOCIAL_EN_USO" | "CLIENTE_NO_ENCONTRADO" | "CLIENTE_CON_VENTAS_PENDIENTES"`. New module `clientes`.

- [ ] **Step 1: Write the failing test** `packages/shared/src/clientes.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ClienteCreateSchema, ClienteUpdateSchema } from "./clientes";

const valid = {
  rut: "12345678-5",
  razonSocial: "Comercial Los Andes SpA",
  nomFantasia: "Los Andes",
  telefono: "+56 9 1234 5678",
  direccion: "Av Siempre Viva 742",
  comuna: "Providencia",
  ciudad: "Santiago",
  email: "contacto@losandes.cl",
  idListaPrecio: 1,
  permiteVentaDeuda: false,
};

describe("ClienteCreateSchema", () => {
  it("accepts a valid cliente", () => {
    expect(ClienteCreateSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an invalid RUT check digit", () => {
    const r = ClienteCreateSchema.safeParse({ ...valid, rut: "12345678-9" });
    expect(r.success).toBe(false);
  });
  it("rejects a missing razon social", () => {
    const r = ClienteCreateSchema.safeParse({ ...valid, razonSocial: "" });
    expect(r.success).toBe(false);
  });
  it("rejects an invalid email", () => {
    const r = ClienteCreateSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });
  it("defaults nomFantasia to empty and permiteVentaDeuda to false", () => {
    const r = ClienteCreateSchema.safeParse({
      rut: "12345678-5", razonSocial: "X SpA", direccion: "Calle 1", idListaPrecio: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nomFantasia).toBe("");
      expect(r.data.permiteVentaDeuda).toBe(false);
    }
  });
});

describe("ClienteUpdateSchema", () => {
  it("has no rut field", () => {
    expect("rut" in ClienteUpdateSchema.shape).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @serfel/shared exec vitest run src/clientes.spec.ts`
Expected: FAIL ("Cannot find module './clientes'").

- [ ] **Step 3: Create `packages/shared/src/clientes.ts`**:

```typescript
import { z } from "zod";
import { rutValido } from "./rut";

const REQUIRED = (max: number) => z.string().trim().min(1).max(max);
const OPTTEXT = (max: number) => z.string().trim().max(max);

/** Fields common to create and update (everything except rut). */
const clienteBase = {
  razonSocial: REQUIRED(50),
  nomFantasia: OPTTEXT(50).default(""),
  telefono: z.string().trim().max(15).nullable().default(null),
  direccion: REQUIRED(200),
  comuna: OPTTEXT(20).default(""),
  ciudad: OPTTEXT(25).default(""),
  email: z.string().trim().email().max(50).nullable().default(null),
  idListaPrecio: z.number().int().positive(),
  permiteVentaDeuda: z.boolean().default(false),
};

export const ClienteCreateSchema = z.object({
  rut: z.string().refine(rutValido, "RUT inválido (dígito verificador no coincide)"),
  ...clienteBase,
});
export type ClienteCreateInput = z.infer<typeof ClienteCreateSchema>;

export const ClienteUpdateSchema = z.object({ ...clienteBase });
export type ClienteUpdateInput = z.infer<typeof ClienteUpdateSchema>;

export interface ClienteDto {
  rutCliente: number;
  dvCliente: string;
  rut: string;               // formatRut(rutCliente, dvCliente)
  razonSocial: string;
  nomFantasia: string;
  telefono: string | null;
  direccion: string;
  comuna: string;
  ciudad: string;
  email: string | null;
  idListaPrecio: number;
  nomListaPrecio: string;
  permiteVentaDeuda: boolean;
  idEstado: number;
  dias: number[];            // present route weekdays (num_dia 1..5)
  ultFactura: number | null;
  ultNotaCredito: number | null;
}

export interface ClienteLookupsDto {
  listasPrecio: { id: number; nombre: string }[];
}
```

- [ ] **Step 4: Extend `ApiErrorCode` in `packages/shared/src/productos.ts`** — add three members before the closing of the union (after `"COGNITO_ERROR"` on line 71 is fine, keep it a flat union):

```typescript
  | "COGNITO_ERROR"
  | "RAZON_SOCIAL_EN_USO"
  | "CLIENTE_NO_ENCONTRADO"
  | "CLIENTE_CON_VENTAS_PENDIENTES";
```

(Remove the old trailing `;` after `"COGNITO_ERROR"` so the union ends after the new members.)

- [ ] **Step 5: Add the module in `packages/shared/src/authz.ts`** — inside `MODULE_ROLES`:

```typescript
  clientes: [1], // 1 = Administrador
```

- [ ] **Step 6: Add nav entry in `apps/frontend/src/app/core/nav.ts`** — inside `NAV_ITEMS`:

```typescript
  clientes: { label: "Clientes", path: "/clientes" },
```

- [ ] **Step 7: Export from `packages/shared/src/index.ts`**:

```typescript
export * from "./clientes";
```

- [ ] **Step 8: Run test to verify it passes + typecheck**

Run: `pnpm --filter @serfel/shared exec vitest run src/clientes.spec.ts && pnpm typecheck`
Expected: PASS. (Typecheck stays green: `NAV_ITEMS` now has its `clientes` entry; no route imports a missing component yet.)

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/clientes.ts packages/shared/src/clientes.spec.ts packages/shared/src/index.ts packages/shared/src/productos.ts packages/shared/src/authz.ts apps/frontend/src/app/core/nav.ts
git commit -m "feat(shared): clientes contract, error codes, authz module + nav entry"
```

---

### Task 3: Lambda service + integration tests

Business logic against MariaDB: list (4-query merge), create, update, deactivate (pending-ventas guard), activate (restore/reactivate).

**Files:**
- Create: `lambdas/clientes/errors.ts` (copy of `lambdas/usuarios/errors.ts` verbatim)
- Create: `lambdas/clientes/types.ts`
- Create: `lambdas/clientes/service.ts`
- Create: `lambdas/clientes/tests/helpers.ts`
- Create: `lambdas/clientes/tests/service.test.ts`

**Interfaces:**
- Consumes: `ClienteCreateInput`, `ClienteUpdateInput`, `ClienteDto`, `ClienteLookupsDto` (Task 2); `formatRut`, `parseRut` (Task 1); Drizzle tables `t10MCliente`, `t40MListaPrecio`, `t40MRuta`, `t40MRutaLocalCliente`, `t10MLocalCliente`, `t40MVenta`, `t40MNotaCredito`, `t99PEstado`.
- Produces:
  - `getClienteLookups(db: Db): Promise<ClienteLookupsDto>`
  - `listClientes(db: Db, estado: EstadoFilter): Promise<ClienteDto[]>`
  - `createCliente(db: Db, input: ClienteCreateInput, idUsuario: number): Promise<{ kind: "created"; dto: ClienteDto } | { kind: "inactive"; rut: number }>`
  - `updateCliente(db: Db, rut: number, input: ClienteUpdateInput, idUsuario: number): Promise<ClienteDto>`
  - `activateCliente(db: Db, rut: number, input: ClienteUpdateInput, idUsuario: number): Promise<ClienteDto>`
  - `deactivateCliente(db: Db, rut: number, idUsuario: number): Promise<ClienteDto>`
  - `getUserTipo(db: Db, idUsuario: number): Promise<number | null>`

- [ ] **Step 1: Create `lambdas/clientes/errors.ts`** — identical to `lambdas/usuarios/errors.ts`:

```typescript
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

- [ ] **Step 2: Create `lambdas/clientes/types.ts`**:

```typescript
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
```

- [ ] **Step 3: Write the failing integration test** `lambdas/clientes/tests/service.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t10MCliente, type Db } from "@serfel/db";
import { eq } from "drizzle-orm";
import { setupTestDb, SEED } from "./helpers";
import {
  getClienteLookups, listClientes, createCliente,
  updateCliente, deactivateCliente, activateCliente,
} from "../service";

let db: Db; let pool: Pool; let teardown: () => Promise<void>;
beforeAll(async () => { ({ db, pool, teardown } = await setupTestDb("serfel_clientes_svc")); });
afterAll(async () => { await teardown(); });

const baseInput = {
  rut: "12345678-5", razonSocial: "Comercial Uno SpA", nomFantasia: "Uno",
  telefono: "+56 9 1111 1111", direccion: "Calle 1", comuna: "Providencia",
  ciudad: "Santiago", email: "uno@serfel.cl", idListaPrecio: SEED.idListaPrecio,
  permiteVentaDeuda: false,
};

describe("createCliente", () => {
  it("inserts a new active cliente with parsed rut/dv", async () => {
    const res = await createCliente(db, baseInput, SEED.idAdmin);
    expect(res.kind).toBe("created");
    if (res.kind !== "created") return;
    expect(res.dto.rutCliente).toBe(12345678);
    expect(res.dto.dvCliente).toBe("5");
    expect(res.dto.rut).toBe("12345678-5");
    expect(res.dto.nomListaPrecio).toBe("Base");
    expect(res.dto.idEstado).toBe(1);
  });

  it("rejects a duplicate active RUT with RUT_EN_USO", async () => {
    await expect(createCliente(db, { ...baseInput, razonSocial: "Otra SpA", email: "x@serfel.cl" }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "RUT_EN_USO" });
  });

  it("rejects a duplicate razon social with RAZON_SOCIAL_EN_USO", async () => {
    await expect(createCliente(db, { ...baseInput, rut: "6371526-K", email: "y@serfel.cl" }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "RAZON_SOCIAL_EN_USO" });
  });

  it("returns kind inactive when the RUT exists but is inactive", async () => {
    const c = await createCliente(db, { ...baseInput, rut: "6371526-K", razonSocial: "Inactiva SpA", email: "i@serfel.cl" }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error("expected created");
    await deactivateCliente(db, c.dto.rutCliente, SEED.idAdmin);
    const again = await createCliente(db, { ...baseInput, rut: "6371526-K", razonSocial: "Inactiva SpA", email: "i@serfel.cl" }, SEED.idAdmin);
    expect(again.kind).toBe("inactive");
    if (again.kind === "inactive") expect(again.rut).toBe(6371526);
  });
});

describe("updateCliente", () => {
  it("updates fields and keeps the rut", async () => {
    const dto = await updateCliente(db, 12345678, { ...baseInput, razonSocial: "Comercial Uno Renombrada SpA", permiteVentaDeuda: true }, SEED.idAdmin);
    expect(dto.razonSocial).toBe("Comercial Uno Renombrada SpA");
    expect(dto.permiteVentaDeuda).toBe(true);
  });

  it("404s CLIENTE_NO_ENCONTRADO for an unknown rut", async () => {
    await expect(updateCliente(db, 99999999, baseInput, SEED.idAdmin))
      .rejects.toMatchObject({ code: "CLIENTE_NO_ENCONTRADO" });
  });
});

describe("activateCliente", () => {
  it("restores an inactive cliente applying the provided data", async () => {
    const { rut, ...updateData } = baseInput; // ClienteUpdateInput has no rut
    const dto = await activateCliente(db, 6371526, { ...updateData, razonSocial: "Reactivada SpA", email: "r@serfel.cl" }, SEED.idAdmin);
    expect(dto.idEstado).toBe(1);
    expect(dto.razonSocial).toBe("Reactivada SpA");
  });
});

describe("deactivateCliente", () => {
  it("blocks deactivation when the client has a venta pending payment", async () => {
    await expect(deactivateCliente(db, SEED.rutClienteConVenta, SEED.idAdmin))
      .rejects.toMatchObject({ code: "CLIENTE_CON_VENTAS_PENDIENTES" });
  });

  it("soft-deletes a client with no pending ventas", async () => {
    const dto = await deactivateCliente(db, 12345678, SEED.idAdmin);
    expect(dto.idEstado).toBe(0);
    const row = await db.select().from(t10MCliente).where(eq(t10MCliente.rutCliente, 12345678));
    expect(row[0].idEstado).toBe(0);
  });
});

describe("listClientes derived columns", () => {
  it("reports route weekdays and last factura/NC for the seeded client", async () => {
    const rows = await listClientes(db, "todos");
    const seeded = rows.find((r) => r.rutCliente === SEED.rutClienteConVenta);
    expect(seeded).toBeDefined();
    expect(seeded!.dias).toEqual([1, 3]);            // lunes + miércoles seeded
    expect(seeded!.ultFactura).toBe(1050);           // MAX num_docto_emitido, id_estado > 0
    expect(seeded!.ultNotaCredito).toBe(77);         // MAX num_nota_credito via venta
  });

  it("filters by estado", async () => {
    const activos = await listClientes(db, "activos");
    expect(activos.every((r) => r.idEstado === 1)).toBe(true);
  });

  it("getClienteLookups returns the price lists", async () => {
    const lk = await getClienteLookups(db);
    expect(lk.listasPrecio).toEqual([{ id: SEED.idListaPrecio, nombre: "Base" }]);
  });
});
```

- [ ] **Step 4: Create the test helper** `lambdas/clientes/tests/helpers.ts` (seeds price list, estados, admin usuario, a client with routes on Mon+Wed, a venta with a nota de crédito, and a client with a pending venta for the guard):

```typescript
import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb, migrateSchemaOnly, type Db,
  t99PEstado, t10PTipoUsuario, t10MUsuario, t40MListaPrecio, t10MCliente,
  t10MLocalCliente, t10PTipoDocto, t10MEmpresa, t40MRuta, t40MRutaLocalCliente,
  t40MVenta, t40MNotaCredito,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));

export const SEED = {
  idAdmin: 1,
  tipoAdmin: 1,
  tipoVendedor: 2,
  idListaPrecio: 1,
  idTipoDocto: 1,
  rutEmpresa: 1,
  /** client with routes (Mon+Wed) + a venta + a nota de crédito, used for derived columns. */
  rutClienteConVenta: 5000000,
  idLocalConVenta: 10,
  idEstadoPendiente: 2,
} as const;

export async function setupTestDb(dbName: string): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false },
  );
  await migrateSchemaOnly(db, MIGRATIONS);

  const now = "2026-01-01 00:00:00";

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
    { idEstado: SEED.idEstadoPendiente, nomEstado: "Pendiente", descEstado: "Pendiente de pago" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([{
    idUsuario: SEED.idAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin",
    apellPatUsuario: "Uno", apellMatUsuario: "X", password: "seed", idTipoUsuario: SEED.tipoAdmin,
    telefonoUsuario: "1", direccionUsuario: "-", emailUsuario: "admin@serfel.cl", numUsuario: 0,
    idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  }]);
  await db.insert(t40MListaPrecio).values({
    idListaPrecio: SEED.idListaPrecio, nomListaPrecio: "Base",
    idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  });
  await db.insert(t10PTipoDocto).values({
    idTipoDocto: SEED.idTipoDocto, nomTipoDocto: "Factura", descTipoDocto: "Factura",
  });
  await db.insert(t10MEmpresa).values({
    rutEmpresa: SEED.rutEmpresa, dvEmpresa: "9", razonSocial: "Empresa Test",
    nomFantasia: "Empresa Test", direccionEmpresa: "Calle 1", idUsuarioMod: SEED.idAdmin,
    ultFechaMod: now, idEstado: 1, giro: "Ventas", codActividadEconomica: 0,
    comuna: "Santiago", ciudad: "Santiago", rutRepresentanteLegal: SEED.rutEmpresa,
    dvRepresentanteLegal: "9", fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });

  // Client with derived data: routes on Mon (num_dia 1) and Wed (num_dia 3),
  // two facturas (max num_docto_emitido 1050), and a nota de crédito (num 77).
  await db.insert(t10MCliente).values({
    rutCliente: SEED.rutClienteConVenta, dvCliente: "K", razonSocial: "Cliente Con Venta SpA",
    idListaPrecio: SEED.idListaPrecio, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  });
  await db.insert(t10MLocalCliente).values({
    idLocalCliente: SEED.idLocalConVenta, rutCliente: SEED.rutClienteConVenta,
    nomLocalCliente: "Local Principal", idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  });
  await db.insert(t40MRuta).values([
    { idRuta: 1, nomRuta: "Ruta Lunes", idUsuario: SEED.idAdmin, numDia: 1, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    { idRuta: 2, nomRuta: "Ruta Miércoles", idUsuario: SEED.idAdmin, numDia: 3, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    { idRuta: 3, nomRuta: "Ruta Inactiva Martes", idUsuario: SEED.idAdmin, numDia: 2, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 0 },
  ]);
  await db.insert(t40MRutaLocalCliente).values([
    { idRuta: 1, idLocalCliente: SEED.idLocalConVenta },
    { idRuta: 2, idLocalCliente: SEED.idLocalConVenta },
    { idRuta: 3, idLocalCliente: SEED.idLocalConVenta }, // inactive route: must NOT count
  ]);
  await db.insert(t40MVenta).values([
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 1000,
      numDoctoEmitido: 1000, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 2000,
      numDoctoEmitido: 1050, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    // Annulled venta with a higher docto number: must NOT count (id_estado = 0).
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 999,
      numDoctoEmitido: 9999, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 0 },
    // Pending venta (id_estado = 2) → blocks deactivation. Docto below the max so
    // it doesn't change ultFactura (both are counted since id_estado > 0).
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 500,
      numDoctoEmitido: 900, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: SEED.idEstadoPendiente },
  ]);
  // idVenta is auto-increment; the factura with num_docto 1050 is the 2nd insert (idVenta 2).
  await db.insert(t40MNotaCredito).values({
    idNotaCredito: 1, idVenta: 2, numNotaCredito: 77, idTipoDoctoEmitido: SEED.idTipoDocto,
    rutEmpresa: SEED.rutEmpresa, idUsuario: SEED.idAdmin, fechaNotaCredito: now,
    idEstado: 1, esNotaCredElectronica: 1, idUsuarioMod: SEED.idAdmin, ultFechaMod: now,
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

- [ ] **Step 5: Run the test to confirm it fails**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait && pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: FAIL ("Cannot find module '../service'").

- [ ] **Step 6: Create `lambdas/clientes/service.ts`**:

```typescript
import { and, asc, eq, ne, gt } from "drizzle-orm";
import {
  t10MCliente, t40MListaPrecio, t40MRuta, t40MRutaLocalCliente, t10MLocalCliente,
  t40MVenta, t40MNotaCredito, t10MUsuario, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO, formatRut, parseRut,
  type EstadoFilter, type ClienteCreateInput, type ClienteUpdateInput,
  type ClienteDto, type ClienteLookupsDto,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const VENTA_PENDIENTE = 2; // legacy: venta pending payment

const dtoColumns = {
  rutCliente: t10MCliente.rutCliente,
  dvCliente: t10MCliente.dvCliente,
  razonSocial: t10MCliente.razonSocial,
  nomFantasia: t10MCliente.nomFantasia,
  telefono: t10MCliente.telefonoCliente,
  direccion: t10MCliente.direccionCliente,
  comuna: t10MCliente.comuna,
  ciudad: t10MCliente.ciudad,
  email: t10MCliente.emailCliente,
  idListaPrecio: t10MCliente.idListaPrecio,
  nomListaPrecio: t40MListaPrecio.nomListaPrecio,
  permiteVentaDeuda: t10MCliente.permiteVentaDeuda,
  idEstado: t10MCliente.idEstado,
};

type Row = {
  rutCliente: number; dvCliente: string; razonSocial: string; nomFantasia: string;
  telefono: string | null; direccion: string; comuna: string; ciudad: string;
  email: string | null; idListaPrecio: number; nomListaPrecio: string;
  permiteVentaDeuda: number; idEstado: number;
};

function toDto(r: Row, dias: number[], ultFactura: number | null, ultNotaCredito: number | null): ClienteDto {
  return {
    ...r,
    permiteVentaDeuda: r.permiteVentaDeuda === 1,
    rut: formatRut(r.rutCliente, r.dvCliente),
    dias, ultFactura, ultNotaCredito,
  };
}

function clienteQuery(db: DbOrTx) {
  return (db as Db)
    .select(dtoColumns)
    .from(t10MCliente)
    .innerJoin(t40MListaPrecio, eq(t10MCliente.idListaPrecio, t40MListaPrecio.idListaPrecio));
}

async function getRow(db: DbOrTx, rut: number): Promise<Row> {
  const rows = await clienteQuery(db).where(eq(t10MCliente.rutCliente, rut));
  if (rows.length === 0) throw new AppError("CLIENTE_NO_ENCONTRADO", 404, `Cliente ${rut} no existe`);
  return rows[0] as Row;
}

/** Single-row DTO with its derived columns (used after writes). */
async function getDto(db: DbOrTx, rut: number): Promise<ClienteDto> {
  const row = await getRow(db, rut);
  const [dias, fact, nc] = await Promise.all([
    routeDiasForRut(db, rut), ultFacturaForRut(db, rut), ultNotaCreditoForRut(db, rut),
  ]);
  return toDto(row, dias, fact, nc);
}

async function routeDiasForRut(db: DbOrTx, rut: number): Promise<number[]> {
  const rows = await (db as Db)
    .select({ numDia: t40MRuta.numDia })
    .from(t40MRuta)
    .innerJoin(t40MRutaLocalCliente, eq(t40MRuta.idRuta, t40MRutaLocalCliente.idRuta))
    .innerJoin(t10MLocalCliente, eq(t40MRutaLocalCliente.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .where(and(eq(t10MLocalCliente.rutCliente, rut), gt(t40MRuta.idEstado, 0)));
  return [...new Set(rows.map((r) => r.numDia))].sort((a, b) => a - b);
}

async function ultFacturaForRut(db: DbOrTx, rut: number): Promise<number | null> {
  const rows = await (db as Db)
    .select({ num: t40MVenta.numDoctoEmitido })
    .from(t40MVenta)
    .where(and(eq(t40MVenta.rutCliente, rut), gt(t40MVenta.idEstado, 0)));
  return rows.length ? Math.max(...rows.map((r) => r.num)) : null;
}

async function ultNotaCreditoForRut(db: DbOrTx, rut: number): Promise<number | null> {
  const rows = await (db as Db)
    .select({ num: t40MNotaCredito.numNotaCredito })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(and(eq(t40MVenta.rutCliente, rut), gt(t40MNotaCredito.idEstado, 0)));
  return rows.length ? Math.max(...rows.map((r) => r.num)) : null;
}

export async function getClienteLookups(db: Db): Promise<ClienteLookupsDto> {
  const listasPrecio = await db
    .select({ id: t40MListaPrecio.idListaPrecio, nombre: t40MListaPrecio.nomListaPrecio })
    .from(t40MListaPrecio)
    .orderBy(asc(t40MListaPrecio.nomListaPrecio));
  return { listasPrecio };
}

export async function listClientes(db: Db, estado: EstadoFilter): Promise<ClienteDto[]> {
  const q = clienteQuery(db);
  const rows = (await (estado === "todos"
    ? q
    : q.where(eq(t10MCliente.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO))
  ).orderBy(asc(t10MCliente.razonSocial))) as Row[];

  // Derived columns as 3 grouped queries, merged in JS by rut_cliente.
  const diasRows = await db
    .select({ rut: t10MLocalCliente.rutCliente, numDia: t40MRuta.numDia })
    .from(t40MRuta)
    .innerJoin(t40MRutaLocalCliente, eq(t40MRuta.idRuta, t40MRutaLocalCliente.idRuta))
    .innerJoin(t10MLocalCliente, eq(t40MRutaLocalCliente.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .where(gt(t40MRuta.idEstado, 0));
  const factRows = await db
    .select({ rut: t40MVenta.rutCliente, num: t40MVenta.numDoctoEmitido })
    .from(t40MVenta).where(gt(t40MVenta.idEstado, 0));
  const ncRows = await db
    .select({ rut: t40MVenta.rutCliente, num: t40MNotaCredito.numNotaCredito })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(gt(t40MNotaCredito.idEstado, 0));

  const dias = new Map<number, Set<number>>();
  for (const r of diasRows) (dias.get(r.rut) ?? dias.set(r.rut, new Set()).get(r.rut)!).add(r.numDia);
  const maxBy = (rows: { rut: number; num: number }[]) => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.rut, Math.max(m.get(r.rut) ?? 0, r.num));
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

async function assertRazonSocialUnique(tx: DbOrTx, razonSocial: string, excludeRut: number | null): Promise<void> {
  const clash = await (tx as Db).select({ rut: t10MCliente.rutCliente })
    .from(t10MCliente)
    .where(excludeRut === null
      ? eq(t10MCliente.razonSocial, razonSocial)
      : and(eq(t10MCliente.razonSocial, razonSocial), ne(t10MCliente.rutCliente, excludeRut)));
  if (clash.length > 0) throw new AppError("RAZON_SOCIAL_EN_USO", 409, `La razón social "${razonSocial}" ya está registrada`);
}

function writeValues(input: ClienteUpdateInput, idUsuario: number) {
  return {
    razonSocial: input.razonSocial,
    nomFantasia: input.nomFantasia,
    telefonoCliente: input.telefono,
    direccionCliente: input.direccion,
    comuna: input.comuna,
    ciudad: input.ciudad,
    emailCliente: input.email,
    idListaPrecio: input.idListaPrecio,
    permiteVentaDeuda: input.permiteVentaDeuda ? 1 : 0,
    idUsuarioMod: idUsuario,
    ultFechaMod: nowDateTime(),
  };
}

export async function createCliente(
  db: Db, input: ClienteCreateInput, idUsuario: number,
): Promise<{ kind: "created"; dto: ClienteDto } | { kind: "inactive"; rut: number }> {
  const parsed = parseRut(input.rut)!; // validated by Zod
  return db.transaction(async (tx) => {
    const existing = await (tx as Db).select({ rut: t10MCliente.rutCliente, estado: t10MCliente.idEstado })
      .from(t10MCliente).where(eq(t10MCliente.rutCliente, parsed.rut));
    if (existing.length > 0) {
      if (existing[0].estado === ESTADO_ACTIVO) throw new AppError("RUT_EN_USO", 409, `El RUT ${input.rut} ya está registrado y activo`);
      return { kind: "inactive" as const, rut: existing[0].rut };
    }
    await assertRazonSocialUnique(tx, input.razonSocial, null);
    await tx.insert(t10MCliente).values({
      rutCliente: parsed.rut, dvCliente: parsed.dv, ...writeValues(input, idUsuario), idEstado: ESTADO_ACTIVO,
    });
    return { kind: "created" as const, dto: await getDto(tx, parsed.rut) };
  });
}

export async function updateCliente(db: Db, rut: number, input: ClienteUpdateInput, idUsuario: number): Promise<ClienteDto> {
  return db.transaction(async (tx) => {
    await getRow(tx, rut); // 404 if missing
    await assertRazonSocialUnique(tx, input.razonSocial, rut);
    await tx.update(t10MCliente).set(writeValues(input, idUsuario)).where(eq(t10MCliente.rutCliente, rut));
    return getDto(tx, rut);
  });
}

export async function activateCliente(db: Db, rut: number, input: ClienteUpdateInput, idUsuario: number): Promise<ClienteDto> {
  return db.transaction(async (tx) => {
    await getRow(tx, rut);
    await assertRazonSocialUnique(tx, input.razonSocial, rut);
    await tx.update(t10MCliente).set({ ...writeValues(input, idUsuario), idEstado: ESTADO_ACTIVO }).where(eq(t10MCliente.rutCliente, rut));
    return getDto(tx, rut);
  });
}

export async function deactivateCliente(db: Db, rut: number, idUsuario: number): Promise<ClienteDto> {
  return db.transaction(async (tx) => {
    const current = await getDto(tx, rut);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    const pending = await (tx as Db).select({ id: t40MVenta.idVenta })
      .from(t40MVenta)
      .where(and(eq(t40MVenta.rutCliente, rut), eq(t40MVenta.idEstado, VENTA_PENDIENTE)));
    if (pending.length > 0) {
      throw new AppError("CLIENTE_CON_VENTAS_PENDIENTES", 409, "El cliente tiene ventas en proceso de pago y no puede eliminarse");
    }
    await tx.update(t10MCliente).set({ idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: nowDateTime() })
      .where(eq(t10MCliente.rutCliente, rut));
    return getDto(tx, rut);
  });
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: PASS (all create/update/activate/deactivate + derived-column assertions).

- [ ] **Step 8: Commit**

```bash
git add lambdas/clientes/errors.ts lambdas/clientes/types.ts lambdas/clientes/service.ts lambdas/clientes/tests/helpers.ts lambdas/clientes/tests/service.test.ts
git commit -m "feat(clientes): lambda service + integration tests (list/create/update/activate/deactivate)"
```

---

### Task 4: Lambda HTTP layer (app + handler + authz)

Hono router, module gate, JSON error mapping, and mocked-service routing tests.

**Files:**
- Create: `lambdas/clientes/authz.ts` (copy of `lambdas/usuarios/authz.ts`, module `"clientes"`)
- Create: `lambdas/clientes/app.ts`
- Create: `lambdas/clientes/index.ts`
- Create: `lambdas/clientes/tests/app.test.ts`

**Interfaces:**
- Consumes: service functions (Task 3); `ClienteCreateSchema`, `ClienteUpdateSchema`, `EstadoFilterSchema`, `ApiErrorBody` (shared); `AppDeps`, `AppEnv` (Task 3 types.ts).
- Produces: `createApp(deps: AppDeps): Hono` and `export const handler`. Routes listed below (consumed by Task 5 infra).

- [ ] **Step 1: Create `lambdas/clientes/authz.ts`** — copy `usuarios/authz.ts` verbatim (it already takes `module` as a parameter, so no edit needed):

```typescript
import { createMiddleware } from "hono/factory";
import { tipoCanAccess, type ModuleName } from "@serfel/shared";
import { AppError } from "./errors";
import { getUserTipo } from "./service";
import type { AppDeps, AppEnv } from "./types";

export function requireModule(module: ModuleName, deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const idUsuario = c.get("idUsuario");
    const tipo = await getUserTipo(await deps.getDb(), idUsuario);
    if (tipo === null) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no existe en el sistema");
    if (!tipoCanAccess(module, tipo)) throw new AppError("PROHIBIDO", 403, "No tienes acceso a este módulo");
    c.set("idTipoUsuario", tipo);
    await next();
  });
}
```

- [ ] **Step 2: Write the failing routing test** `lambdas/clientes/tests/app.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Db } from "@serfel/db";
import type { AppDeps } from "../types";

const mocks = vi.hoisted(() => ({
  getUserTipo: vi.fn(),
  getClienteLookups: vi.fn(),
  listClientes: vi.fn(),
  createCliente: vi.fn(),
  updateCliente: vi.fn(),
  activateCliente: vi.fn(),
  deactivateCliente: vi.fn(),
}));
vi.mock("../service", () => mocks);

const { createApp } = await import("../app");
const fakeDb = {} as Db;

function makeApp(overrides: Partial<AppDeps> = {}) {
  return createApp({ getDb: async () => fakeDb, getIdUsuario: () => 1, ...overrides });
}
function postJson(body: unknown) {
  return { method: "POST" as const, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
const validCreate = {
  rut: "12345678-5", razonSocial: "Comercial Uno SpA", nomFantasia: "Uno",
  telefono: "111", direccion: "Calle 1", comuna: "Prov", ciudad: "Stgo",
  email: "uno@serfel.cl", idListaPrecio: 1, permiteVentaDeuda: false,
};

beforeEach(() => { vi.clearAllMocks(); mocks.getUserTipo.mockResolvedValue(1); });

describe("clientes app", () => {
  it("403s when there is no id_usuario claim", async () => {
    const app = makeApp({ getIdUsuario: () => null });
    const res = await app.request("/api/clientes?estado=activos");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
  });

  it("403 PROHIBIDO when a non-admin hits /clientes", async () => {
    mocks.getUserTipo.mockResolvedValue(2);
    const res = await makeApp().request("/api/clientes?estado=activos");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("PROHIBIDO");
  });

  it("lists clientes", async () => {
    mocks.listClientes.mockResolvedValue([{ rutCliente: 1 }]);
    const res = await makeApp().request("/api/clientes?estado=activos");
    expect(res.status).toBe(200);
    expect(mocks.listClientes).toHaveBeenCalledWith(fakeDb, "activos");
  });

  it("400s an invalid estado", async () => {
    const res = await makeApp().request("/api/clientes?estado=foo");
    expect(res.status).toBe(400);
  });

  it("creates a cliente", async () => {
    mocks.createCliente.mockResolvedValue({ kind: "created", dto: { rutCliente: 12345678 } });
    const res = await makeApp().request("/api/clientes", postJson(validCreate));
    expect(res.status).toBe(201);
  });

  it("returns 409 RUT_INACTIVO with the rut in the body", async () => {
    mocks.createCliente.mockResolvedValue({ kind: "inactive", rut: 12345678 });
    const res = await makeApp().request("/api/clientes", postJson(validCreate));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("RUT_INACTIVO");
    expect(body.rut).toBe(12345678);
  });

  it("400s a create with an invalid RUT", async () => {
    const res = await makeApp().request("/api/clientes", postJson({ ...validCreate, rut: "12345678-9" }));
    expect(res.status).toBe(400);
  });

  it("updates a cliente by rut", async () => {
    mocks.updateCliente.mockResolvedValue({ rutCliente: 12345678 });
    const { rut, ...updateBody } = validCreate;
    const res = await makeApp().request("/api/clientes/12345678", { ...postJson(updateBody), method: "PUT" });
    expect(res.status).toBe(200);
    expect(mocks.updateCliente).toHaveBeenCalledWith(fakeDb, 12345678, expect.objectContaining({ razonSocial: "Comercial Uno SpA" }), 1);
  });

  it("activates (restores) a cliente by rut", async () => {
    mocks.activateCliente.mockResolvedValue({ rutCliente: 12345678, idEstado: 1 });
    const { rut, ...updateBody } = validCreate;
    const res = await makeApp().request("/api/clientes/12345678/activate", postJson(updateBody));
    expect(res.status).toBe(200);
  });

  it("deactivates a cliente by rut", async () => {
    mocks.deactivateCliente.mockResolvedValue({ rutCliente: 12345678, idEstado: 0 });
    const res = await makeApp().request("/api/clientes/12345678/deactivate", postJson({}));
    expect(res.status).toBe(200);
  });

  it("400s an invalid rut param", async () => {
    const res = await makeApp().request("/api/clientes/abc/deactivate", postJson({}));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/app.test.ts`
Expected: FAIL ("Cannot find module '../app'").

- [ ] **Step 4: Create `lambdas/clientes/app.ts`**:

```typescript
import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema, ClienteCreateSchema, ClienteUpdateSchema, type ApiErrorBody,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { requireModule } from "./authz";
import {
  activateCliente, createCliente, deactivateCliente, getClienteLookups,
  listClientes, updateCliente,
} from "./service";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseRutParam(c: Context): number {
  const rut = Number(c.req.param("rut"));
  if (!Number.isInteger(rut) || rut <= 0) throw new AppError("VALIDACION", 400, "rut de cliente inválido");
  return rut;
}

async function parseBody<T>(c: Context, schema: { safeParse: (v: unknown) => any }): Promise<T> {
  const raw = await c.req.json().catch(() => { throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido"); });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data as T;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json(errorBody(err.code, err.message), err.status);
    if (isDbUnreachable(err)) return c.json(errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible en este momento. Intenta más tarde."), 503);
    console.error("unhandled error", { message: err instanceof Error ? err.message : String(err), code: (err as { code?: string }).code });
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)");
    c.set("idUsuario", idUsuario);
    await next();
  });

  const gate = requireModule("clientes", deps);
  app.use("/clientes", gate);
  app.use("/clientes/*", gate);

  app.get("/clientes/lookups", async (c) => c.json(await getClienteLookups(await deps.getDb())));

  app.get("/clientes", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    return c.json(await listClientes(await deps.getDb(), parsed.data));
  });

  app.post("/clientes", async (c) => {
    const input = await parseBody<import("@serfel/shared").ClienteCreateInput>(c, ClienteCreateSchema);
    const res = await createCliente(await deps.getDb(), input, c.get("idUsuario"));
    if (res.kind === "inactive") {
      return c.json({ ...errorBody("RUT_INACTIVO", "El RUT existe pero está inactivo. ¿Deseas reactivarlo?"), rut: res.rut }, 409);
    }
    return c.json(res.dto, 201);
  });

  app.put("/clientes/:rut", async (c) => {
    const rut = parseRutParam(c);
    const input = await parseBody<import("@serfel/shared").ClienteUpdateInput>(c, ClienteUpdateSchema);
    return c.json(await updateCliente(await deps.getDb(), rut, input, c.get("idUsuario")));
  });

  app.post("/clientes/:rut/activate", async (c) => {
    const rut = parseRutParam(c);
    const input = await parseBody<import("@serfel/shared").ClienteUpdateInput>(c, ClienteUpdateSchema);
    return c.json(await activateCliente(await deps.getDb(), rut, input, c.get("idUsuario")));
  });

  app.post("/clientes/:rut/deactivate", async (c) => {
    const rut = parseRutParam(c);
    return c.json(await deactivateCliente(await deps.getDb(), rut, c.get("idUsuario")));
  });

  return app;
}
```

- [ ] **Step 5: Create `lambdas/clientes/index.ts`** (no Cognito deps, unlike usuarios):

```typescript
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
  if (!secret.SecretString) throw new Error("DB secret has no SecretString");
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, { ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") } }).db;
  return cachedDb;
}

interface JwtEnv {
  event?: { requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } } };
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

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/app.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the whole lambdas test suite + typecheck**

Run: `pnpm --filter @serfel/lambdas test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lambdas/clientes/authz.ts lambdas/clientes/app.ts lambdas/clientes/index.ts lambdas/clientes/tests/app.test.ts
git commit -m "feat(clientes): lambda HTTP layer (app, handler, authz gate) + routing tests"
```

---

### Task 5: Infra wiring

Register the `ClientesFn` Lambda and its routes in the HTTP API. No unit test; verified by typecheck (SST config is Pulumi TS).

**Files:**
- Modify: `infra/api.ts` (add `ClientesFn` after `usuariosFn` block ~line 79; add route loop after `usuariosRoutes` ~line 156)

**Interfaces:**
- Consumes: `handler` from Task 4; the pattern established by `usuariosFn`.

- [ ] **Step 1: Add the function** in `infra/api.ts` immediately after the `usuariosFn` definition (no Cognito permissions needed):

```typescript
const clientesFn = new sst.aws.Function("ClientesFn", {
  handler: "lambdas/clientes/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-clientes`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```

- [ ] **Step 2: Add the routes** after the `usuariosRoutes` for-loop:

```typescript
const clientesRoutes = [
  "GET /api/clientes",
  "GET /api/clientes/lookups",
  "POST /api/clientes",
  "PUT /api/clientes/{rut}",
  "POST /api/clientes/{rut}/activate",
  "POST /api/clientes/{rut}/deactivate",
] as const;
for (const route of clientesRoutes) {
  api.route(route, clientesFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add infra/api.ts
git commit -m "feat(infra): register clientes lambda + API routes"
```

---

### Task 6: Frontend logic (pure functions)

Filters, sort, pagination, CSV, stats — unit tested, no Angular DI.

**Files:**
- Create: `apps/frontend/src/app/features/clientes/clientes-logic.ts`
- Create: `apps/frontend/src/app/features/clientes/clientes-logic.spec.ts`

**Interfaces:**
- Consumes: `ClienteDto`, `ESTADO_ACTIVO` (shared).
- Produces: `Filters`, `Sort`, `SortKey`, `WEEKDAYS`, `applyFilters`, `sortRows`, `paginate`, `toCsv`, `computeStats`.

- [ ] **Step 1: Write the failing test** `clientes-logic.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { ClienteDto } from "@serfel/shared";
import { applyFilters, sortRows, paginate, computeStats, toCsv } from "./clientes-logic";

function c(over: Partial<ClienteDto>): ClienteDto {
  return {
    rutCliente: 1, dvCliente: "9", rut: "1-9", razonSocial: "Alfa SpA", nomFantasia: "Alfa",
    telefono: null, direccion: "Calle 1", comuna: "Prov", ciudad: "Stgo", email: "a@x.cl",
    idListaPrecio: 1, nomListaPrecio: "Base", permiteVentaDeuda: false, idEstado: 1,
    dias: [], ultFactura: null, ultNotaCredito: null, ...over,
  };
}

describe("applyFilters", () => {
  const rows = [
    c({ rutCliente: 111, rut: "111-1", razonSocial: "Alfa SpA", idListaPrecio: 1 }),
    c({ rutCliente: 222, rut: "222-2", razonSocial: "Beta Ltda", idListaPrecio: 2 }),
  ];
  it("filters by razon social tokens", () => {
    expect(applyFilters(rows, { razonSocial: "beta", rut: "", idListaPrecio: null, quick: "" })).toHaveLength(1);
  });
  it("filters by rut substring", () => {
    expect(applyFilters(rows, { razonSocial: "", rut: "111", idListaPrecio: null, quick: "" })).toHaveLength(1);
  });
  it("filters by lista de precio", () => {
    expect(applyFilters(rows, { razonSocial: "", rut: "", idListaPrecio: 2, quick: "" })).toHaveLength(1);
  });
});

describe("sortRows", () => {
  it("sorts by ultFactura numerically", () => {
    const rows = [c({ ultFactura: 5 }), c({ ultFactura: 100 }), c({ ultFactura: null })];
    const sorted = sortRows(rows, { key: "ultFactura", asc: true });
    expect(sorted.map((r) => r.ultFactura)).toEqual([null, 5, 100]);
  });
});

describe("paginate", () => {
  it("slices a page", () => {
    const rows = Array.from({ length: 25 }, (_, i) => c({ rutCliente: i }));
    const p = paginate(rows, 2, 10);
    expect(p.slice).toHaveLength(10);
    expect(p.from).toBe(11);
    expect(p.totalPages).toBe(3);
  });
});

describe("computeStats", () => {
  it("counts total, listas, con deuda and filtrados", () => {
    const all = [c({ idListaPrecio: 1, permiteVentaDeuda: true }), c({ idListaPrecio: 2, permiteVentaDeuda: false })];
    const s = computeStats(all, all);
    expect(s.total).toBe(2);
    expect(s.listasPrecio).toBe(2);
    expect(s.conDeuda).toBe(1);
    expect(s.filtrados).toBeNull();
  });
});

describe("toCsv", () => {
  it("emits a header and one row per cliente", () => {
    const csv = toCsv([c({ razonSocial: "Alfa SpA" })]);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("Razón Social");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/clientes-logic.spec.ts`
Expected: FAIL ("Cannot find module './clientes-logic'").

- [ ] **Step 3: Create `clientes-logic.ts`**:

```typescript
import { ESTADO_ACTIVO, type ClienteDto } from "@serfel/shared";

export interface Filters {
  razonSocial: string;
  rut: string;
  idListaPrecio: number | null;
  quick: string;
}

export type SortKey = "rut" | "razonSocial" | "ultFactura" | "ultNotaCredito";
export interface Sort { key: SortKey; asc: boolean; }

/** Weekday columns L·M·M·J·V ↔ num_dia 1..5. */
export const WEEKDAYS: { dia: number; label: string }[] = [
  { dia: 1, label: "L" }, { dia: 2, label: "M" }, { dia: 3, label: "M" },
  { dia: 4, label: "J" }, { dia: 5, label: "V" },
];

function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).split(" ").filter(Boolean).every((t) => haystack.includes(t));
}

export function applyFilters(rows: ClienteDto[], f: Filters): ClienteDto[] {
  const razon = f.razonSocial.trim();
  const rut = f.rut.trim().replace(/\./g, "");
  const quick = f.quick.trim();
  return rows.filter((r) => {
    if (razon && !matchesAllTokens(r.razonSocial + " " + r.nomFantasia, razon)) return false;
    if (rut && !r.rut.replace(/\./g, "").includes(rut)) return false;
    if (f.idListaPrecio !== null && r.idListaPrecio !== f.idListaPrecio) return false;
    if (quick && !matchesAllTokens(r.razonSocial + " " + r.nomFantasia, quick) && !r.rut.includes(quick)) return false;
    return true;
  });
}

export function sortRows(rows: ClienteDto[], s: Sort): ClienteDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key]; const vb = b[s.key];
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : (va === null ? -1 : vb === null ? 1 : String(va).localeCompare(String(vb)));
    return s.asc ? cmp : -cmp;
  });
}

export function paginate<T>(rows: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = rows.length === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, rows.length);
  return { slice: rows.slice((current - 1) * perPage, current * perPage), totalPages, page: current, from, to };
}

export function toCsv(rows: ClienteDto[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["RUT", "Razón Social", "Nombre Fantasía", "Comuna", "Ciudad", "Lista Precio", "Días", "Últ. Factura", "Últ. Nota Crédito", "Estado"].map(esc).join(";");
  const lines = rows.map((r) => [
    r.rut, r.razonSocial, r.nomFantasia, r.comuna, r.ciudad, r.nomListaPrecio,
    r.dias.join("-"), r.ultFactura ?? "", r.ultNotaCredito ?? "",
    r.idEstado === ESTADO_ACTIVO ? "Activo" : "Inactivo",
  ].map(esc).join(";"));
  return [header, ...lines].join("\r\n");
}

export function computeStats(all: ClienteDto[], filtered: ClienteDto[]) {
  return {
    total: all.length,
    listasPrecio: new Set(all.map((r) => r.idListaPrecio)).size,
    conDeuda: all.filter((r) => r.permiteVentaDeuda).length,
    filtrados: filtered.length === all.length ? null : filtered.length,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/clientes-logic.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/clientes/clientes-logic.ts apps/frontend/src/app/features/clientes/clientes-logic.spec.ts
git commit -m "feat(clientes): frontend logic (filters, sort, paginate, csv, stats)"
```

---

### Task 7: Frontend API service + store

Angular HTTP wiring and the signal store. Verified by typecheck (usuarios has no store test; follow that precedent).

**Files:**
- Create: `apps/frontend/src/app/features/clientes/clientes-api.service.ts`
- Create: `apps/frontend/src/app/features/clientes/clientes-store.ts`

**Interfaces:**
- Consumes: `ClienteDto`, `ClienteCreateInput`, `ClienteUpdateInput`, `ClienteLookupsDto`, `EstadoFilter`, `ApiErrorBody` (shared); logic from Task 6.
- Produces: `ClientesApi`, `ClientesStore`, `apiError`, `rutInactivoRut`.

- [ ] **Step 1: Create `clientes-api.service.ts`**:

```typescript
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter, ClienteCreateInput, ClienteDto, ClienteLookupsDto, ClienteUpdateInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ClientesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<ClienteDto[]>(`${this.base}/clientes`, { params: { estado } });
  }
  lookups() {
    return this.http.get<ClienteLookupsDto>(`${this.base}/clientes/lookups`);
  }
  create(input: ClienteCreateInput) {
    return this.http.post<ClienteDto>(`${this.base}/clientes`, input);
  }
  update(rut: number, input: ClienteUpdateInput) {
    return this.http.put<ClienteDto>(`${this.base}/clientes/${rut}`, input);
  }
  activate(rut: number, input: ClienteUpdateInput) {
    return this.http.post<ClienteDto>(`${this.base}/clientes/${rut}/activate`, input);
  }
  deactivate(rut: number) {
    return this.http.post<ClienteDto>(`${this.base}/clientes/${rut}/deactivate`, {});
  }
}
```

- [ ] **Step 2: Create `clientes-store.ts`**:

```typescript
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, ClienteCreateInput, ClienteDto, ClienteLookupsDto, ClienteUpdateInput,
} from "@serfel/shared";
import { ClientesApi } from "./clientes-api.service";
import { applyFilters, computeStats, paginate, sortRows, type Filters, type Sort, type SortKey } from "./clientes-logic";

const EMPTY_FILTERS: Filters = { razonSocial: "", rut: "", idListaPrecio: null, quick: "" };

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) return err.error.error as ApiErrorBody["error"];
  return null;
}
/** For a 409 RUT_INACTIVO, the body carries the existing client's rut. */
export function rutInactivoRut(err: unknown): number | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code === "RUT_INACTIVO") {
    const rut = Number(err.error.rut);
    return Number.isInteger(rut) ? rut : null;
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class ClientesStore {
  private api = inject(ClientesApi);

  readonly clientes = signal<ClienteDto[]>([]);
  readonly lookups = signal<ClienteLookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "razonSocial", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() => sortRows(applyFilters(this.clientes(), this.filters()), this.sort()));
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.clientes(), this.filtered()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [clientes, lookups] = await Promise.all([
        firstValueFrom(this.api.list(this.estadoFilter())),
        this.lookups() ? Promise.resolve(this.lookups()!) : firstValueFrom(this.api.lookups()),
      ]);
      this.clientes.set(clientes);
      this.lookups.set(lookups);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar los clientes. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> { this.estadoFilter.set(estado); this.page.set(1); await this.load(); }
  setFilter(patch: Partial<Filters>): void { this.filters.update((f) => ({ ...f, ...patch })); this.page.set(1); }
  clearFilters(): void { this.filters.set(EMPTY_FILTERS); this.page.set(1); }
  toggleSort(key: SortKey): void { this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true })); }

  async create(input: ClienteCreateInput): Promise<void> { await firstValueFrom(this.api.create(input)); await this.load(); }
  async update(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.update(rut, input)); await this.load(); }
  async activate(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.activate(rut, input)); await this.load(); }
  async deactivate(rut: number): Promise<void> { await firstValueFrom(this.api.deactivate(rut)); await this.load(); }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/clientes/clientes-api.service.ts apps/frontend/src/app/features/clientes/clientes-store.ts
git commit -m "feat(clientes): frontend api service + signal store"
```

---

### Task 8: Cliente modal component

Create/edit form with Zod validation, RUT + email validation, lista de precio dropdown, permite venta deuda checkbox.

**Files:**
- Create: `apps/frontend/src/app/features/clientes/cliente-modal.component.ts`

**Interfaces:**
- Consumes: `ClienteCreateSchema`, `ClienteUpdateSchema`, `rutValido`, `ClienteDto`, `ClienteLookupsDto`, `ClienteCreateInput`, `ClienteUpdateInput`.
- Produces: `ClienteModalComponent`, `ClienteSavePayload`.

- [ ] **Step 1: Create `cliente-modal.component.ts`**:

```typescript
import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ClienteCreateSchema, ClienteUpdateSchema, rutValido,
  type ClienteCreateInput, type ClienteDto, type ClienteLookupsDto, type ClienteUpdateInput,
} from "@serfel/shared";

interface FieldErrors {
  rut?: string; razonSocial?: string; nomFantasia?: string;
  telefono?: string; direccion?: string; comuna?: string; ciudad?: string; email?: string;
}
export type ClienteSavePayload =
  | { mode: "create"; data: ClienteCreateInput }
  | { mode: "update"; data: ClienteUpdateInput };

@Component({
  selector: "app-cliente-modal",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ cliente ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="c-rut">RUT *</label>
            <input id="c-rut" type="text" placeholder="12345678-5" [(ngModel)]="rut" [disabled]="!!cliente" />
            @if (errors().rut; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-lp">Lista de Precio *</label>
            <select id="c-lp" [(ngModel)]="idListaPrecio">
              @for (l of lookups.listasPrecio; track l.id) { <option [ngValue]="l.id">{{ l.nombre }}</option> }
            </select>
          </div>
          <div class="form-field full">
            <label for="c-rs">Razón Social *</label>
            <input id="c-rs" type="text" [(ngModel)]="razonSocial" />
            @if (errors().razonSocial; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="c-nf">Nombre Fantasía</label>
            <input id="c-nf" type="text" [(ngModel)]="nomFantasia" />
            @if (errors().nomFantasia; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-fono">Teléfono</label>
            <input id="c-fono" type="text" [(ngModel)]="telefono" />
            @if (errors().telefono; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-email">Email</label>
            <input id="c-email" type="email" [(ngModel)]="email" />
            @if (errors().email; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="c-dir">Dirección *</label>
            <input id="c-dir" type="text" [(ngModel)]="direccion" />
            @if (errors().direccion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-comuna">Comuna</label>
            <input id="c-comuna" type="text" [(ngModel)]="comuna" />
            @if (errors().comuna; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-ciudad">Ciudad</label>
            <input id="c-ciudad" type="text" [(ngModel)]="ciudad" />
            @if (errors().ciudad; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="permiteVentaDeuda" />
              Permite venta a deuda
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Cliente' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ClienteModalComponent implements OnInit {
  @Input() cliente: ClienteDto | null = null;
  @Input({ required: true }) lookups!: ClienteLookupsDto;
  @Output() save = new EventEmitter<ClienteSavePayload>();
  @Output() cancel = new EventEmitter<void>();

  rut = ""; razonSocial = ""; nomFantasia = "";
  telefono = ""; direccion = ""; comuna = ""; ciudad = ""; email = "";
  idListaPrecio: number | null = null; permiteVentaDeuda = false;

  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.cliente) {
      this.rut = this.cliente.rut;
      this.razonSocial = this.cliente.razonSocial;
      this.nomFantasia = this.cliente.nomFantasia;
      this.telefono = this.cliente.telefono ?? "";
      this.direccion = this.cliente.direccion;
      this.comuna = this.cliente.comuna;
      this.ciudad = this.cliente.ciudad;
      this.email = this.cliente.email ?? "";
      this.idListaPrecio = this.cliente.idListaPrecio;
      this.permiteVentaDeuda = this.cliente.permiteVentaDeuda;
    } else {
      this.idListaPrecio = this.lookups.listasPrecio[0]?.id ?? null;
    }
  }

  onSave(): void {
    const common = {
      razonSocial: this.razonSocial, nomFantasia: this.nomFantasia,
      telefono: this.telefono.trim() || null, direccion: this.direccion,
      comuna: this.comuna, ciudad: this.ciudad, email: this.email.trim() || null,
      idListaPrecio: this.idListaPrecio, permiteVentaDeuda: this.permiteVentaDeuda,
    };
    if (this.cliente) {
      const parsed = ClienteUpdateSchema.safeParse(common);
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "update", data: parsed.data });
    } else {
      if (!rutValido(this.rut)) return this.errors.set({ rut: "RUT inválido (dígito verificador no coincide)" });
      const parsed = ClienteCreateSchema.safeParse({ ...common, rut: this.rut });
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "create", data: parsed.data });
    }
  }

  private emit(p: ClienteSavePayload): void {
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(p);
  }

  private applyErrors(issues: { path: PropertyKey[]; message: string }[]): void {
    const e: FieldErrors = {};
    for (const i of issues) {
      const k = i.path[0];
      if (k === "rut") e.rut = i.message;
      else if (k === "razonSocial") e.razonSocial = "Razón social es obligatoria";
      else if (k === "nomFantasia") e.nomFantasia = "Nombre de fantasía inválido";
      else if (k === "telefono") e.telefono = "Teléfono inválido";
      else if (k === "direccion") e.direccion = "Dirección es obligatoria";
      else if (k === "comuna") e.comuna = "Comuna inválida";
      else if (k === "ciudad") e.ciudad = "Ciudad inválida";
      else if (k === "email") e.email = "Email inválido";
    }
    this.errors.set(e);
  }

  /** Called by the parent on a 409 from the API. */
  setServerError(code: "RUT_EN_USO" | "RAZON_SOCIAL_EN_USO", message: string): void {
    this.busy.set(false);
    if (code === "RUT_EN_USO") this.errors.set({ rut: message });
    else this.errors.set({ razonSocial: message });
  }

  /** Re-enable the save button after a failed submit the parent handled via toast. */
  resetBusy(): void { this.busy.set(false); }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/features/clientes/cliente-modal.component.ts
git commit -m "feat(clientes): create/edit modal with rut + email validation"
```

---

### Task 9: Clientes page component + route

The list page (hero, stats, filters, table with weekday + document columns, Restaurar button) and the route wiring. Final integration; the frontend build must pass.

**Files:**
- Create: `apps/frontend/src/app/features/clientes/clientes-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts` (import + route)

**Interfaces:**
- Consumes: `ClientesStore`, `apiError`, `rutInactivoRut` (Task 7); `ClienteModalComponent`, `ClienteSavePayload` (Task 8); `WEEKDAYS`, `toCsv`, `SortKey` (Task 6); `ClienteDto`, `ClienteUpdateInput`, `EstadoFilter` (shared); shared `NavbarComponent`, `ToastComponent`, `ToastService`.

- [ ] **Step 1: Create `clientes-page.component.ts`**:

```typescript
import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { EstadoFilter, ClienteDto, ClienteUpdateInput } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { ClientesStore, apiError, rutInactivoRut } from "./clientes-store";
import { ClienteModalComponent, type ClienteSavePayload } from "./cliente-modal.component";
import { toCsv, WEEKDAYS, type SortKey } from "./clientes-logic";

@Component({
  selector: "app-clientes-page",
  standalone: true,
  imports: [FormsModule, NavbarComponent, ClienteModalComponent, ToastComponent],
  template: `
    <app-navbar>
      <div class="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Buscar clientes…"
               [ngModel]="store.filters().quick" (ngModelChange)="store.setFilter({ quick: $event })" />
      </div>
    </app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Clientes</h1>
          <p>Gestiona los clientes, sus rutas y documentos</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo Cliente
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div><div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div><div class="stat-lbl">Clientes</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M3 3h18v4H3zM3 10h18v11H3z"/></svg></div>
          <div><div class="stat-num" style="color:#2563eb">{{ store.stats().listasPrecio }}</div><div class="stat-lbl">Listas de precio</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <div><div class="stat-num" style="color:#d97706">{{ store.stats().conDeuda }}</div><div class="stat-lbl">Con venta a deuda</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
          <div><div class="stat-num" style="color:#059669">{{ store.stats().filtrados ?? '—' }}</div><div class="stat-lbl">Filtrados</div></div></div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field"><label for="f-rut">RUT</label>
          <input id="f-rut" type="text" placeholder="12345678" style="width:150px"
                 [ngModel]="store.filters().rut" (ngModelChange)="store.setFilter({ rut: $event })" /></div>
        <div class="fd-field" style="flex:1"><label for="f-rs">Razón Social</label>
          <input id="f-rs" type="text" placeholder="Buscar por razón social…"
                 [ngModel]="store.filters().razonSocial" (ngModelChange)="store.setFilter({ razonSocial: $event })" /></div>
        <div class="fd-field"><label for="f-lp">Lista de Precio</label>
          <select id="f-lp" style="min-width:160px"
                  [ngModel]="store.filters().idListaPrecio" (ngModelChange)="store.setFilter({ idListaPrecio: $event })">
            <option [ngValue]="null">Todas</option>
            @for (l of store.lookups()?.listasPrecio ?? []; track l.id) { <option [ngValue]="l.id">{{ l.nombre }}</option> }
          </select></div>
        <div class="fd-field"><label for="f-estado">Estado</label>
          <select id="f-estado" [ngModel]="store.estadoFilter()" (ngModelChange)="setEstado($event)">
            <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
          </select></div>
        <button class="btn-clear" (click)="store.clearFilters()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg> Limpiar
        </button>
      </div>

      <div class="toolbar">
        <span class="result-count">
          {{ store.filtered().length }} cliente{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th (click)="store.toggleSort('rut')" [class.sorted]="store.sort().key === 'rut'">RUT <span class="sort-ind">{{ sortInd('rut') }}</span></th>
              <th (click)="store.toggleSort('razonSocial')" [class.sorted]="store.sort().key === 'razonSocial'">Razón Social <span class="sort-ind">{{ sortInd('razonSocial') }}</span></th>
              @for (w of weekdays; track w.dia) { <th style="width:34px;text-align:center" [title]="'Ruta día ' + w.dia">{{ w.label }}</th> }
              <th (click)="store.toggleSort('ultFactura')" [class.sorted]="store.sort().key === 'ultFactura'" style="text-align:right">Ult. Factura <span class="sort-ind">{{ sortInd('ultFactura') }}</span></th>
              <th (click)="store.toggleSort('ultNotaCredito')" [class.sorted]="store.sort().key === 'ultNotaCredito'" style="text-align:right">Ult. Nota Crédito <span class="sort-ind">{{ sortInd('ultNotaCredito') }}</span></th>
              <th style="width:190px; text-align:center">Acciones</th>
            </tr></thead>
            <tbody>
              @for (cli of store.paged().slice; track cli.rutCliente) {
                <tr>
                  <td class="t-num">{{ cli.rut }}</td>
                  <td class="t-name">{{ cli.razonSocial }}<br /><span class="t-muted">{{ cli.nomFantasia }}</span></td>
                  @for (w of weekdays; track w.dia) {
                    <td style="text-align:center">
                      @if (cli.dias.includes(w.dia)) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" style="width:16px;height:16px" [attr.aria-label]="'Ruta día ' + w.dia"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      }
                    </td>
                  }
                  <td class="t-num" style="text-align:right">{{ cli.ultFactura ?? '—' }}</td>
                  <td class="t-num" style="text-align:right">{{ cli.ultNotaCredito ?? '—' }}</td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (cli.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(cli)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(cli)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg> Eliminar
                        </button>
                      } @else {
                        <button class="t-btn t-btn-edit" (click)="restore(cli)" title="Restaurar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/></svg> Restaurar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <div class="per-page-wrap">Mostrar
              <select [ngModel]="store.perPage()" (ngModelChange)="store.perPage.set(+$event); store.page.set(1)">
                <option [ngValue]="10">10</option><option [ngValue]="25">25</option><option [ngValue]="50">50</option>
              </select> por página</div>
            <span class="pag-info">{{ store.paged().from }}–{{ store.paged().to }} de {{ store.filtered().length }}</span>
            <div class="pag-controls">
              <button class="pag-btn" [disabled]="store.paged().page === 1" (click)="goPage(store.paged().page - 1)">‹</button>
              @for (n of pageNumbers(); track n) { <button class="pag-btn" [class.active]="n === store.paged().page" (click)="goPage(n)">{{ n }}</button> }
              <button class="pag-btn" [disabled]="store.paged().page === store.paged().totalPages" (click)="goPage(store.paged().page + 1)">›</button>
            </div>
          </div>
        </div>
      } @else if (!store.loading()) {
        <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No se encontraron clientes</div><div class="empty-sub">Intenta con otros filtros</div></div>
      }
    </div>

    @if (modalOpen()) {
      <app-cliente-modal [cliente]="editing()" [lookups]="store.lookups()!"
        (save)="onSave($event)" (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class ClientesPageComponent implements OnInit {
  readonly store = inject(ClientesStore);
  private toasts = inject(ToastService);
  readonly weekdays = WEEKDAYS;
  readonly modalOpen = signal(false);
  readonly editing = signal<ClienteDto | null>(null);
  private modal = viewChild(ClienteModalComponent);

  ngOnInit(): void { void this.store.load(); }

  sortInd(key: SortKey): string { const s = this.store.sort(); return s.key === key ? (s.asc ? "↑" : "↓") : "↕"; }
  goPage(n: number): void { this.store.page.set(n); }
  pageNumbers(): number[] {
    const total = this.store.paged().totalPages; const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6)); const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  setEstado(estado: EstadoFilter): void { void this.store.setEstado(estado); }

  openModal(cli: ClienteDto | null): void { if (!this.store.lookups()) return; this.editing.set(cli); this.modalOpen.set(true); }

  /** Reconstruct the update payload from a DTO (Restaurar resubmits the row's own data). */
  private toUpdate(cli: ClienteDto): ClienteUpdateInput {
    return {
      razonSocial: cli.razonSocial, nomFantasia: cli.nomFantasia, telefono: cli.telefono,
      direccion: cli.direccion, comuna: cli.comuna, ciudad: cli.ciudad, email: cli.email,
      idListaPrecio: cli.idListaPrecio, permiteVentaDeuda: cli.permiteVentaDeuda,
    };
  }

  async onSave(payload: ClienteSavePayload): Promise<void> {
    const current = this.editing();
    try {
      if (payload.mode === "update" && current) {
        await this.store.update(current.rutCliente, payload.data);
        this.toasts.show("Cliente actualizado exitosamente");
      } else if (payload.mode === "create") {
        await this.store.create(payload.data);
        this.toasts.show("Cliente creado exitosamente");
      }
      this.modalOpen.set(false);
    } catch (err) {
      const inactiveRut = rutInactivoRut(err);
      if (inactiveRut !== null && payload.mode === "create") {
        if (confirm("Este RUT existe pero está inactivo. ¿Deseas reactivarlo con estos datos?")) {
          try {
            await this.store.activate(inactiveRut, payload.data);
            this.toasts.show("Cliente reactivado exitosamente");
            this.modalOpen.set(false);
          } catch (e2) {
            this.toasts.show(apiError(e2)?.message ?? "No se pudo reactivar", "error");
            this.modal()?.resetBusy();
          }
        } else {
          this.modal()?.setServerError("RUT_EN_USO", "RUT inactivo");
        }
        return;
      }
      const known = apiError(err);
      if (known && (known.code === "RUT_EN_USO" || known.code === "RAZON_SOCIAL_EN_USO")) {
        this.modal()?.setServerError(known.code, known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? "Error al guardar el cliente", "error");
      }
    }
  }

  async restore(cli: ClienteDto): Promise<void> {
    if (!confirm(`¿Restaurar al cliente "${cli.razonSocial}"?`)) return;
    try {
      await this.store.activate(cli.rutCliente, this.toUpdate(cli));
      this.toasts.show("Cliente restaurado");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "No se pudo restaurar", "error");
    }
  }

  async confirmDelete(cli: ClienteDto): Promise<void> {
    if (!confirm(`¿Eliminar al cliente "${cli.razonSocial}"? Podrás restaurarlo desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(cli.rutCliente);
      this.toasts.show("Cliente eliminado", "error");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "Error al eliminar", "error");
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "clientes.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
}
```

- [ ] **Step 2: Wire the route** in `apps/frontend/src/app/app.routes.ts` — add the import at the top:

```typescript
import { ClientesPageComponent } from './features/clientes/clientes-page.component';
```

and add the route (before the `**` wildcard):

```typescript
  { path: 'clientes', component: ClientesPageComponent, canActivate: [moduleGuard('clientes')] },
```

- [ ] **Step 3: Typecheck + build the frontend**

Run: `pnpm typecheck && pnpm --filter @serfel/frontend build`
Expected: PASS (build succeeds; the new page compiles and the route resolves).

- [ ] **Step 4: Run the full test suite**

Run: `pnpm -r test`
Expected: PASS (shared + lambdas + frontend). Requires the local MariaDB container running.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/clientes/clientes-page.component.ts apps/frontend/src/app/app.routes.ts
git commit -m "feat(clientes): list page (route days + documents), Restaurar button, route wiring"
```

---

## Post-implementation verification

- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm -r test` — all green (MariaDB up).
- [ ] `pnpm --filter @serfel/frontend build` — succeeds.
- [ ] Deploy to dev (`AWS_PROFILE=admin-christian`, Node 22, `./scripts/sst-deploy.sh --stage dev`) and confirm `/clientes` loads, the table shows weekday icons + last document numbers, create/edit/delete/restaurar all work, and the browser makes no CORS 404 (routes registered in Task 5).
```
