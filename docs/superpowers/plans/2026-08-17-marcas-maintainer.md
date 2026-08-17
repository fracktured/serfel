# Marcas Maintainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a soft-deletable **Marcas** (product brands) maintainer as a full vertical slice — DB migration, shared Zod schema, dedicated Lambda, infra wiring, restructured 3-level navigation, and Angular feature page.

**Architecture:** Strangler-fig vertical slice mirroring the existing Productos maintainer. `20_p_marca` gains AUTO_INCREMENT + an `id_estado` soft-delete column. A new `marcas` Hono Lambda serves CRUD behind a new `marcas` authz module. The Angular nav model is generalized to support subsections + disabled placeholders, and a trimmed Productos-style feature page drives the API.

**Tech Stack:** TypeScript, Drizzle ORM (MariaDB), Zod, Hono (Lambda), SST v3 (Pulumi), Angular 20 (standalone + signals), Vitest.

## Global Constraints

- Node >= 22; pnpm workspaces; run commands from repo root unless noted.
- Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` (root creds `127.0.0.1:3307` user `root` pass `serfel`).
- Zod schemas in `packages/shared` are the single source of truth — reused by Lambda and Angular. Never duplicate DTOs.
- DB PKs are AUTO_INCREMENT; never hand-assign. Read new ids from mysql2 `ResultSetHeader.insertId` (`$returningId()` does not work with this schema's table-level PK style).
- Auth identity = `custom:id_usuario` on the Cognito **ID token**. Module access gated by `MODULE_ROLES` (1 = Administrador).
- A new Hono route MUST also be registered in `infra/api.ts` (explicit routes, not catch-all) or the browser gets a CORS 404.
- Deploy SST **before** running `db:migrate` (the migrate Lambda bundles `migrations/` at deploy time).
- Estado values: `ESTADO_ACTIVO = 1`, `ESTADO_INACTIVO = 0` (from `@serfel/shared`).
- No em dashes in AWS resource names/descriptions.
- Spanish UI copy: "Nueva Marca", "Catálogo de Marcas".

---

## File Structure

**Create:**
- `packages/db/migrations/0012_marca_autoincrement_estado.sql` — custom migration.
- `packages/db/tests/marca-autoincrement.test.ts` — migration verification.
- `packages/shared/src/marcas.ts` — `MarcaInputSchema`, `MarcaDto`, error code.
- `packages/shared/src/marcas.spec.ts` — schema tests.
- `lambdas/marcas/{index,app,service,authz,errors,types}.ts` — Hono app.
- `lambdas/marcas/tests/{helpers,service.test,app.test}.ts` — Lambda tests.
- `apps/frontend/src/app/features/marcas/marcas-api.service.ts`
- `apps/frontend/src/app/features/marcas/marcas-logic.ts` (+ `.spec.ts`)
- `apps/frontend/src/app/features/marcas/marcas-store.ts`
- `apps/frontend/src/app/features/marcas/marca-modal.component.ts`
- `apps/frontend/src/app/features/marcas/marcas-page.component.ts`

**Modify:**
- `packages/db/src/schema.ts:43-50` — `t20PMarca`: autoincrement + `idEstado`.
- `packages/db/migrations/meta/_journal.json` — add 0012 entry.
- `packages/shared/src/authz.ts:7-13` — add `marcas: [1]`.
- `packages/shared/src/index.ts` — export `./marcas`.
- `infra/api.ts` — `MarcasFn` + `marcasRoutes`.
- `apps/frontend/src/app/core/nav.ts` — subsection + placeholder model.
- `apps/frontend/src/app/core/navbar.component.ts` — render subheads + disabled leaves.
- `apps/frontend/src/app/app.routes.ts` — `/marcas` route.

---

## Task 1: DB migration — AUTO_INCREMENT + id_estado on `20_p_marca`

**Files:**
- Modify: `packages/db/src/schema.ts:43-50`
- Create: `packages/db/migrations/0012_marca_autoincrement_estado.sql`
- Modify: `packages/db/migrations/meta/_journal.json`
- Test: `packages/db/tests/marca-autoincrement.test.ts`

**Interfaces:**
- Produces: `t20PMarca` schema now has `idMarca: int().autoincrement().notNull()` and `idEstado: int("id_estado").default(1).notNull()`.

- [ ] **Step 1: Update the Drizzle schema**

In `packages/db/src/schema.ts`, replace the `t20PMarca` definition (lines 43-50):

```typescript
export const t20PMarca = mysqlTable("20_p_marca", {
	idMarca: int("id_marca").autoincrement().notNull(),
	nomMarca: varchar("nom_marca", { length: 50 }).notNull(),
	descMarca: varchar("desc_marca", { length: 200 }).default('').notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idMarca], name: "PRIMARY" }),
]);
```

- [ ] **Step 2: Write the migration SQL**

Create `packages/db/migrations/0012_marca_autoincrement_estado.sql`. `20_p_marca` is the FK parent of `20_m_producto.prod_marca`, so MODIFY...AUTO_INCREMENT runs as a table copy that MariaDB refuses (errno 1834) while FK children hold data — disable FK checks for the rebuild. A legacy `id_marca = 0` row would collide (errno 1062) without NO_AUTO_VALUE_ON_ZERO. Both session vars are saved/restored (connectionLimit=1 makes them persist on the pooled connection). Modeled on `0008_usuario_id_autoincrement.sql`.

```sql
-- 20_p_marca: add soft-delete state, then make id_marca AUTO_INCREMENT.
-- id_marca is the parent of prod_marca (20_m_producto). MariaDB runs
-- MODIFY ... AUTO_INCREMENT as a table COPY, refused (errno 1834) when the
-- parent has FK children with data — so disable FK checks for the rebuild
-- (the ALTER changes no data). A possible id_marca = 0 row would collide
-- (errno 1062) without NO_AUTO_VALUE_ON_ZERO, which keeps the literal 0 and
-- starts AUTO_INCREMENT from MAX+1. Session vars are saved and restored so
-- nothing leaks onto the pooled connection.
ALTER TABLE `20_p_marca` ADD COLUMN `id_estado` int NOT NULL DEFAULT 1;
--> statement-breakpoint
SET @serfel_old_fk = @@session.foreign_key_checks;
--> statement-breakpoint
SET @serfel_old_sql_mode = @@session.sql_mode;
--> statement-breakpoint
SET SESSION foreign_key_checks = 0;
--> statement-breakpoint
SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',NO_AUTO_VALUE_ON_ZERO');
--> statement-breakpoint
ALTER TABLE `20_p_marca` MODIFY COLUMN `id_marca` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET SESSION sql_mode = @serfel_old_sql_mode;
--> statement-breakpoint
SET SESSION foreign_key_checks = @serfel_old_fk;
```

- [ ] **Step 3: Register the migration in the journal**

In `packages/db/migrations/meta/_journal.json`, append to the `entries` array (after the `0011_pink_vision` entry, keeping valid JSON — add a comma after the previous entry's closing brace):

```json
    {
      "idx": 12,
      "version": "5",
      "when": 1787000000000,
      "tag": "0012_marca_autoincrement_estado",
      "breakpoints": true
    }
```

- [ ] **Step 4: Write the failing test**

Create `packages/db/tests/marca-autoincrement.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { createDb, type DbCredentials } from "../src/client";
import { migrateSchemaOnly } from "../src/test-migrate";
import { t20PMarca } from "../src/schema";
import { eq } from "drizzle-orm";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const TEST_DB = "serfel_test_marca_autoinc";

const creds: DbCredentials = {
  host: ROOT.host, port: ROOT.port, username: ROOT.user,
  password: ROOT.password, dbname: TEST_DB,
};

beforeAll(async () => {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await conn.query(`CREATE DATABASE ${TEST_DB}`);
  await conn.end();
});

afterAll(async () => {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await conn.end();
});

describe("20_p_marca AUTO_INCREMENT + id_estado", () => {
  it("auto-assigns id_marca and defaults id_estado to 1", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    try {
      await migrateSchemaOnly(db, "migrations");

      const [first] = await db.insert(t20PMarca).values({ nomMarca: "SOPROLE" });
      const [second] = await db.insert(t20PMarca).values({ nomMarca: "NESTLE" });

      expect(first.insertId).toBeGreaterThan(0);
      expect(second.insertId).toBe(first.insertId + 1);

      const rows = await db
        .select({ idEstado: t20PMarca.idEstado })
        .from(t20PMarca)
        .where(eq(t20PMarca.idMarca, first.insertId));
      expect(rows[0].idEstado).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm --filter @serfel/db exec vitest run tests/marca-autoincrement.test.ts`
Expected: FAIL before the schema/migration edits are in place (unknown column `id_estado`, or no autoincrement). If you did Steps 1-3 first, instead run against a stale journal to confirm — otherwise proceed; the meaningful gate is Step 6.

- [ ] **Step 6: Run the test to verify it passes**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait` then `pnpm --filter @serfel/db exec vitest run tests/marca-autoincrement.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify existing DB tests still pass**

Run: `pnpm --filter @serfel/db exec vitest run tests/producto-autoincrement.test.ts`
Expected: PASS (adding `id_estado` with a default must not break product inserts).

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema.ts packages/db/migrations/0012_marca_autoincrement_estado.sql packages/db/migrations/meta/_journal.json packages/db/tests/marca-autoincrement.test.ts
git commit -m "feat(db): marca id_marca AUTO_INCREMENT + id_estado soft-delete column"
```

---

## Task 2: Shared schema + authz module

**Files:**
- Create: `packages/shared/src/marcas.ts`
- Create: `packages/shared/src/marcas.spec.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/authz.ts:7-13`

**Interfaces:**
- Consumes: `EstadoFilterSchema`, `ESTADO_ACTIVO`, `ESTADO_INACTIVO` from `./productos`.
- Produces:
  - `MarcaInputSchema` (Zod) and `type MarcaInput = { nomMarca: string; descMarca: string }`.
  - `interface MarcaDto { idMarca: number; nomMarca: string; descMarca: string; idEstado: number }`.
  - `MARCA_NO_ENCONTRADA` added to `ApiErrorCode`.
  - `MODULE_ROLES.marcas = [1]` (extends `ModuleName` with `"marcas"`).

- [ ] **Step 1: Add the `marcas` module to authz**

In `packages/shared/src/authz.ts`, add to the `MODULE_ROLES` object (after `clientes`):

```typescript
  clientes: [1], // 1 = Administrador
  marcas: [1], // 1 = Administrador
```

- [ ] **Step 2: Add the error code**

In `packages/shared/src/productos.ts`, add `"MARCA_NO_ENCONTRADA"` to the `ApiErrorCode` union (append a line before the closing `;` of the type):

```typescript
  | "LOCAL_NO_ENCONTRADO"
  | "MARCA_NO_ENCONTRADA";
```

- [ ] **Step 3: Write the failing schema test**

Create `packages/shared/src/marcas.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MarcaInputSchema } from "./marcas";

describe("MarcaInputSchema", () => {
  it("accepts a valid marca and defaults descMarca to empty", () => {
    const parsed = MarcaInputSchema.parse({ nomMarca: "  SOPROLE  " });
    expect(parsed).toEqual({ nomMarca: "SOPROLE", descMarca: "" });
  });

  it("rejects an empty nomMarca", () => {
    expect(MarcaInputSchema.safeParse({ nomMarca: "" }).success).toBe(false);
  });

  it("rejects nomMarca over 50 chars", () => {
    expect(MarcaInputSchema.safeParse({ nomMarca: "x".repeat(51) }).success).toBe(false);
  });

  it("rejects descMarca over 200 chars", () => {
    expect(
      MarcaInputSchema.safeParse({ nomMarca: "OK", descMarca: "x".repeat(201) }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @serfel/shared exec vitest run src/marcas.spec.ts`
Expected: FAIL with "Cannot find module './marcas'".

- [ ] **Step 5: Implement the shared module**

Create `packages/shared/src/marcas.ts`:

```typescript
import { z } from "zod";

export const MarcaInputSchema = z.object({
  nomMarca: z.string().trim().min(1).max(50),
  descMarca: z.string().trim().max(200).default(""),
});
export type MarcaInput = z.infer<typeof MarcaInputSchema>;

export interface MarcaDto {
  idMarca: number;
  nomMarca: string;
  descMarca: string;
  idEstado: number;
}
```

- [ ] **Step 6: Export it**

In `packages/shared/src/index.ts`, add:

```typescript
export * from "./marcas";
```

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm --filter @serfel/shared exec vitest run src/marcas.spec.ts && pnpm typecheck`
Expected: PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/marcas.ts packages/shared/src/marcas.spec.ts packages/shared/src/index.ts packages/shared/src/authz.ts packages/shared/src/productos.ts
git commit -m "feat(shared): marca schema, DTO, error code, and marcas authz module"
```

---

## Task 3: Marcas Lambda service + tests

**Files:**
- Create: `lambdas/marcas/errors.ts`, `lambdas/marcas/types.ts`, `lambdas/marcas/authz.ts`, `lambdas/marcas/service.ts`
- Create: `lambdas/marcas/tests/helpers.ts`, `lambdas/marcas/tests/service.test.ts`

**Interfaces:**
- Consumes: `t20PMarca`, `t10MUsuario`, `Db` from `@serfel/db`; `MarcaInput`, `MarcaDto`, `EstadoFilter`, `ESTADO_ACTIVO`, `ESTADO_INACTIVO`, `tipoCanAccess`, `ModuleName` from `@serfel/shared`.
- Produces (service.ts exports):
  - `listMarcas(db: Db, estado: EstadoFilter): Promise<MarcaDto[]>`
  - `createMarca(db: Db, input: MarcaInput): Promise<MarcaDto>`
  - `updateMarca(db: Db, idMarca: number, input: MarcaInput): Promise<MarcaDto>`
  - `deactivateMarca(db: Db, idMarca: number): Promise<MarcaDto>`
  - `restoreMarca(db: Db, idMarca: number): Promise<MarcaDto>`
  - `getUserTipo(db: Db, idUsuario: number): Promise<number | null>`
- Produces (errors.ts): `AppError`, `isDbUnreachable` (copied from products).
- Produces (types.ts): `AppDeps`, `AppEnv` (copied from products).

- [ ] **Step 1: Copy the shared plumbing files**

Create `lambdas/marcas/errors.ts` and `lambdas/marcas/types.ts` with **identical** content to `lambdas/products/errors.ts` and `lambdas/products/types.ts` (same imports, same code). Create `lambdas/marcas/authz.ts` identical to `lambdas/products/authz.ts`.

- [ ] **Step 2: Write the test helper**

Create `lambdas/marcas/tests/helpers.ts` (minimal FK seed — estados, one tipo usuario, one admin user; marcas are created by the tests):

```typescript
import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb, migrateSchemaOnly, type Db,
  t99PEstado, t10PTipoUsuario, t10MUsuario,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);

export const SEED = { idUsuario: 1, tipoAdmin: 1, tipoVendedor: 2, idUsuarioVendedor: 2 } as const;

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
    {
      idUsuario: SEED.idUsuario, rutUsuario: 11111111, dvUsuario: "1",
      nomUsuario: "Admin Test", apellPatUsuario: "User", apellMatUsuario: "X",
      password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-",
      idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
    {
      idUsuario: SEED.idUsuarioVendedor, rutUsuario: 22222222, dvUsuario: "2",
      nomUsuario: "Vendedor Test", apellPatUsuario: "User", apellMatUsuario: "Y",
      password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-",
      idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
    },
  ]);

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}
```

- [ ] **Step 3: Write the failing service test**

Create `lambdas/marcas/tests/service.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { AppError } from "../errors";
import {
  listMarcas, createMarca, updateMarca, deactivateMarca, restoreMarca,
} from "../service";
import { setupTestDb } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_test_marcas_service"));
});
afterAll(async () => { await teardown(); });

describe("marcas service", () => {
  it("creates a marca and lists it among activos", async () => {
    const created = await createMarca(db, { nomMarca: "SOPROLE", descMarca: "Lacteos" });
    expect(created.idMarca).toBeGreaterThan(0);
    expect(created.idEstado).toBe(1);

    const activos = await listMarcas(db, "activos");
    expect(activos.map((m) => m.nomMarca)).toContain("SOPROLE");
  });

  it("rejects a duplicate active name with NOMBRE_EN_USO", async () => {
    await createMarca(db, { nomMarca: "NESTLE", descMarca: "" });
    await expect(createMarca(db, { nomMarca: "nestle", descMarca: "" }))
      .rejects.toMatchObject({ code: "NOMBRE_EN_USO" });
  });

  it("updates a marca", async () => {
    const created = await createMarca(db, { nomMarca: "COLUN", descMarca: "" });
    const updated = await updateMarca(db, created.idMarca, { nomMarca: "COLUN SA", descMarca: "Sur" });
    expect(updated.nomMarca).toBe("COLUN SA");
    expect(updated.descMarca).toBe("Sur");
  });

  it("throws MARCA_NO_ENCONTRADA updating a missing id", async () => {
    await expect(updateMarca(db, 999999, { nomMarca: "X", descMarca: "" }))
      .rejects.toMatchObject({ code: "MARCA_NO_ENCONTRADA" });
  });

  it("soft-deletes then restores, and a deleted name frees up for reuse", async () => {
    const created = await createMarca(db, { nomMarca: "WATTS", descMarca: "" });
    const deleted = await deactivateMarca(db, created.idMarca);
    expect(deleted.idEstado).toBe(0);
    expect((await listMarcas(db, "activos")).map((m) => m.nomMarca)).not.toContain("WATTS");
    expect((await listMarcas(db, "inactivos")).map((m) => m.nomMarca)).toContain("WATTS");

    // name is free while the original is inactive
    const reused = await createMarca(db, { nomMarca: "WATTS", descMarca: "nueva" });
    expect(reused.idEstado).toBe(1);

    // restoring the original now clashes with the active reuse
    await expect(restoreMarca(db, created.idMarca))
      .rejects.toMatchObject({ code: "NOMBRE_EN_USO" });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/marcas/tests/service.test.ts`
Expected: FAIL with "Cannot find module '../service'".

- [ ] **Step 5: Implement the service**

Create `lambdas/marcas/service.ts`:

```typescript
import { asc, eq, and, ne, sql } from "drizzle-orm";
import { t20PMarca, t10MUsuario, type Db } from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO,
  type EstadoFilter, type MarcaDto, type MarcaInput,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const marcaColumns = {
  idMarca: t20PMarca.idMarca,
  nomMarca: t20PMarca.nomMarca,
  descMarca: t20PMarca.descMarca,
  idEstado: t20PMarca.idEstado,
};

async function getMarcaDto(db: DbOrTx, idMarca: number): Promise<MarcaDto> {
  const rows = await (db as Db)
    .select(marcaColumns)
    .from(t20PMarca)
    .where(eq(t20PMarca.idMarca, idMarca));
  if (rows.length === 0) {
    throw new AppError("MARCA_NO_ENCONTRADA", 404, `Marca ${idMarca} no existe`);
  }
  return rows[0];
}

/** Uniqueness among ACTIVE marcas only (case-insensitive via default collation). */
async function assertUnique(
  tx: DbOrTx, nomMarca: string, excludeIdMarca: number | null
): Promise<void> {
  const conditions = [
    eq(t20PMarca.idEstado, ESTADO_ACTIVO),
    eq(t20PMarca.nomMarca, nomMarca),
  ];
  if (excludeIdMarca !== null) {
    conditions.push(ne(t20PMarca.idMarca, excludeIdMarca));
  }
  const clashes = await (tx as Db)
    .select({ idMarca: t20PMarca.idMarca })
    .from(t20PMarca)
    .where(and(...conditions));
  if (clashes.length > 0) {
    throw new AppError(
      "NOMBRE_EN_USO", 409,
      `El nombre "${nomMarca}" ya está en uso por otra marca activa`
    );
  }
}

export async function listMarcas(db: Db, estado: EstadoFilter): Promise<MarcaDto[]> {
  const query = db.select(marcaColumns).from(t20PMarca);
  const filtered =
    estado === "todos"
      ? query
      : query.where(
          eq(t20PMarca.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO)
        );
  return filtered.orderBy(asc(t20PMarca.nomMarca));
}

export async function createMarca(db: Db, input: MarcaInput): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    await assertUnique(tx, input.nomMarca, null);
    const [header] = await tx.insert(t20PMarca).values({
      nomMarca: input.nomMarca,
      descMarca: input.descMarca,
      idEstado: ESTADO_ACTIVO,
    });
    return getMarcaDto(tx, header.insertId);
  });
}

export async function updateMarca(
  db: Db, idMarca: number, input: MarcaInput
): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    await getMarcaDto(tx, idMarca); // 404 if missing
    await assertUnique(tx, input.nomMarca, idMarca);
    await tx
      .update(t20PMarca)
      .set({ nomMarca: input.nomMarca, descMarca: input.descMarca })
      .where(eq(t20PMarca.idMarca, idMarca));
    return getMarcaDto(tx, idMarca);
  });
}

export async function deactivateMarca(db: Db, idMarca: number): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    const current = await getMarcaDto(tx, idMarca);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx
      .update(t20PMarca)
      .set({ idEstado: ESTADO_INACTIVO })
      .where(eq(t20PMarca.idMarca, idMarca));
    return getMarcaDto(tx, idMarca);
  });
}

export async function restoreMarca(db: Db, idMarca: number): Promise<MarcaDto> {
  return db.transaction(async (tx) => {
    const current = await getMarcaDto(tx, idMarca);
    if (current.idEstado === ESTADO_ACTIVO) return current;
    await assertUnique(tx, current.nomMarca, idMarca);
    await tx
      .update(t20PMarca)
      .set({ idEstado: ESTADO_ACTIVO })
      .where(eq(t20PMarca.idMarca, idMarca));
    return getMarcaDto(tx, idMarca);
  });
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

Note: the `sql` import is unused above — drop it. Keep imports to `asc, eq, and, ne`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/marcas/tests/service.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 7: Commit**

```bash
git add lambdas/marcas/errors.ts lambdas/marcas/types.ts lambdas/marcas/authz.ts lambdas/marcas/service.ts lambdas/marcas/tests/helpers.ts lambdas/marcas/tests/service.test.ts
git commit -m "feat(marcas): lambda service with soft-delete and active-name uniqueness"
```

---

## Task 4: Marcas Lambda HTTP app + handler + tests

**Files:**
- Create: `lambdas/marcas/app.ts`, `lambdas/marcas/index.ts`
- Create: `lambdas/marcas/tests/app.test.ts`

**Interfaces:**
- Consumes: service functions from Task 3; `MarcaInputSchema`, `EstadoFilterSchema`, `ApiErrorBody` from `@serfel/shared`; `AppDeps`, `AppEnv` from `./types`.
- Produces: `createApp(deps: AppDeps)` returning a Hono app; `handler` (index.ts).

- [ ] **Step 1: Write the failing app test**

Create `lambdas/marcas/tests/app.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { createApp } from "../app";
import { setupTestDb, SEED } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;
let app: ReturnType<typeof createApp>;

function makeApp(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario });
}

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_test_marcas_app"));
  app = makeApp(SEED.idUsuario);
});
afterAll(async () => { await teardown(); });

describe("marcas app", () => {
  it("POST then GET /api/marcas round-trips", async () => {
    const post = await app.request("/api/marcas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomMarca: "SOPROLE", descMarca: "Lacteos" }),
    });
    expect(post.status).toBe(201);

    const get = await app.request("/api/marcas?estado=activos");
    expect(get.status).toBe(200);
    const list = (await get.json()) as { nomMarca: string }[];
    expect(list.map((m) => m.nomMarca)).toContain("SOPROLE");
  });

  it("rejects invalid body with 400 VALIDACION", async () => {
    const res = await app.request("/api/marcas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomMarca: "" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDACION");
  });

  it("DELETE soft-deletes and returns idEstado 0", async () => {
    const post = await app.request("/api/marcas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomMarca: "WATTS" }),
    });
    const created = (await post.json()) as { idMarca: number };
    const del = await app.request(`/api/marcas/${created.idMarca}`, { method: "DELETE" });
    expect(del.status).toBe(200);
    expect(((await del.json()) as { idEstado: number }).idEstado).toBe(0);
  });

  it("403 when the user is not mapped (idUsuario null)", async () => {
    const anon = makeApp(null);
    const res = await anon.request("/api/marcas?estado=activos");
    expect(res.status).toBe(403);
  });

  it("403 PROHIBIDO for a non-admin tipo", async () => {
    const vendedor = makeApp(SEED.idUsuarioVendedor);
    const res = await vendedor.request("/api/marcas?estado=activos");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("PROHIBIDO");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/marcas/tests/app.test.ts`
Expected: FAIL with "Cannot find module '../app'".

- [ ] **Step 3: Implement the Hono app**

Create `lambdas/marcas/app.ts`:

```typescript
import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema, MarcaInputSchema, type ApiErrorBody,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import {
  createMarca, deactivateMarca, listMarcas, restoreMarca, updateMarca,
} from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDACION", 400, "id de marca inválido");
  }
  return id;
}

async function parseInput(c: Context) {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = MarcaInputSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (isDbUnreachable(err)) {
      return c.json(
        errorBody("DB_NO_DISPONIBLE",
          "La base de datos no está disponible en este momento. Intenta más tarde."),
        503
      );
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

  const marcas = requireModule("marcas", deps);
  app.use("/marcas", marcas);
  app.use("/marcas/*", marcas);

  app.get("/marcas", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    }
    return c.json(await listMarcas(await deps.getDb(), parsed.data));
  });

  app.post("/marcas", async (c) => {
    const input = await parseInput(c);
    return c.json(await createMarca(await deps.getDb(), input), 201);
  });

  app.put("/marcas/:id", async (c) => {
    const id = parseId(c);
    const input = await parseInput(c);
    return c.json(await updateMarca(await deps.getDb(), id, input));
  });

  app.delete("/marcas/:id", async (c) => {
    const id = parseId(c);
    return c.json(await deactivateMarca(await deps.getDb(), id));
  });

  app.post("/marcas/:id/restore", async (c) => {
    const id = parseId(c);
    return c.json(await restoreMarca(await deps.getDb(), id));
  });

  return app;
}
```

- [ ] **Step 4: Implement the handler**

Create `lambdas/marcas/index.ts` **identical** to `lambdas/products/index.ts` (same secret fetch, `getDb` cache, JWT claim extraction, `handle(app)`). It already imports `createApp` from `./app`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/marcas/tests/app.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Full lambda test suite + typecheck**

Run: `pnpm --filter @serfel/lambdas test && pnpm typecheck`
Expected: PASS (marcas + all existing lambdas), no type errors.

- [ ] **Step 7: Commit**

```bash
git add lambdas/marcas/app.ts lambdas/marcas/index.ts lambdas/marcas/tests/app.test.ts
git commit -m "feat(marcas): hono app, lambda handler, and http tests"
```

---

## Task 5: Infra — register the Marcas function + routes

**Files:**
- Modify: `infra/api.ts`

**Interfaces:**
- Consumes: `privateSubnetIds`, `sgLambdaId`, `dbSecretArn`, `jwtAuthorizer`, `stackTags` (already in scope in `infra/api.ts`).
- Produces: `MarcasFn` and 5 registered routes.

- [ ] **Step 1: Add the `MarcasFn` function**

In `infra/api.ts`, after the `ventasFn` block (before `const api = ...`), add:

```typescript
const marcasFn = new sst.aws.Function("MarcasFn", {
  handler: "lambdas/marcas/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-marcas`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```

- [ ] **Step 2: Register the routes**

In `infra/api.ts`, after the `ventasRoutes` loop (before `export const apiUrl`), add:

```typescript
const marcasRoutes = [
  "GET /api/marcas",
  "POST /api/marcas",
  "PUT /api/marcas/{id}",
  "DELETE /api/marcas/{id}",
  "POST /api/marcas/{id}/restore",
] as const;
for (const route of marcasRoutes) {
  api.route(route, marcasFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add infra/api.ts
git commit -m "feat(infra): marcas lambda function and api routes"
```

---

## Task 6: Frontend nav model — subsections + placeholders

**Files:**
- Modify: `apps/frontend/src/app/core/nav.ts`
- Modify: `apps/frontend/src/app/core/navbar.component.ts`

**Interfaces:**
- Produces:
  - `interface NavLeaf { module?: ModuleName; label: string; path?: string; icon?: string; disabled?: boolean }`
  - `interface NavSection { label?: string; icon?: string; children: NavLeaf[] }`
  - `interface NavGroup { label: string; children: NavSection[] }`
  - `visibleGroups(modulos: ModuleName[]): NavGroup[]` — a section is kept if it has ≥1 accessible real (non-disabled, module-bearing) leaf; its placeholders ride along; a group is kept if it has ≥1 kept section.

- [ ] **Step 1: Rewrite `nav.ts`**

Replace `apps/frontend/src/app/core/nav.ts` with:

```typescript
import type { ModuleName } from "@serfel/shared";

/**
 * Grouped top-bar navigation. A group holds sections; a section optionally has a
 * subheading label and holds leaves. A real leaf maps to exactly one authz module
 * and a route path; a placeholder leaf (disabled: true) has neither and renders
 * greyed as "(no disponible)". `icon` is inner SVG markup rendered inside a 24x24
 * stroke svg by the navbar.
 */
export interface NavLeaf {
  module?: ModuleName;
  label: string;
  path?: string;
  icon?: string;
  disabled?: boolean;
}

export interface NavSection {
  label?: string;
  icon?: string;
  children: NavLeaf[];
}

export interface NavGroup {
  label: string;
  children: NavSection[];
}

const USERS_ICON =
  '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/>';
const CLIENT_ICON =
  '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>';
const PRODUCT_ICON =
  '<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>';
const BRAND_ICON =
  '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>';
const DOC_ICON = '<path d="M4 2h11l5 5v15H4z"/><path d="M9 8h6M9 12h6M9 16h4"/>';
const SALES_ICON =
  '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>';

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Mantenedores",
    children: [
      {
        label: "Usuarios",
        icon: USERS_ICON,
        children: [
          { module: "usuarios", label: "Usuarios", path: "/usuarios", icon: USERS_ICON },
          { label: "Empresas", disabled: true },
        ],
      },
      {
        label: "Clientes",
        icon: CLIENT_ICON,
        children: [
          { module: "clientes", label: "Clientes", path: "/clientes", icon: CLIENT_ICON },
          { label: "Post Venta", disabled: true },
        ],
      },
      {
        label: "Productos",
        icon: PRODUCT_ICON,
        children: [
          { module: "productos", label: "Productos", path: "/productos", icon: PRODUCT_ICON },
          { module: "marcas", label: "Marcas", path: "/marcas", icon: BRAND_ICON },
          { label: "Unidades de Medida", disabled: true },
          { label: "Tipos", disabled: true },
        ],
      },
    ],
  },
  {
    label: "Documentos",
    children: [
      {
        children: [
          { module: "rutas", label: "Listado Carga", path: "/listado-carga", icon: DOC_ICON },
        ],
      },
    ],
  },
  {
    label: "Ventas",
    children: [
      {
        children: [
          { module: "ventas", label: "Prefacturación", path: "/prefacturacion", icon: SALES_ICON },
        ],
      },
    ],
  },
];

/**
 * NAV_GROUPS filtered to the modules this user can access. A section is kept when
 * it has at least one accessible real leaf (a leaf with a module the user has);
 * disabled placeholders ride along with a kept section. A group is kept when it
 * has at least one kept section. Order preserved; the source constant is never
 * mutated.
 */
export function visibleGroups(modulos: ModuleName[]): NavGroup[] {
  const allowed = new Set(modulos);
  return NAV_GROUPS.map((g) => ({
    label: g.label,
    children: g.children
      .filter((s) => s.children.some((l) => l.module !== undefined && allowed.has(l.module)))
      .map((s) => ({
        label: s.label,
        icon: s.icon,
        children: s.children.filter((l) => l.disabled || (l.module !== undefined && allowed.has(l.module))),
      })),
  })).filter((g) => g.children.length > 0);
}
```

- [ ] **Step 2: Update the navbar template to render sections + disabled leaves**

In `apps/frontend/src/app/core/navbar.component.ts`, replace the desktop `.mega` block (the `<div class="mega">…</div>` inside the `@for (group ...)` loop, currently lines ~44-53) with a section-aware version:

```html
              <div class="mega">
                <div class="mega-title">{{ group.label }}</div>
                @for (section of group.children; track $index) {
                  @if (section.label) {
                    <div class="subhead">
                      @if (section.icon) { <span class="mi" [innerHTML]="iconHtml(section.icon)"></span> }
                      {{ section.label }}
                    </div>
                  }
                  <div class="mcol">
                    @for (leaf of section.children; track leaf.label) {
                      @if (leaf.disabled || !leaf.path) {
                        <span class="m-link disabled">
                          <span class="mi">@if (leaf.icon) {<span [innerHTML]="iconHtml(leaf.icon)"></span>}</span>{{ leaf.label }}
                          <span class="soon">no disponible</span>
                        </span>
                      } @else {
                        <a class="m-link" [routerLink]="leaf.path" routerLinkActive="active" (click)="openGroup.set(null)">
                          <span class="mi" [innerHTML]="iconHtml(leaf.icon ?? '')"></span>{{ leaf.label }}
                        </a>
                      }
                    }
                  </div>
                }
              </div>
```

Replace the mobile accordion leaf loop (currently the `@for (leaf of group.children; ...)` inside `@if (openGroup() === group.label)`, lines ~85-87) with a section+leaf version:

```html
                @for (section of group.children; track $index) {
                  @if (section.label) { <div class="m-sub-head">{{ section.label }}</div> }
                  @for (leaf of section.children; track leaf.label) {
                    @if (leaf.disabled || !leaf.path) {
                      <span class="nav-item m-sub disabled">{{ leaf.label }} <span class="soon">no disponible</span></span>
                    } @else {
                      <a class="nav-item m-sub" [routerLink]="leaf.path" routerLinkActive="active" (click)="closeAll()">{{ leaf.label }}</a>
                    }
                  }
                }
```

Update `isGroupActive` to walk sections (replace the method body, currently lines ~200-203):

```typescript
  isGroupActive(group: NavGroup): boolean {
    const url = this.currentUrl();
    return group.children.some((s) =>
      s.children.some((l) => l.path !== undefined && (url === l.path || url.startsWith(l.path + "/")))
    );
  }
```

- [ ] **Step 3: Add styles for subheads and disabled leaves**

In the `styles` array of `navbar.component.ts`, append:

```css
    .subhead { font-size: 11px; font-weight: 800; color: #64748b; padding: 8px 12px 4px; display: flex; align-items: center; gap: 7px; }
    .subhead .mi { width: 15px; height: 15px; opacity: .9; }
    .subhead .mi ::ng-deep svg { width: 15px; height: 15px; color: var(--accent); display: block; }
    .m-link.disabled { color: #cbd5e1; cursor: not-allowed; }
    .m-link.disabled:hover { background: transparent; color: #cbd5e1; }
    .m-link .soon, .nav-item.m-sub .soon { margin-left: auto; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; background: #f1f5f9; border-radius: 6px; padding: 2px 6px; }
    .nav-item.m-sub.disabled { color: rgba(255,255,255,.5); cursor: not-allowed; display: flex; align-items: center; }
    .m-sub-head { font-size: 10px; font-weight: 800; color: rgba(255,255,255,.65); text-transform: uppercase; letter-spacing: .1em; padding: 8px 14px 2px; }
```

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds (template + types compile).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/core/nav.ts apps/frontend/src/app/core/navbar.component.ts
git commit -m "feat(nav): 3-level Mantenedores sections with disabled placeholders"
```

---

## Task 7: Frontend Marcas logic (pure functions) + tests

**Files:**
- Create: `apps/frontend/src/app/features/marcas/marcas-logic.ts`
- Create: `apps/frontend/src/app/features/marcas/marcas-logic.spec.ts`

**Interfaces:**
- Consumes: `MarcaDto` from `@serfel/shared`.
- Produces:
  - `type SortKey = "nomMarca" | "descMarca"`
  - `interface Sort { key: SortKey; asc: boolean }`
  - `interface Filters { nombre: string; quick: string }`
  - `applyFilters(rows: MarcaDto[], f: Filters): MarcaDto[]`
  - `sortRows(rows: MarcaDto[], s: Sort): MarcaDto[]`
  - `paginate<T>(rows: T[], page: number, perPage: number): { slice: T[]; from: number; to: number; page: number; totalPages: number }`
  - `computeStats(all: MarcaDto[], filtered: MarcaDto[]): { total: number; filtrados: number | null }`
  - `toCsv(rows: MarcaDto[]): string`

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/app/features/marcas/marcas-logic.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyFilters, sortRows, paginate, computeStats, toCsv } from "./marcas-logic";
import type { MarcaDto } from "@serfel/shared";

const rows: MarcaDto[] = [
  { idMarca: 1, nomMarca: "SOPROLE", descMarca: "Lacteos", idEstado: 1 },
  { idMarca: 2, nomMarca: "NESTLE", descMarca: "Global", idEstado: 1 },
  { idMarca: 3, nomMarca: "COLUN", descMarca: "Sur", idEstado: 0 },
];

describe("marcas-logic", () => {
  it("applyFilters matches nombre case-insensitively", () => {
    expect(applyFilters(rows, { nombre: "sop", quick: "" }).map((m) => m.idMarca)).toEqual([1]);
  });

  it("applyFilters quick matches nombre or descripcion", () => {
    expect(applyFilters(rows, { nombre: "", quick: "sur" }).map((m) => m.idMarca)).toEqual([3]);
  });

  it("sortRows sorts by nomMarca descending", () => {
    expect(sortRows(rows, { key: "nomMarca", asc: false }).map((m) => m.nomMarca))
      .toEqual(["SOPROLE", "NESTLE", "COLUN"]);
  });

  it("paginate slices and reports bounds", () => {
    const p = paginate(rows, 1, 2);
    expect(p.slice.length).toBe(2);
    expect(p.from).toBe(1);
    expect(p.to).toBe(2);
    expect(p.totalPages).toBe(2);
  });

  it("computeStats reports totals", () => {
    expect(computeStats(rows, [rows[0]])).toEqual({ total: 3, filtrados: 1 });
  });

  it("toCsv includes a header and a row per marca", () => {
    const csv = toCsv(rows);
    expect(csv.split("\n")[0]).toContain("Nombre");
    expect(csv.split("\n").length).toBe(4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/marcas/marcas-logic.spec.ts`
Expected: FAIL with "Cannot find module './marcas-logic'".

- [ ] **Step 3: Implement the logic**

Create `apps/frontend/src/app/features/marcas/marcas-logic.ts`:

```typescript
import type { MarcaDto } from "@serfel/shared";

export type SortKey = "nomMarca" | "descMarca";
export interface Sort { key: SortKey; asc: boolean }
export interface Filters { nombre: string; quick: string }

export function applyFilters(rows: MarcaDto[], f: Filters): MarcaDto[] {
  const nombre = f.nombre.trim().toLowerCase();
  const quick = f.quick.trim().toLowerCase();
  return rows.filter((r) => {
    if (nombre && !r.nomMarca.toLowerCase().includes(nombre)) return false;
    if (quick) {
      const hay = `${r.nomMarca} ${r.descMarca}`.toLowerCase();
      if (!hay.includes(quick)) return false;
    }
    return true;
  });
}

export function sortRows(rows: MarcaDto[], s: Sort): MarcaDto[] {
  const dir = s.asc ? 1 : -1;
  return [...rows].sort((a, b) =>
    a[s.key].localeCompare(b[s.key], "es", { sensitivity: "base" }) * dir
  );
}

export function paginate<T>(rows: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * perPage;
  const slice = rows.slice(start, start + perPage);
  return {
    slice,
    from: rows.length === 0 ? 0 : start + 1,
    to: start + slice.length,
    page: clamped,
    totalPages,
  };
}

export function computeStats(all: MarcaDto[], filtered: MarcaDto[]) {
  return { total: all.length, filtrados: filtered.length };
}

export function toCsv(rows: MarcaDto[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Nombre", "Descripción"].join(",");
  const body = rows.map((r) => [esc(r.nomMarca), esc(r.descMarca)].join(","));
  return [header, ...body].join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/marcas/marcas-logic.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/marcas/marcas-logic.ts apps/frontend/src/app/features/marcas/marcas-logic.spec.ts
git commit -m "feat(marcas): frontend logic helpers with tests"
```

---

## Task 8: Frontend API service + store

**Files:**
- Create: `apps/frontend/src/app/features/marcas/marcas-api.service.ts`
- Create: `apps/frontend/src/app/features/marcas/marcas-store.ts`

**Interfaces:**
- Consumes: `marcas-logic` exports (Task 7); `MarcaDto`, `MarcaInput`, `EstadoFilter`, `ApiErrorBody` from `@serfel/shared`; `environment`.
- Produces:
  - `MarcasApi` with `list(estado)`, `create(input)`, `update(id, input)`, `deactivate(id)`, `restore(id)`.
  - `MarcasStore` (root-provided) with signals `marcas`, `loading`, `errorMsg`, `estadoFilter`, `filters`, `sort`, `page`, `perPage`; computed `filtered`, `paged`, `stats`; methods `load`, `setEstado`, `setFilter`, `clearFilters`, `toggleSort`, `create`, `update`, `deactivate`, `restore`.
  - `apiError(err): ApiErrorBody["error"] | null`.

- [ ] **Step 1: Implement the API service**

Create `apps/frontend/src/app/features/marcas/marcas-api.service.ts`:

```typescript
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { EstadoFilter, MarcaDto, MarcaInput } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class MarcasApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<MarcaDto[]>(`${this.base}/marcas`, { params: { estado } });
  }
  create(input: MarcaInput) {
    return this.http.post<MarcaDto>(`${this.base}/marcas`, input);
  }
  update(id: number, input: MarcaInput) {
    return this.http.put<MarcaDto>(`${this.base}/marcas/${id}`, input);
  }
  deactivate(id: number) {
    return this.http.delete<MarcaDto>(`${this.base}/marcas/${id}`);
  }
  restore(id: number) {
    return this.http.post<MarcaDto>(`${this.base}/marcas/${id}/restore`, {});
  }
}
```

- [ ] **Step 2: Implement the store**

Create `apps/frontend/src/app/features/marcas/marcas-store.ts`:

```typescript
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type { ApiErrorBody, EstadoFilter, MarcaDto, MarcaInput } from "@serfel/shared";
import { MarcasApi } from "./marcas-api.service";
import {
  applyFilters, computeStats, paginate, sortRows,
  type Filters, type Sort, type SortKey,
} from "./marcas-logic";

const EMPTY_FILTERS: Filters = { nombre: "", quick: "" };

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class MarcasStore {
  private api = inject(MarcasApi);

  readonly marcas = signal<MarcaDto[]>([]);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "nomMarca", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() =>
    sortRows(applyFilters(this.marcas(), this.filters()), this.sort())
  );
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.marcas(), this.filtered()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.marcas.set(await firstValueFrom(this.api.list(this.estadoFilter())));
    } catch (err) {
      this.errorMsg.set(
        apiError(err)?.message ?? "No se pudo cargar el listado de marcas. Revisa tu conexión."
      );
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> {
    this.estadoFilter.set(estado);
    this.page.set(1);
    await this.load();
  }

  setFilter(patch: Partial<Filters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
  }

  clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
    this.page.set(1);
  }

  toggleSort(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }

  async create(input: MarcaInput): Promise<void> {
    await firstValueFrom(this.api.create(input));
    await this.load();
  }
  async update(id: number, input: MarcaInput): Promise<void> {
    await firstValueFrom(this.api.update(id, input));
    await this.load();
  }
  async deactivate(id: number): Promise<void> {
    await firstValueFrom(this.api.deactivate(id));
    await this.load();
  }
  async restore(id: number): Promise<void> {
    await firstValueFrom(this.api.restore(id));
    await this.load();
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc --noEmit -p tsconfig.app.json`
Expected: no errors. (If the project has no `tsconfig.app.json`, run `pnpm typecheck` from root.)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/marcas/marcas-api.service.ts apps/frontend/src/app/features/marcas/marcas-store.ts
git commit -m "feat(marcas): frontend api service and signals store"
```

---

## Task 9: Frontend modal + page + route wiring

**Files:**
- Create: `apps/frontend/src/app/features/marcas/marca-modal.component.ts`
- Create: `apps/frontend/src/app/features/marcas/marcas-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `MarcasStore`, `apiError` (Task 8); `MarcaDto`, `MarcaInput`, `MarcaInputSchema`, `EstadoFilter` from `@serfel/shared`; `NavbarComponent`, `ToastComponent`, `ToastService`; `marcas-logic` (`SortKey`, `toCsv`).
- Produces: `MarcaModalComponent`, `MarcasPageComponent`.

- [ ] **Step 1: Implement the modal**

Create `apps/frontend/src/app/features/marcas/marca-modal.component.ts`:

```typescript
import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MarcaInputSchema, type MarcaDto, type MarcaInput } from "@serfel/shared";

interface FieldErrors { nombre?: string; descripcion?: string }

@Component({
  selector: "app-marca-modal",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ marca ? 'Editar Marca' : 'Nueva Marca' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field full">
            <label for="mk-name">Nombre de la Marca *</label>
            <input id="mk-name" type="text" placeholder="SOPROLE" [(ngModel)]="nombre" />
            @if (errors().nombre; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="mk-desc">Descripción</label>
            <input id="mk-desc" type="text" placeholder="Opcional" [(ngModel)]="descripcion" />
            @if (errors().descripcion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Marca' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MarcaModalComponent implements OnInit {
  @Input() marca: MarcaDto | null = null;
  @Output() save = new EventEmitter<MarcaInput>();
  @Output() cancel = new EventEmitter<void>();

  nombre = "";
  descripcion = "";
  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.marca) {
      this.nombre = this.marca.nomMarca;
      this.descripcion = this.marca.descMarca;
    }
  }

  onSave(): void {
    const parsed = MarcaInputSchema.safeParse({ nomMarca: this.nombre, descMarca: this.descripcion });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "nomMarca") errs.nombre = "El nombre es obligatorio (máx. 50)";
        if (issue.path[0] === "descMarca") errs.descripcion = "La descripción admite máx. 200 caracteres";
      }
      this.errors.set(errs);
      return;
    }
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(parsed.data);
  }

  /** Called by the parent when the API returns a 409 name clash. */
  setServerError(message: string): void {
    this.busy.set(false);
    this.errors.set({ nombre: message });
  }
}
```

- [ ] **Step 2: Implement the page**

Create `apps/frontend/src/app/features/marcas/marcas-page.component.ts`:

```typescript
import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { EstadoFilter, MarcaDto, MarcaInput } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { MarcasStore, apiError } from "./marcas-store";
import { MarcaModalComponent } from "./marca-modal.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { toCsv, type SortKey } from "./marcas-logic";

@Component({
  selector: "app-marcas-page",
  standalone: true,
  imports: [FormsModule, NavbarComponent, MarcaModalComponent, ToastComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Catálogo de Marcas</h1>
          <p>Gestiona las marcas de productos del sistema</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nueva Marca
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#2563eb">{{ store.stats().total }}</div>
            <div class="stat-lbl">Marcas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#d97706">{{ store.stats().filtrados ?? '—' }}</div>
            <div class="stat-lbl">Filtradas</div>
          </div>
        </div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field" style="flex:1">
          <label for="f-name">Nombre de la Marca</label>
          <input id="f-name" type="text" placeholder="Buscar por nombre…"
                 [ngModel]="store.filters().nombre"
                 (ngModelChange)="store.setFilter({ nombre: $event })" />
        </div>
        <div class="fd-field">
          <label for="f-estado">Estado</label>
          <select id="f-estado" [ngModel]="store.estadoFilter()" (ngModelChange)="setEstado($event)">
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <button class="btn-clear" (click)="store.clearFilters()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          Limpiar
        </button>
      </div>

      <div class="toolbar">
        <span class="result-count">
          {{ store.filtered().length }} marca{{ store.filtered().length === 1 ? '' : 's' }} encontrada{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th (click)="store.toggleSort('nomMarca')" [class.sorted]="store.sort().key === 'nomMarca'">
                  Nombre <span class="sort-ind">{{ sortInd('nomMarca') }}</span>
                </th>
                <th (click)="store.toggleSort('descMarca')" [class.sorted]="store.sort().key === 'descMarca'">
                  Descripción <span class="sort-ind">{{ sortInd('descMarca') }}</span>
                </th>
                <th style="width:150px; text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (m of store.paged().slice; track m.idMarca) {
                <tr>
                  <td class="t-name">{{ m.nomMarca }}</td>
                  <td class="t-muted">{{ m.descMarca }}</td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (m.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(m)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(m)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          Eliminar
                        </button>
                      } @else {
                        <button class="t-btn t-btn-edit" (click)="restore(m)" title="Restaurar">↩ Restaurar</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <div class="per-page-wrap">
              Mostrar
              <select [ngModel]="store.perPage()" (ngModelChange)="store.perPage.set(+$event); store.page.set(1)">
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
              </select>
              por página
            </div>
            <span class="pag-info">{{ store.paged().from }}–{{ store.paged().to }} de {{ store.filtered().length }}</span>
            <div class="pag-controls">
              <button class="pag-btn" [disabled]="store.paged().page === 1" (click)="goPage(store.paged().page - 1)">‹</button>
              @for (n of pageNumbers(); track n) {
                <button class="pag-btn" [class.active]="n === store.paged().page" (click)="goPage(n)">{{ n }}</button>
              }
              <button class="pag-btn" [disabled]="store.paged().page === store.paged().totalPages" (click)="goPage(store.paged().page + 1)">›</button>
            </div>
          </div>
        </div>
      } @else if (!store.loading()) {
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">No se encontraron marcas</div>
          <div class="empty-sub">Intenta con otros filtros de búsqueda</div>
        </div>
      }
    </div>
    @if (modalOpen()) {
      <app-marca-modal [marca]="editing()" (save)="onSave($event)" (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class MarcasPageComponent implements OnInit {
  readonly store = inject(MarcasStore);
  private toasts = inject(ToastService);
  readonly modalOpen = signal(false);
  readonly editing = signal<MarcaDto | null>(null);
  private modal = viewChild(MarcaModalComponent);

  ngOnInit(): void { void this.store.load(); }

  sortInd(key: SortKey): string {
    const s = this.store.sort();
    return s.key === key ? (s.asc ? "↑" : "↓") : "↕";
  }

  goPage(n: number): void { this.store.page.set(n); }

  pageNumbers(): number[] {
    const total = this.store.paged().totalPages;
    const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6));
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  setEstado(estado: EstadoFilter): void { void this.store.setEstado(estado); }

  async restore(m: MarcaDto): Promise<void> {
    try {
      await this.store.restore(m.idMarca);
      this.toasts.show("Marca restaurada");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "No se pudo restaurar", "error");
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "marcas.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  openModal(marca: MarcaDto | null): void {
    this.editing.set(marca);
    this.modalOpen.set(true);
  }

  async onSave(input: MarcaInput): Promise<void> {
    const current = this.editing();
    try {
      if (current) {
        await this.store.update(current.idMarca, input);
        this.toasts.show("Marca actualizada exitosamente");
      } else {
        await this.store.create(input);
        this.toasts.show("Marca creada exitosamente");
      }
      this.modalOpen.set(false);
    } catch (err) {
      const known = apiError(err);
      if (known && known.code === "NOMBRE_EN_USO") {
        this.modal()?.setServerError(known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? "Error al guardar la marca", "error");
      }
    }
  }

  async confirmDelete(marca: MarcaDto): Promise<void> {
    if (!confirm(`¿Eliminar "${marca.nomMarca}"? Podrás restaurarla desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(marca.idMarca);
      this.toasts.show("Marca eliminada", "error");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "Error al eliminar", "error");
    }
  }
}
```

- [ ] **Step 3: Wire the route**

In `apps/frontend/src/app/app.routes.ts`, add the import and the route (after the `clientes` route):

```typescript
import { MarcasPageComponent } from './features/marcas/marcas-page.component';
```

```typescript
  { path: 'marcas', component: MarcasPageComponent, canActivate: [moduleGuard('marcas')] },
```

- [ ] **Step 4: Build the frontend**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/marcas/marca-modal.component.ts apps/frontend/src/app/features/marcas/marcas-page.component.ts apps/frontend/src/app/app.routes.ts
git commit -m "feat(marcas): modal, catalog page, and route"
```

---

## Task 10: Full verification + dev migration

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait && pnpm -r test`
Expected: all packages green (shared, db, marcas + existing lambdas, frontend).

- [ ] **Step 2: Typecheck the monorepo**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Deploy to dev, then migrate (order matters)**

The migrate Lambda bundles `migrations/` at deploy time, so deploy first. Use `AWS_PROFILE=admin-christian` + Node 22.

Run:
```bash
AWS_PROFILE=admin-christian ./scripts/sst-deploy.sh --stage dev
pnpm db:start   # if the dev RDS instance is stopped
pnpm db:migrate
```
Expected: deploy succeeds (MarcasFn + routes created); migration 0012 applies without 1834/1452/1062 errors. If the dev DB has an `id_marca = 0` row or FK issues, diagnose via a temporary `{diagnose:true}` branch in the migrate Lambda (see repo memory `autoincrement-alter-fk-parent-1834`) before retrying.

- [ ] **Step 4: Manually drive the maintainer**

In the dev app: open **Mantenedores → Productos → Marcas**; confirm the 3-level menu renders with greyed "(no disponible)" placeholders (Empresas, Post Venta, Unidades de Medida, Tipos). Then: create a marca → attempt a duplicate active name (expect inline "en uso") → edit → eliminar (moves to Inactivos) → switch to Inactivos filter → Restaurar. Confirm the products maintainer's brand dropdown still lists marcas.

- [ ] **Step 5: Final commit (if any doc/worklog updates)**

```bash
git add -A
git commit -m "chore(marcas): verification notes" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- Section 1 (DB: autoincrement + id_estado, FK-parent handling) → Task 1. ✓
- Section 2 (shared schema, DTO, error code, authz module) → Task 2. ✓
- Section 3 (lambda: 5 endpoints, uniqueness-among-active, soft-delete) → Tasks 3-4. ✓
- Section 4 (infra: MarcasFn + routes) → Task 5. ✓
- Section 5 (nav model: sections, placeholders, visibleGroups rule) → Task 6. ✓
- Section 6 (frontend feature: api/logic/store/modal/page, no header-search, route) → Tasks 7-9. ✓
- Verification checklist → Task 10. ✓

**Type consistency:** `MarcaDto`/`MarcaInput` identical across shared, lambda, and frontend. Service names (`listMarcas`/`createMarca`/`updateMarca`/`deactivateMarca`/`restoreMarca`) match between Task 3 (definition), Task 4 (app import), and are not renamed later. `SortKey`/`Filters`/`Sort` defined in Task 7 and consumed unchanged in Tasks 8-9. Nav types (`NavLeaf`/`NavSection`/`NavGroup`) defined in Task 6 and used by the navbar in the same task.

**Placeholder scan:** No TBD/TODO; every code step has literal content. Note in Task 3 Step 5 flags the unused `sql` import to drop.

**Known deviations to watch during execution:**
- The exact line numbers in `navbar.component.ts` (Task 6 Step 2) are approximate; match by the surrounding markup, not line number.
- `moduleGuard` and `ToastService`/`ToastComponent` import paths are assumed identical to the productos page; confirm against `productos-page.component.ts` if an import fails.
