# Fase 3 PoC — Mantenedor de Productos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a full vertical slice of the products maintainer — Angular UI → CloudFront/S3 → API Gateway HTTP API + Cognito JWT → `products` Lambda (Hono) → Drizzle → RDS MariaDB — deployed to the `dev` stage.

**Architecture:** One Lambda per domain (this plan builds the `products` domain) behind an SST `ApiGatewayV2` with a Cognito JWT authorizer validating **ID tokens**. Business logic lives in a service layer tested against a local dockerized MariaDB. The Angular 20 app (standalone + signals, custom SCSS from the approved prototype) is deployed as an SST `StaticSite`. Spec: `AWS/docs/superpowers/specs/2026-07-16-phase3-products-maintainer-poc-design.md`.

**Tech Stack:** SST v3 (+ raw `@pulumi/aws` for Cognito), Node 22 ARM64 Lambda, Hono v4, Drizzle ORM 0.44 + mysql2, Zod v4, Vitest, Angular 20 + `aws-amplify` v6, pnpm workspaces.

## Global Constraints

- Repo root for all commands and commits: `/Users/christiancastro/Documents/Serfel/AWS/serfel` (the git repo). The plan/spec files live one level up in `AWS/` (NOT in git).
- All AWS CLI commands run with `--profile admin-christian` (or `AWS_PROFILE=admin-christian`). Region is always `us-east-1`. CI uses OIDC instead.
- Resource naming convention: `serfel-dev-<thing>` via `transform` / `name` (match `infra/database.ts`, `infra/migrate.ts`).
- Dev DB (`serfel-dev-db`) is normally **stopped**. Tasks that hit the real DB say so explicitly and use `pnpm db:start` / `pnpm db:stop`.
- Estado semantics (verified against `packages/db/dump/legacy-data.sql`): `1 = Activo`, `0 = Inactivo`. Uniqueness of `cod_serfel` and `nom_producto` applies **only among products with `id_estado = 1`**.
- UI reference is `AWS/prototipes/prototype-3-bold-vibrant-table.html` (the *table* variant). Column "Nº" = `cod_serfel`.
- Never read, select, or log `10_m_usuario.password`.
- TypeScript strict everywhere; no `any` unless a narrow cast is unavoidable (Hono `c.env`).
- Node >= 22, pnpm >= 9. Local unit tests need the docker MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait`.
- Conventional commit messages (`feat:`, `fix:`, `test:`, `chore:`, `ci:`).

---

### Task 1: `@serfel/shared` — Zod schemas, DTOs, constants

**Files:**
- Modify: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/productos.ts`
- Test: `packages/shared/tests/productos.test.ts`

**Interfaces:**
- Consumes: nothing (leaf package).
- Produces (imported by every later task):
  - `ESTADO_ACTIVO = 1`, `ESTADO_INACTIVO = 0`
  - `EstadoFilterSchema` (Zod), `type EstadoFilter = "activos" | "inactivos" | "todos"` (defaults to `"activos"` when input is `undefined`)
  - `ProductoInputSchema` (Zod), `type ProductoInput = { codSerfel: number; nomProducto: string; idMarca: number; idUm: number; idTipoProducto: number }`
  - `interface ProductoDto { idProducto: number; codSerfel: number; nomProducto: string; idMarca: number; nomMarca: string; idUm: number; nomUm: string; idTipoProducto: number; nomTipoProducto: string; idEstado: number }`
  - `interface LookupItem { id: number; nombre: string }`
  - `interface LookupsDto { marcas: LookupItem[]; tiposProducto: LookupItem[]; unidadesMedida: LookupItem[] }`
  - `type ApiErrorCode = "COD_SERFEL_EN_USO" | "NOMBRE_EN_USO" | "PRODUCTO_NO_ENCONTRADO" | "VALIDACION" | "NO_AUTORIZADO" | "DB_NO_DISPONIBLE" | "ERROR_INTERNO"`
  - `interface ApiErrorBody { error: { code: ApiErrorCode; message: string } }`

- [ ] **Step 1: Make `@serfel/shared` a real package**

Replace `packages/shared/package.json` with:

```json
{
  "name": "@serfel/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

Run: `pnpm install` (from repo root)

- [ ] **Step 2: Write the failing test**

Create `packages/shared/tests/productos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ESTADO_ACTIVO,
  ESTADO_INACTIVO,
  EstadoFilterSchema,
  ProductoInputSchema,
} from "../src/productos";

describe("estado constants", () => {
  it("matches legacy 99_p_estado values (1=Activo, 0=Inactivo)", () => {
    expect(ESTADO_ACTIVO).toBe(1);
    expect(ESTADO_INACTIVO).toBe(0);
  });
});

describe("EstadoFilterSchema", () => {
  it("defaults to activos when undefined", () => {
    expect(EstadoFilterSchema.parse(undefined)).toBe("activos");
  });
  it("accepts the three values", () => {
    expect(EstadoFilterSchema.parse("inactivos")).toBe("inactivos");
    expect(EstadoFilterSchema.parse("todos")).toBe("todos");
  });
  it("rejects anything else", () => {
    expect(EstadoFilterSchema.safeParse("x").success).toBe(false);
  });
});

describe("ProductoInputSchema", () => {
  const valid = {
    codSerfel: 311,
    nomProducto: "YOG.BATIDO SOPR 165grs",
    idMarca: 1,
    idUm: 1,
    idTipoProducto: 1,
  };

  it("accepts a valid input", () => {
    expect(ProductoInputSchema.parse(valid)).toEqual(valid);
  });
  it("trims the name", () => {
    expect(
      ProductoInputSchema.parse({ ...valid, nomProducto: "  X  " }).nomProducto
    ).toBe("X");
  });
  it("rejects empty name, non-positive codSerfel, missing fields", () => {
    expect(ProductoInputSchema.safeParse({ ...valid, nomProducto: "  " }).success).toBe(false);
    expect(ProductoInputSchema.safeParse({ ...valid, codSerfel: 0 }).success).toBe(false);
    expect(ProductoInputSchema.safeParse({ ...valid, codSerfel: 1.5 }).success).toBe(false);
    const { idMarca: _omit, ...missing } = valid;
    expect(ProductoInputSchema.safeParse(missing).success).toBe(false);
  });
  it("rejects names longer than 200 chars", () => {
    expect(
      ProductoInputSchema.safeParse({ ...valid, nomProducto: "a".repeat(201) }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @serfel/shared test`
Expected: FAIL — cannot resolve `../src/productos`.

- [ ] **Step 4: Write the implementation**

Create `packages/shared/src/productos.ts`:

```ts
import { z } from "zod";

/** Verified against legacy 99_p_estado: 1=Activo, 0=Inactivo. */
export const ESTADO_ACTIVO = 1;
export const ESTADO_INACTIVO = 0;

export const EstadoFilterSchema = z
  .enum(["activos", "inactivos", "todos"])
  .default("activos");
export type EstadoFilter = z.infer<typeof EstadoFilterSchema>;

export const ProductoInputSchema = z.object({
  codSerfel: z.number().int().positive(),
  nomProducto: z.string().trim().min(1).max(200),
  idMarca: z.number().int().positive(),
  idUm: z.number().int().positive(),
  // nonnegative, not positive: the legacy catalog's only tipo row is
  // id 0 "SIN TIPO" — rejecting 0 would make product creation impossible
  idTipoProducto: z.number().int().nonnegative(),
});
export type ProductoInput = z.infer<typeof ProductoInputSchema>;

export interface ProductoDto {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  idMarca: number;
  nomMarca: string;
  idUm: number;
  nomUm: string;
  idTipoProducto: number;
  nomTipoProducto: string;
  idEstado: number;
}

export interface LookupItem {
  id: number;
  nombre: string;
}

export interface LookupsDto {
  marcas: LookupItem[];
  tiposProducto: LookupItem[];
  unidadesMedida: LookupItem[];
}

export type ApiErrorCode =
  | "COD_SERFEL_EN_USO"
  | "NOMBRE_EN_USO"
  | "PRODUCTO_NO_ENCONTRADO"
  | "VALIDACION"
  | "NO_AUTORIZADO"
  | "DB_NO_DISPONIBLE"
  | "ERROR_INTERNO";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
```

Create `packages/shared/src/index.ts`:

```ts
export * from "./productos";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @serfel/shared test`
Expected: PASS (all tests green).

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm typecheck
git add packages/shared pnpm-lock.yaml
git commit -m "feat(shared): producto schemas, DTOs and estado constants"
```

---

### Task 2: `@serfel/db` — AUTO_INCREMENT migration, relations wiring, `Db` type

**Files:**
- Modify: `packages/db/src/schema.ts` (line ~459, `idProducto` column)
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/docker-compose.yml`
- Modify: `lambdas/migrate/index.ts` (SecretString guard — Phase 2 carry-forward)
- Create (generated): `packages/db/migrations/0001_*.sql`
- Test: `packages/db/tests/producto-autoincrement.test.ts`

**Interfaces:**
- Consumes: existing `createDb(creds, opts)` from `packages/db/src/client.ts`.
- Produces:
  - `export type Db` — the drizzle database type (with relations in the schema), imported by the Lambda as `import type { Db } from "@serfel/db"`.
  - Migration journal now contains `0001` (ALTER to AUTO_INCREMENT); `t20MProducto.idProducto` has `.autoincrement()`, making it optional on insert. **The DB-assigned id is read from mysql2's `ResultSetHeader.insertId`** (drizzle's `$returningId()` does NOT work with this schema's table-level PK style — verified during execution; do not use it).
  - `createDb` pool now sets `connectTimeout: 5000` (fast failure when DB is stopped → maps to 503 later).

- [ ] **Step 1: Start the local docker MariaDB (with healthcheck)**

Replace `packages/db/docker-compose.yml` with:

```yaml
services:
  mariadb:
    image: mariadb:11.4
    ports:
      - "3307:3306"
    environment:
      MARIADB_ROOT_PASSWORD: serfel
      MARIADB_DATABASE: serfel
    volumes:
      - mariadb-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 5s
      timeout: 5s
      retries: 24

volumes:
  mariadb-data:
```

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait`
Expected: container healthy.

- [ ] **Step 2: Write the failing test**

Create `packages/db/tests/producto-autoincrement.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, type DbCredentials } from "../src/client";
import {
  t99PEstado,
  t10PTipoUsuario,
  t10MUsuario,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t20MProducto,
} from "../src/schema";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const TEST_DB = "serfel_test_autoinc";

const creds: DbCredentials = {
  host: ROOT.host,
  port: ROOT.port,
  username: ROOT.user,
  password: ROOT.password,
  dbname: TEST_DB,
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

describe("20_m_producto id_producto AUTO_INCREMENT", () => {
  it("assigns ids on insert without an explicit id_producto", async () => {
    const { db, pool } = createDb(creds, { ssl: false });
    try {
      await migrate(db, { migrationsFolder: "migrations" });

      // minimal FK seed
      await db.insert(t99PEstado).values([
        { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
        { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
      ]);
      await db.insert(t10PTipoUsuario).values({
        idTipoUsuario: 1, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador",
      });
      await db.insert(t10MUsuario).values({
        idUsuario: 1, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Test",
        apellPatUsuario: "User", apellMatUsuario: "X", password: "unused",
        idTipoUsuario: 1, direccionUsuario: "-", idUsuarioMod: 1,
        ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
      });
      await db.insert(t20PMarca).values({ idMarca: 1, nomMarca: "SOPROLE" });
      await db.insert(t20PTipoProducto).values({
        idTipoProducto: 1, nomTipoProducto: "YOGURT",
        idUsuarioMod: 1, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
      });
      await db.insert(t20PUnidadMedida).values({ idUm: 1, nomUm: "UNI" });

      const base = {
        nomProducto: "P1", descProducto: "", codBarraProducto: "",
        idTipoProducto: 1, idMarca: 1, idUm: 1, idUsuarioMod: 1,
        ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
        codSerfel: 100, impuesto: 0, usaPorciones: 0,
      };
      // $returningId() does not work with table-level PK constraints (this
      // schema's introspected style) — read mysql2's ResultSetHeader.insertId.
      const [first] = await db.insert(t20MProducto).values(base);
      const [second] = await db
        .insert(t20MProducto)
        .values({ ...base, nomProducto: "P2", codSerfel: 101 });

      expect(first.insertId).toBeGreaterThan(0);
      expect(second.insertId).toBe(first.insertId + 1);
    } finally {
      await pool.end();
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @serfel/db test`
Expected: the new test FAILS (`$returningId` unusable / `id_producto` has no default) because the column has no `.autoincrement()` yet and no migration exists. The pre-existing `client.test.ts` must still PASS.

- [ ] **Step 4: Add `.autoincrement()` to the schema**

In `packages/db/src/schema.ts`, change the `t20MProducto` id column (line ~459):

```ts
// before:
	idProducto: int("id_producto").notNull(),
// after:
	idProducto: int("id_producto").autoincrement().notNull(),
```

(Only inside `t20MProducto` — other tables keep their manual ids for now.)

- [ ] **Step 5: Generate the migration**

Run: `pnpm --filter @serfel/db generate`
Expected: a new file `packages/db/migrations/0001_<slug>.sql` containing exactly one statement:

```sql
ALTER TABLE `20_m_producto` MODIFY COLUMN `id_producto` int AUTO_INCREMENT NOT NULL;
```

Inspect the file; if drizzle-kit generated anything else (drops, unrelated ALTERs), STOP — do not proceed; the schema drifted and needs investigation.

- [ ] **Step 6: Wire relations into the client and export `Db`**

Replace `packages/db/src/client.ts` with:

```ts
import mysql, { type Pool, type SslOptions } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";
import * as relations from "./relations";

const fullSchema = { ...schema, ...relations };
export type Db = MySql2Database<typeof fullSchema>;

export interface DbCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  dbname: string;
}

export interface CreateDbOptions {
  /** TLS options passed to mysql2. `false` disables TLS (local docker only). */
  ssl?: SslOptions | false;
}

/**
 * Connection factory for Lambda use: instantiate at module level (outside the
 * handler) so warm invocations reuse the pool. connectionLimit is 1 by design
 * (see master plan §2.5 — no RDS Proxy, low per-function concurrency).
 * connectTimeout is short so a stopped dev DB fails fast (mapped to HTTP 503).
 */
export function createDb(
  creds: DbCredentials,
  opts: CreateDbOptions = {}
): { db: Db; pool: Pool } {
  const pool = mysql.createPool({
    host: creds.host,
    port: creds.port,
    user: creds.username,
    password: creds.password,
    database: creds.dbname,
    connectionLimit: 1,
    connectTimeout: 5000,
    ...(opts.ssl !== undefined && opts.ssl !== false ? { ssl: opts.ssl } : {}),
  });
  const db = drizzle(pool, { schema: fullSchema, mode: "default" });
  return { db, pool };
}
```

- [ ] **Step 7: SecretString guard in the migrate Lambda (carry-forward)**

In `lambdas/migrate/index.ts`, replace:

```ts
  const creds = JSON.parse(secret.SecretString!) as DbCredentials;
```

with:

```ts
  if (!secret.SecretString) {
    throw new Error("DB secret has no SecretString");
  }
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --filter @serfel/db test`
Expected: PASS — including the pre-existing `client.test.ts` (which applies the full journal, now 0000 + 0001, to a fresh DB).

- [ ] **Step 9: Typecheck and commit**

```bash
pnpm typecheck
git add packages/db lambdas/migrate/index.ts
git commit -m "feat(db): id_producto AUTO_INCREMENT migration, wire relations, export Db type"
```

**Note for the deploy tasks:** migration 0001 is applied to the real dev DB by the existing CI migrate step (or `pnpm db:migrate`) — it's a fast metadata ALTER on a ~2,750-row table, safely within the migrate Lambda's 60s timeout.

---

### Task 3: `lambdas/products` — test harness, errors, lookups + list service

**Files:**
- Modify: `lambdas/package.json`
- Create: `lambdas/products/errors.ts`
- Create: `lambdas/products/service.ts`
- Create: `lambdas/products/tests/helpers.ts`
- Test: `lambdas/products/tests/service.test.ts`

**Interfaces:**
- Consumes: `Db`, table objects from `@serfel/db`; DTO types + constants from `@serfel/shared`.
- Produces:
  - `class AppError extends Error { code: ApiErrorCode; status: ContentfulStatusCode }` (constructor `(code, status, message)`) in `errors.ts`
  - `service.getLookups(db: Db): Promise<LookupsDto>`
  - `service.listProducts(db: Db, estado: EstadoFilter): Promise<ProductoDto[]>` (ordered by `codSerfel` asc)
  - Test helper `setupTestDb(dbName: string): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }>` — creates a fresh DB, runs migrations, seeds: estados 0/1, tipo_usuario 1, usuario 1, marcas 1=SOPROLE / 2=NESTLE, tipoProducto 1=YOGURT, UMs 1=UNI / 2=LT.

- [ ] **Step 1: Add dependencies**

In `lambdas/package.json`, set:

```json
{
  "name": "@serfel/lambdas",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@aws-sdk/client-rds": "^3.600.0",
    "@aws-sdk/client-secrets-manager": "^3.600.0",
    "@serfel/db": "workspace:*",
    "@serfel/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "hono": "^4.6.0",
    "mysql2": "^3.14.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

Run: `pnpm install`

- [ ] **Step 2: Create the test DB helper**

Create `lambdas/products/tests/helpers.ts`:

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
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };

const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);

export const SEED = {
  idUsuario: 1,
  marcaSoprole: 1,
  marcaNestle: 2,
  tipoYogurt: 1,
  umUni: 1,
  umLt: 2,
} as const;

export async function setupTestDb(
  dbName: string
): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    {
      host: ROOT.host,
      port: ROOT.port,
      username: ROOT.user,
      password: ROOT.password,
      dbname: dbName,
    },
    { ssl: false }
  );
  await migrate(db, { migrationsFolder: MIGRATIONS });

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
  ]);
  await db.insert(t10PTipoUsuario).values({
    idTipoUsuario: 1, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador",
  });
  await db.insert(t10MUsuario).values({
    idUsuario: SEED.idUsuario, rutUsuario: 11111111, dvUsuario: "1",
    nomUsuario: "Test", apellPatUsuario: "User", apellMatUsuario: "X",
    password: "unused", idTipoUsuario: 1, direccionUsuario: "-",
    idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
  });
  await db.insert(t20PMarca).values([
    { idMarca: SEED.marcaSoprole, nomMarca: "SOPROLE" },
    { idMarca: SEED.marcaNestle, nomMarca: "NESTLE" },
  ]);
  await db.insert(t20PTipoProducto).values({
    idTipoProducto: SEED.tipoYogurt, nomTipoProducto: "YOGURT",
    idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1,
  });
  await db.insert(t20PUnidadMedida).values([
    { idUm: SEED.umUni, nomUm: "UNI" },
    { idUm: SEED.umLt, nomUm: "LT" },
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

Note: `t10PTipoUsuario`, `t10MUsuario`, etc. are already exported by `@serfel/db` (its `index.ts` re-exports `schema.ts`).

- [ ] **Step 3: Create `errors.ts`**

Create `lambdas/products/errors.ts`:

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

- [ ] **Step 4: Write the failing tests (lookups + list)**

Create `lambdas/products/tests/service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t20MProducto, type Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getLookups, listProducts } from "../service";

let db: Db;
let pool: Pool;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, pool, teardown } = await setupTestDb("serfel_products_svc"));
});
afterAll(async () => {
  await teardown();
});

function productRow(over: Partial<typeof base> = {}) {
  return { ...base, ...over };
}
const base = {
  nomProducto: "YOG BASE", descProducto: "", codBarraProducto: "",
  idTipoProducto: SEED.tipoYogurt, idMarca: SEED.marcaSoprole, idUm: SEED.umUni,
  idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
  idEstado: 1, codSerfel: 311, impuesto: 0, usaPorciones: 0,
};

describe("getLookups", () => {
  it("returns marcas, tiposProducto and unidadesMedida as {id, nombre}", async () => {
    const lookups = await getLookups(db);
    expect(lookups.marcas).toEqual([
      { id: SEED.marcaSoprole, nombre: "SOPROLE" },
      { id: SEED.marcaNestle, nombre: "NESTLE" },
    ]);
    expect(lookups.tiposProducto).toEqual([{ id: SEED.tipoYogurt, nombre: "YOGURT" }]);
    expect(lookups.unidadesMedida).toEqual([
      { id: SEED.umUni, nombre: "UNI" },
      { id: SEED.umLt, nombre: "LT" },
    ]);
  });
});

describe("listProducts", () => {
  beforeAll(async () => {
    await db.insert(t20MProducto).values([
      productRow({ nomProducto: "ACTIVO A", codSerfel: 200 }),
      productRow({ nomProducto: "ACTIVO B", codSerfel: 100, idMarca: SEED.marcaNestle }),
      productRow({ nomProducto: "INACTIVO C", codSerfel: 300, idEstado: 0 }),
    ]);
  });

  it("returns active products with joined names, ordered by codSerfel", async () => {
    const rows = await listProducts(db, "activos");
    expect(rows.map((r) => r.codSerfel)).toEqual([100, 200]);
    const b = rows[0];
    expect(b).toMatchObject({
      codSerfel: 100,
      nomProducto: "ACTIVO B",
      nomMarca: "NESTLE",
      nomUm: "UNI",
      nomTipoProducto: "YOGURT",
      idEstado: 1,
    });
    expect(b.idProducto).toBeGreaterThan(0);
  });

  it("filters inactivos and todos", async () => {
    const inactive = await listProducts(db, "inactivos");
    expect(inactive.map((r) => r.nomProducto)).toEqual(["INACTIVO C"]);
    const all = await listProducts(db, "todos");
    expect(all).toHaveLength(3);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas test`
Expected: FAIL — `../service` does not exist.

- [ ] **Step 6: Implement the service (lookups + list)**

Create `lambdas/products/service.ts`:

```ts
import { asc, eq } from "drizzle-orm";
import {
  t20MProducto,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO,
  ESTADO_INACTIVO,
  type EstadoFilter,
  type LookupsDto,
  type ProductoDto,
} from "@serfel/shared";

/** drizzle transaction object — same query API as Db for our purposes. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const productoDtoColumns = {
  idProducto: t20MProducto.idProducto,
  codSerfel: t20MProducto.codSerfel,
  nomProducto: t20MProducto.nomProducto,
  idMarca: t20MProducto.idMarca,
  nomMarca: t20PMarca.nomMarca,
  idUm: t20MProducto.idUm,
  nomUm: t20PUnidadMedida.nomUm,
  idTipoProducto: t20MProducto.idTipoProducto,
  nomTipoProducto: t20PTipoProducto.nomTipoProducto,
  idEstado: t20MProducto.idEstado,
};

function productQuery(db: DbOrTx) {
  return (db as Db)
    .select(productoDtoColumns)
    .from(t20MProducto)
    .innerJoin(t20PMarca, eq(t20MProducto.idMarca, t20PMarca.idMarca))
    .innerJoin(t20PUnidadMedida, eq(t20MProducto.idUm, t20PUnidadMedida.idUm))
    .innerJoin(
      t20PTipoProducto,
      eq(t20MProducto.idTipoProducto, t20PTipoProducto.idTipoProducto)
    );
}

export async function getLookups(db: Db): Promise<LookupsDto> {
  const [marcas, tiposProducto, unidadesMedida] = await Promise.all([
    db
      .select({ id: t20PMarca.idMarca, nombre: t20PMarca.nomMarca })
      .from(t20PMarca)
      .orderBy(asc(t20PMarca.idMarca)),
    db
      .select({
        id: t20PTipoProducto.idTipoProducto,
        nombre: t20PTipoProducto.nomTipoProducto,
      })
      .from(t20PTipoProducto)
      .orderBy(asc(t20PTipoProducto.idTipoProducto)),
    db
      .select({ id: t20PUnidadMedida.idUm, nombre: t20PUnidadMedida.nomUm })
      .from(t20PUnidadMedida)
      .orderBy(asc(t20PUnidadMedida.idUm)),
  ]);
  return { marcas, tiposProducto, unidadesMedida };
}

export async function listProducts(
  db: Db,
  estado: EstadoFilter
): Promise<ProductoDto[]> {
  const query = productQuery(db);
  const filtered =
    estado === "todos"
      ? query
      : query.where(
          eq(
            t20MProducto.idEstado,
            estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO
          )
        );
  return filtered.orderBy(asc(t20MProducto.codSerfel));
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas test`
Expected: PASS.

- [ ] **Step 8: Typecheck and commit**

```bash
pnpm typecheck
git add lambdas/package.json lambdas/products pnpm-lock.yaml
git commit -m "feat(products): service layer with lookups and product listing"
```

---

### Task 4: `products` service — create with uniqueness rules

**Files:**
- Modify: `lambdas/products/service.ts`
- Test: `lambdas/products/tests/service.test.ts` (append)

**Interfaces:**
- Consumes: Task 3 service internals (`productQuery`, `Tx`), `AppError`.
- Produces:
  - `createProduct(db: Db, input: ProductoInput, idUsuario: number): Promise<ProductoDto>` — inserts with defaults (`descProducto: ""`, `codBarraProducto: ""`, `impuesto: 0`, `usaPorciones: 0`, `idEstado: ESTADO_ACTIVO`), throws `AppError("COD_SERFEL_EN_USO", 409, …)` / `AppError("NOMBRE_EN_USO", 409, …)`.
  - Internal `getProductDto(db: DbOrTx, idProducto: number): Promise<ProductoDto>` (throws `PRODUCTO_NO_ENCONTRADO` 404) and `assertUnique(tx, codSerfel, nomProducto, excludeIdProducto: number | null)` — both reused by Task 5.
  - Internal `nowDateTime(): string` — `"YYYY-MM-DD HH:MM:SS"` (UTC).

- [ ] **Step 1: Write the failing tests**

Append to `lambdas/products/tests/service.test.ts` (add `createProduct` to the existing import from `"../service"`):

```ts
describe("createProduct", () => {
  const input = {
    codSerfel: 500,
    nomProducto: "CREADO X",
    idMarca: SEED.marcaSoprole,
    idUm: SEED.umUni,
    idTipoProducto: SEED.tipoYogurt,
  };

  it("creates and returns the joined DTO with a DB-assigned id", async () => {
    const dto = await createProduct(db, input, SEED.idUsuario);
    expect(dto.idProducto).toBeGreaterThan(0);
    expect(dto).toMatchObject({
      codSerfel: 500,
      nomProducto: "CREADO X",
      nomMarca: "SOPROLE",
      nomUm: "UNI",
      nomTipoProducto: "YOGURT",
      idEstado: 1,
    });
  });

  it("rejects a codSerfel used by an active product", async () => {
    await expect(
      createProduct(db, { ...input, nomProducto: "OTRO NOMBRE" }, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "COD_SERFEL_EN_USO", status: 409 });
  });

  it("rejects a nomProducto used by an active product (case-insensitive)", async () => {
    await expect(
      createProduct(db, { ...input, codSerfel: 501, nomProducto: "creado x" }, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "NOMBRE_EN_USO", status: 409 });
  });

  it("allows reusing codSerfel and nombre of an INACTIVE product", async () => {
    await db.insert(t20MProducto).values(
      productRow({ nomProducto: "MUERTO", codSerfel: 600, idEstado: 0 })
    );
    const dto = await createProduct(
      db,
      { ...input, codSerfel: 600, nomProducto: "MUERTO" },
      SEED.idUsuario
    );
    expect(dto.idEstado).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas test`
Expected: FAIL — `createProduct` is not exported.

- [ ] **Step 3: Implement create + shared helpers**

Append to `lambdas/products/service.ts` (add imports: `and, ne, or` from `"drizzle-orm"`, `AppError` from `"./errors"`, `type ProductoInput` from `"@serfel/shared"`):

```ts
function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function getProductDto(
  db: DbOrTx,
  idProducto: number
): Promise<ProductoDto> {
  const rows = await productQuery(db).where(
    eq(t20MProducto.idProducto, idProducto)
  );
  if (rows.length === 0) {
    throw new AppError(
      "PRODUCTO_NO_ENCONTRADO",
      404,
      `Producto ${idProducto} no existe`
    );
  }
  return rows[0];
}

/**
 * Business rule: codSerfel and nomProducto must be unique among ACTIVE
 * products (id_estado = 1). MariaDB's default collation makes the name
 * comparison case-insensitive.
 */
async function assertUnique(
  tx: DbOrTx,
  codSerfel: number,
  nomProducto: string,
  excludeIdProducto: number | null
): Promise<void> {
  const conditions = [
    eq(t20MProducto.idEstado, ESTADO_ACTIVO),
    or(
      eq(t20MProducto.codSerfel, codSerfel),
      eq(t20MProducto.nomProducto, nomProducto)
    ),
  ];
  if (excludeIdProducto !== null) {
    conditions.push(ne(t20MProducto.idProducto, excludeIdProducto));
  }
  const clashes = await (tx as Db)
    .select({
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
    })
    .from(t20MProducto)
    .where(and(...conditions));

  if (clashes.some((c) => c.codSerfel === codSerfel)) {
    throw new AppError(
      "COD_SERFEL_EN_USO",
      409,
      `El código ${codSerfel} ya está en uso por otro producto activo`
    );
  }
  if (clashes.length > 0) {
    throw new AppError(
      "NOMBRE_EN_USO",
      409,
      `El nombre "${nomProducto}" ya está en uso por otro producto activo`
    );
  }
}

export async function createProduct(
  db: Db,
  input: ProductoInput,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    await assertUnique(tx, input.codSerfel, input.nomProducto, null);
    // $returningId() does not work with this schema's table-level PK style —
    // read the DB-assigned id from mysql2's ResultSetHeader.
    const [header] = await tx.insert(t20MProducto).values({
      codSerfel: input.codSerfel,
      nomProducto: input.nomProducto,
      descProducto: "",
      codBarraProducto: "",
      idMarca: input.idMarca,
      idUm: input.idUm,
      idTipoProducto: input.idTipoProducto,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      idEstado: ESTADO_ACTIVO,
      impuesto: 0,
      usaPorciones: 0,
    });
    return getProductDto(tx, header.insertId);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas test`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add lambdas/products
git commit -m "feat(products): createProduct with active-only uniqueness rules"
```

---

### Task 5: `products` service — update, soft delete, restore

**Files:**
- Modify: `lambdas/products/service.ts`
- Test: `lambdas/products/tests/service.test.ts` (append)

**Interfaces:**
- Consumes: Task 4 helpers (`assertUnique`, `getProductDto`, `nowDateTime`).
- Produces:
  - `updateProduct(db: Db, idProducto: number, input: ProductoInput, idUsuario: number): Promise<ProductoDto>` — 404 if missing; uniqueness excludes self.
  - `deactivateProduct(db: Db, idProducto: number, idUsuario: number): Promise<ProductoDto>` — sets `idEstado = 0`; idempotent (already-inactive → returns as-is).
  - `restoreProduct(db: Db, idProducto: number, idUsuario: number): Promise<ProductoDto>` — sets `idEstado = 1` after re-checking uniqueness; idempotent for already-active.

- [ ] **Step 1: Write the failing tests**

Append to `lambdas/products/tests/service.test.ts` (extend the `"../service"` import with `updateProduct, deactivateProduct, restoreProduct`):

```ts
describe("update / deactivate / restore", () => {
  const input = {
    codSerfel: 700,
    nomProducto: "CICLO DE VIDA",
    idMarca: SEED.marcaSoprole,
    idUm: SEED.umUni,
    idTipoProducto: SEED.tipoYogurt,
  };
  let id: number;

  beforeAll(async () => {
    id = (await createProduct(db, input, SEED.idUsuario)).idProducto;
  });

  it("updates fields, keeping its own codSerfel without a false conflict", async () => {
    const dto = await updateProduct(
      db,
      id,
      { ...input, nomProducto: "CICLO RENOMBRADO", idMarca: SEED.marcaNestle },
      SEED.idUsuario
    );
    expect(dto).toMatchObject({
      idProducto: id,
      codSerfel: 700,
      nomProducto: "CICLO RENOMBRADO",
      nomMarca: "NESTLE",
    });
  });

  it("rejects update that takes another active product's codigo", async () => {
    // codSerfel 500 belongs to "CREADO X" from the previous suite
    await expect(
      updateProduct(db, id, { ...input, codSerfel: 500 }, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "COD_SERFEL_EN_USO", status: 409 });
  });

  it("404s for a nonexistent product", async () => {
    await expect(
      updateProduct(db, 999999, input, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "PRODUCTO_NO_ENCONTRADO", status: 404 });
    await expect(deactivateProduct(db, 999999, SEED.idUsuario)).rejects.toMatchObject({
      code: "PRODUCTO_NO_ENCONTRADO",
    });
    await expect(restoreProduct(db, 999999, SEED.idUsuario)).rejects.toMatchObject({
      code: "PRODUCTO_NO_ENCONTRADO",
    });
  });

  it("soft-deletes (idEstado 0) and is idempotent", async () => {
    expect((await deactivateProduct(db, id, SEED.idUsuario)).idEstado).toBe(0);
    expect((await deactivateProduct(db, id, SEED.idUsuario)).idEstado).toBe(0);
    const activos = await listProducts(db, "activos");
    expect(activos.find((p) => p.idProducto === id)).toBeUndefined();
  });

  it("blocks restore when another active product took the codigo meanwhile", async () => {
    await createProduct(
      db,
      { ...input, nomProducto: "USURPADOR" }, // same codSerfel 700, now free
      SEED.idUsuario
    );
    await expect(restoreProduct(db, id, SEED.idUsuario)).rejects.toMatchObject({
      code: "COD_SERFEL_EN_USO",
      status: 409,
    });
  });

  it("restores when there is no conflict", async () => {
    const fresh = await createProduct(
      db,
      { ...input, codSerfel: 800, nomProducto: "RESTAURABLE" },
      SEED.idUsuario
    );
    await deactivateProduct(db, fresh.idProducto, SEED.idUsuario);
    const restored = await restoreProduct(db, fresh.idProducto, SEED.idUsuario);
    expect(restored.idEstado).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas test`
Expected: FAIL — `updateProduct` is not exported.

- [ ] **Step 3: Implement**

Append to `lambdas/products/service.ts`:

```ts
export async function updateProduct(
  db: Db,
  idProducto: number,
  input: ProductoInput,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    await getProductDto(tx, idProducto); // 404 if missing
    await assertUnique(tx, input.codSerfel, input.nomProducto, idProducto);
    await tx
      .update(t20MProducto)
      .set({
        codSerfel: input.codSerfel,
        nomProducto: input.nomProducto,
        idMarca: input.idMarca,
        idUm: input.idUm,
        idTipoProducto: input.idTipoProducto,
        idUsuarioMod: idUsuario,
        ultFechaMod: nowDateTime(),
      })
      .where(eq(t20MProducto.idProducto, idProducto));
    return getProductDto(tx, idProducto);
  });
}

export async function deactivateProduct(
  db: Db,
  idProducto: number,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    const current = await getProductDto(tx, idProducto);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx
      .update(t20MProducto)
      .set({
        idEstado: ESTADO_INACTIVO,
        idUsuarioMod: idUsuario,
        ultFechaMod: nowDateTime(),
      })
      .where(eq(t20MProducto.idProducto, idProducto));
    return getProductDto(tx, idProducto);
  });
}

export async function restoreProduct(
  db: Db,
  idProducto: number,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    const current = await getProductDto(tx, idProducto);
    if (current.idEstado === ESTADO_ACTIVO) return current;
    await assertUnique(tx, current.codSerfel, current.nomProducto, idProducto);
    await tx
      .update(t20MProducto)
      .set({
        idEstado: ESTADO_ACTIVO,
        idUsuarioMod: idUsuario,
        ultFechaMod: nowDateTime(),
      })
      .where(eq(t20MProducto.idProducto, idProducto));
    return getProductDto(tx, idProducto);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas test`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add lambdas/products
git commit -m "feat(products): update, soft delete and restore with rule re-checks"
```

---

### Task 6: `products` Hono app — routes, validation, error mapping, claims

**Files:**
- Create: `lambdas/products/app.ts`
- Test: `lambdas/products/tests/app.test.ts`

**Interfaces:**
- Consumes: all Task 3–5 service functions; `AppError`, `isDbUnreachable`; `EstadoFilterSchema`, `ProductoInputSchema` from `@serfel/shared`.
- Produces:
  - `interface AppDeps { getDb: () => Promise<Db>; getIdUsuario: (c: Context) => number | null }`
  - `createApp(deps: AppDeps): Hono` — base path `/api`, routes: `GET /lookups`, `GET /products`, `POST /products` (201), `PUT /products/:id`, `DELETE /products/:id`, `POST /products/:id/restore`. Error body is always `ApiErrorBody`.

- [ ] **Step 1: Write the failing tests**

Create `lambdas/products/tests/app.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { createApp } from "../app";

let db: Db;
let teardown: () => Promise<void>;
let currentUser: number | null = SEED.idUsuario;

const appPromise = (async () => {
  ({ db, teardown } = await setupTestDb("serfel_products_app"));
  return createApp({
    getDb: async () => db,
    getIdUsuario: () => currentUser,
  });
})();

afterAll(async () => {
  await teardown();
});

const validBody = {
  codSerfel: 900,
  nomProducto: "APP TEST",
  idMarca: SEED.marcaSoprole,
  idUm: SEED.umUni,
  idTipoProducto: SEED.tipoYogurt,
};

function json(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("products app", () => {
  it("403s when there is no id_usuario claim", async () => {
    const app = await appPromise;
    currentUser = null;
    const res = await app.request("/api/products");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
    currentUser = SEED.idUsuario;
  });

  it("GET /api/lookups returns the three lists", async () => {
    const app = await appPromise;
    const res = await app.request("/api/lookups");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.marcas.length).toBeGreaterThan(0);
    expect(body.tiposProducto.length).toBeGreaterThan(0);
    expect(body.unidadesMedida.length).toBeGreaterThan(0);
  });

  it("POST /api/products creates (201) and GET lists it", async () => {
    const app = await appPromise;
    const created = await app.request("/api/products", json(validBody));
    expect(created.status).toBe(201);
    const dto = await created.json();
    expect(dto.codSerfel).toBe(900);

    const list = await app.request("/api/products?estado=activos");
    expect(list.status).toBe(200);
    expect((await list.json()).some((p: { codSerfel: number }) => p.codSerfel === 900)).toBe(true);
  });

  it("400s on invalid body and invalid estado", async () => {
    const app = await appPromise;
    const bad = await app.request("/api/products", json({ ...validBody, codSerfel: -1 }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("VALIDACION");

    const badEstado = await app.request("/api/products?estado=zzz");
    expect(badEstado.status).toBe(400);
  });

  it("409s with the machine-readable code on duplicate codigo", async () => {
    const app = await appPromise;
    const dup = await app.request(
      "/api/products",
      json({ ...validBody, nomProducto: "OTRO" })
    );
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("COD_SERFEL_EN_USO");
  });

  it("PUT / DELETE / restore round-trip", async () => {
    const app = await appPromise;
    const created = await app.request(
      "/api/products",
      json({ ...validBody, codSerfel: 901, nomProducto: "ROUNDTRIP" })
    );
    const { idProducto } = await created.json();

    const put = await app.request(`/api/products/${idProducto}`, {
      ...json({ ...validBody, codSerfel: 901, nomProducto: "ROUNDTRIP 2" }),
      method: "PUT",
    });
    expect(put.status).toBe(200);
    expect((await put.json()).nomProducto).toBe("ROUNDTRIP 2");

    const del = await app.request(`/api/products/${idProducto}`, { method: "DELETE" });
    expect(del.status).toBe(200);
    expect((await del.json()).idEstado).toBe(0);

    const restore = await app.request(`/api/products/${idProducto}/restore`, {
      method: "POST",
    });
    expect(restore.status).toBe(200);
    expect((await restore.json()).idEstado).toBe(1);
  });

  it("404s on unknown ids and 400s on non-numeric ids", async () => {
    const app = await appPromise;
    const notFound = await app.request("/api/products/999999", { method: "DELETE" });
    expect(notFound.status).toBe(404);
    const badId = await app.request("/api/products/abc", { method: "DELETE" });
    expect(badId.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas test`
Expected: FAIL — `../app` does not exist.

- [ ] **Step 3: Implement the app**

Create `lambdas/products/app.ts`:

```ts
import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema,
  ProductoInputSchema,
  type ApiErrorBody,
} from "@serfel/shared";
import type { Db } from "@serfel/db";
import { AppError, isDbUnreachable } from "./errors";
import {
  createProduct,
  deactivateProduct,
  getLookups,
  listProducts,
  restoreProduct,
  updateProduct,
} from "./service";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
}

type Env = { Variables: { idUsuario: number } };

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDACION", 400, "id de producto inválido");
  }
  return id;
}

async function parseInput(c: Context) {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = ProductoInputSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<Env>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (isDbUnreachable(err)) {
      return c.json(
        errorBody(
          "DB_NO_DISPONIBLE",
          "La base de datos no está disponible en este momento. Intenta más tarde."
        ),
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

  app.get("/lookups", async (c) => c.json(await getLookups(await deps.getDb())));

  app.get("/products", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    }
    return c.json(await listProducts(await deps.getDb(), parsed.data));
  });

  app.post("/products", async (c) => {
    const input = await parseInput(c);
    const dto = await createProduct(await deps.getDb(), input, c.get("idUsuario"));
    return c.json(dto, 201);
  });

  app.put("/products/:id", async (c) => {
    const id = parseId(c);
    const input = await parseInput(c);
    return c.json(await updateProduct(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.delete("/products/:id", async (c) => {
    const id = parseId(c);
    return c.json(await deactivateProduct(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.post("/products/:id/restore", async (c) => {
    const id = parseId(c);
    return c.json(await restoreProduct(await deps.getDb(), id, c.get("idUsuario")));
  });

  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas test`
Expected: PASS (all suites).

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add lambdas/products
git commit -m "feat(products): Hono app with validation, error mapping and user claim gate"
```

---

### Task 7: Lambda entry, Cognito + HTTP API infra, deploy, seed user

**Files:**
- Create: `lambdas/products/index.ts`
- Create: `infra/auth.ts`
- Create: `infra/api.ts`
- Modify: `sst.config.ts`
- Create: `scripts/cognito-create-user.sh`

**Interfaces:**
- Consumes: `createApp` (Task 6), `createDb`/`Db` (Task 2), existing `infra/vpc.ts` exports (`privateSubnetIds`, `sgLambdaId`) and `infra/database.ts` (`dbSecretArn`).
- Produces:
  - Deployed `serfel-dev-products` Lambda, `serfel-dev-api` HTTP API (JWT authorizer on `ANY /api/{proxy+}`), `serfel-dev-users` user pool + `serfel-dev-web` client.
  - `infra/auth.ts` exports: `userPoolId`, `userPoolClientId`, `userPoolEndpoint`.
  - `infra/api.ts` exports: `apiUrl` (consumed by Task 13 StaticSite).
  - `scripts/cognito-create-user.sh <email> <id_usuario>` — admin user creation with the custom attribute.

- [ ] **Step 1: Lambda entry point**

Create `lambdas/products/index.ts`:

```ts
import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import { createApp } from "./app";

const sm = new SecretsManagerClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  if (!secret.SecretString) {
    throw new Error("DB secret has no SecretString");
  }
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, {
    ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") },
  }).db;
  return cachedDb;
}

interface JwtEnv {
  event?: {
    requestContext?: {
      authorizer?: { jwt?: { claims?: Record<string, unknown> } };
    };
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

- [ ] **Step 2: Cognito infra**

Create `infra/auth.ts`:

```ts
import * as aws from "@pulumi/aws";

const userPool = new aws.cognito.UserPool("user-pool", {
  name: "serfel-dev-users",
  usernameAttributes: ["email"],
  autoVerifiedAttributes: ["email"],
  adminCreateUserConfig: { allowAdminCreateUserOnly: true }, // no self-registration
  passwordPolicy: {
    minimumLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
  schemas: [
    {
      // maps the Cognito user to legacy 10_m_usuario.id_usuario;
      // surfaces in ID tokens as the "custom:id_usuario" claim
      name: "id_usuario",
      attributeDataType: "Number",
      mutable: true,
      numberAttributeConstraints: { minValue: "1", maxValue: "100000000" },
    },
  ],
  tags: { Name: "serfel-dev-users" },
});

const userPoolClient = new aws.cognito.UserPoolClient("user-pool-client", {
  name: "serfel-dev-web",
  userPoolId: userPool.id,
  explicitAuthFlows: [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH", // used by scripts/api-smoke.sh only
  ],
  preventUserExistenceErrors: "ENABLED",
  accessTokenValidity: 1,
  idTokenValidity: 1,
  refreshTokenValidity: 30,
  tokenValidityUnits: {
    accessToken: "hours",
    idToken: "hours",
    refreshToken: "days",
  },
  readAttributes: ["email", "email_verified", "custom:id_usuario"],
  writeAttributes: ["email"],
});

export const userPoolId = userPool.id;
export const userPoolClientId = userPoolClient.id;
/** e.g. cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXX */
export const userPoolEndpoint = userPool.endpoint;
```

- [ ] **Step 3: HTTP API infra**

Create `infra/api.ts`:

```ts
import { privateSubnetIds, sgLambdaId } from "./vpc";
import { dbSecretArn } from "./database";
import { userPoolClientId, userPoolEndpoint } from "./auth";

const productsFn = new sst.aws.Function("ProductsFn", {
  handler: "lambdas/products/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
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
    function: { name: "serfel-dev-products" },
  },
});

const api = new sst.aws.ApiGatewayV2("Api", {
  // dev-only wildcard CORS (JWT still required); tighten in Fase 5
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["*"],
    allowHeaders: ["authorization", "content-type"],
  },
  transform: { api: { name: "serfel-dev-api" } },
});

const jwtAuthorizer = api.addAuthorizer({
  name: "cognito-jwt",
  jwt: {
    issuer: $interpolate`https://${userPoolEndpoint}`,
    audiences: [userPoolClientId],
  },
});

api.route("ANY /api/{proxy+}", productsFn.arn, {
  auth: { jwt: { authorizer: jwtAuthorizer.id } },
});

export const apiUrl = api.url;
```

- [ ] **Step 4: Register the new infra modules**

In `sst.config.ts`, extend `run()`:

```ts
  async run() {
    await import("./infra/oidc");
    await import("./infra/vpc");
    await import("./infra/database");
    await import("./infra/bastion");
    await import("./infra/migrate");
    await import("./infra/db-guard");
    await import("./infra/auth");
    await import("./infra/api");
  },
```

- [ ] **Step 5: User creation script**

Create `scripts/cognito-create-user.sh` (then `chmod +x scripts/cognito-create-user.sh`):

```bash
#!/usr/bin/env bash
# Creates a Cognito user mapped to a legacy 10_m_usuario row.
# Usage: ./scripts/cognito-create-user.sh <email> <id_usuario>
# Respects the caller's AWS_PROFILE (same convention as the other scripts).
set -euo pipefail

EMAIL="${1:?usage: cognito-create-user.sh <email> <id_usuario>}"
ID_USUARIO="${2:?usage: cognito-create-user.sh <email> <id_usuario>}"
REGION="us-east-1"

POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" \
  --query "UserPools[?Name=='serfel-dev-users'].Id | [0]" --output text)

if [ "$POOL_ID" = "None" ] || [ -z "$POOL_ID" ]; then
  echo "user pool serfel-dev-users not found" >&2
  exit 1
fi

aws cognito-idp admin-create-user \
  --region "$REGION" \
  --user-pool-id "$POOL_ID" \
  --username "$EMAIL" \
  --user-attributes \
    Name=email,Value="$EMAIL" \
    Name=email_verified,Value=true \
    Name=custom:id_usuario,Value="$ID_USUARIO"

echo "User $EMAIL created (temporary password emailed). id_usuario=$ID_USUARIO"
```

- [ ] **Step 6: Typecheck, deploy, and commit**

```bash
pnpm typecheck
AWS_PROFILE=admin-christian npx sst deploy --stage dev
```

Expected: deploy succeeds; outputs include the API URL.

```bash
git add lambdas/products/index.ts infra/auth.ts infra/api.ts sst.config.ts scripts/cognito-create-user.sh
git commit -m "feat(infra): cognito user pool, HTTP API with JWT authorizer, products lambda"
```

- [ ] **Step 7: Verify the authorizer rejects anonymous calls**

```bash
API_URL=$(aws apigatewayv2 get-apis --profile admin-christian --region us-east-1 \
  --query "Items[?Name=='serfel-dev-api'].ApiEndpoint | [0]" --output text)
curl -s -o /dev/null -w "%{http_code}\n" "$API_URL/api/products"
```

Expected: `401`.

- [ ] **Step 8: Seed the real user**

Find Christian's legacy row (never print the password column):

```bash
grep -A5 'INSERT INTO `10_m_usuario`' packages/db/dump/legacy-data.sql | head -20
```

Identify his `id_usuario` from the first tuple column (ask the user if ambiguous), then:

```bash
AWS_PROFILE=admin-christian ./scripts/cognito-create-user.sh fracktured@gmail.com <id_usuario>
```

Expected: user created; temporary password emailed to that address.

- [ ] **Step 9: End-to-end API check against the real DB**

This needs the dev DB running and migration 0001 applied:

```bash
AWS_PROFILE=admin-christian pnpm db:start          # wait until available
AWS_PROFILE=admin-christian pnpm db:migrate        # applies 0001 (fast ALTER)
```

Get a token and call the API (first login must set a permanent password; do it once via the CLI):

```bash
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --profile admin-christian --region us-east-1 \
  --query "UserPools[?Name=='serfel-dev-users'].Id | [0]" --output text)
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --profile admin-christian --region us-east-1 \
  --query "UserPoolClients[?ClientName=='serfel-dev-web'].ClientId | [0]" --output text)
# set a permanent password (PoC convenience; the web login flow also supports the challenge)
aws cognito-idp admin-set-user-password --profile admin-christian --region us-east-1 \
  --user-pool-id "$POOL_ID" --username fracktured@gmail.com \
  --password '<choose-a-strong-password>' --permanent
TOKEN=$(aws cognito-idp admin-initiate-auth --profile admin-christian --region us-east-1 \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=fracktured@gmail.com,PASSWORD='<the-password>' \
  --query 'AuthenticationResult.IdToken' --output text)
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/products?estado=activos" | head -c 400; echo
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/lookups" | head -c 400; echo
```

Expected: JSON arrays with real catalog data (~2,750 products for `todos`).

```bash
AWS_PROFILE=admin-christian pnpm db:stop
```

---

### Task 8: Angular scaffold, environment generation, global styles

**Files:**
- Delete: `apps/frontend/package.json`, `apps/frontend/sst-env.d.ts` (stubs)
- Create (scaffolded): `apps/frontend/**` (Angular 20 app)
- Create: `apps/frontend/scripts/gen-env.mjs`
- Create: `apps/frontend/src/environments/environment.gen.ts`, `apps/frontend/src/environments/environment.ts`
- Modify: `apps/frontend/package.json`, `apps/frontend/tsconfig.json`, `apps/frontend/src/styles.scss`, `apps/frontend/src/index.html`
- Modify: `tsconfig.json` (root — exclude `apps`)
- Create: `apps/frontend/vitest.config.ts`

**Interfaces:**
- Consumes: `@serfel/shared` types (via tsconfig path).
- Produces:
  - `environment` object: `{ apiUrl: string; userPoolId: string; userPoolClientId: string }` imported as `import { environment } from "../environments/environment"` (path relative to consumer).
  - Build contract used by Task 13: `pnpm run build` inside `apps/frontend` regenerates env from `APP_API_URL`, `APP_USER_POOL_ID`, `APP_USER_POOL_CLIENT_ID` and outputs to `dist/frontend/browser`.
  - Global CSS classes from the prototype available to all components (`.hero`, `.stat-card`, `.filter-dropdowns`, `.table-wrap`, `.modal-bg`, `.toast`, etc.).

- [ ] **Step 1: Scaffold**

```bash
rm apps/frontend/package.json apps/frontend/sst-env.d.ts
npx -y @angular/cli@20 new frontend --directory apps/frontend \
  --style=scss --ssr=false --skip-tests --skip-git --skip-install --defaults
```

- [ ] **Step 2: Package config**

Edit `apps/frontend/package.json`: set `"name": "@serfel/frontend"`, and replace the `scripts` block and add deps:

```json
  "scripts": {
    "gen-env": "node scripts/gen-env.mjs",
    "start": "node scripts/gen-env.mjs && ng serve",
    "build": "node scripts/gen-env.mjs && ng build",
    "test": "vitest run"
  },
```

Add to `"dependencies"`: `"aws-amplify": "^6.6.0"`, `"@serfel/shared": "workspace:*"`.
Add to `"devDependencies"`: `"vitest": "^3.0.0"`.

Run: `pnpm install` (from repo root).

- [ ] **Step 3: Environment generation**

Create `apps/frontend/scripts/gen-env.mjs`:

```js
// Generates src/environments/environment.gen.ts from env vars.
// SST StaticSite injects APP_* during `pnpm run build`; locally, export them
// or accept the localhost defaults.
import { writeFileSync } from "node:fs";

const cfg = {
  apiUrl: process.env.APP_API_URL ?? "http://localhost:3001",
  userPoolId: process.env.APP_USER_POOL_ID ?? "local-pool",
  userPoolClientId: process.env.APP_USER_POOL_CLIENT_ID ?? "local-client",
};

writeFileSync(
  new URL("../src/environments/environment.gen.ts", import.meta.url),
  `// GENERATED by scripts/gen-env.mjs — do not edit; do not commit real values.\n` +
    `export const environment = ${JSON.stringify(cfg, null, 2)} as const;\n`
);
console.log("environment.gen.ts written:", cfg);
```

Create `apps/frontend/src/environments/environment.gen.ts` (committed default):

```ts
// GENERATED by scripts/gen-env.mjs — do not edit; do not commit real values.
export const environment = {
  apiUrl: "http://localhost:3001",
  userPoolId: "local-pool",
  userPoolClientId: "local-client",
} as const;
```

Create `apps/frontend/src/environments/environment.ts`:

```ts
export { environment } from "./environment.gen";
```

- [ ] **Step 4: Wire `@serfel/shared` and vitest**

In `apps/frontend/tsconfig.json`, inside `compilerOptions`, add:

```json
    "baseUrl": "./",
    "paths": {
      "@serfel/shared": ["../../packages/shared/src/index.ts"]
    }
```

Create `apps/frontend/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@serfel/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url)
      ),
    },
  },
});
```

In the root `tsconfig.json`, change the exclude line so root `pnpm typecheck` doesn't sweep the Angular app (it has its own compiler):

```json
  "exclude": ["node_modules", ".sst", "dist", "apps"]
```

- [ ] **Step 5: Global styles from the approved prototype**

In `apps/frontend/src/index.html`, set the title to `Serfel — Productos` and add inside `<head>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Replace `apps/frontend/src/styles.scss` with the **entire CSS** from the `<style>` block of `AWS/prototipes/prototype-3-bold-vibrant-table.html` (lines 10–394 of that file), with exactly these adaptations:

1. Prepend the reset + tokens as-is (`*, *::before, *::after { box-sizing... }`, `:root { --grad-start... }`, `body { font-family: 'Plus Jakarta Sans'... }`).
2. Remove the `.modal-bg { display: none; ... }` / `.modal-bg.open { display: flex; }` pair — replace with `.modal-bg { display: flex; position: fixed; inset: 0; background: rgba(15,23,42,.4); backdrop-filter: blur(4px); z-index: 200; align-items: center; justify-content: center; }` (Angular `@if` controls its presence).
3. Remove `.empty-state { ... display: none; }`'s `display: none` (Angular `@if` controls it).
4. Keep `.toast` / `.toast.show` as-is (the toast component toggles the class).
5. Everything else verbatim — header, hero, stats, filter card, pills, table, badges, pagination, modal, media query.

Add at the end (login page, same visual language):

```scss
/* ── Login ── */
.login-wrap {
  min-height: 100vh;
  background: var(--grad);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.login-card {
  background: var(--surface);
  border-radius: 20px;
  padding: 36px;
  width: 400px;
  max-width: 95vw;
  box-shadow: 0 24px 80px rgba(0,0,0,.25);
}
.login-card h1 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 4px;
}
.login-card .login-sub {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 24px;
}
.login-card .form-field { margin-bottom: 14px; }
.login-error {
  background: #fef2f2;
  color: var(--red);
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
.btn-block { width: 100%; justify-content: center; display: flex; }
```

- [ ] **Step 6: Verify the build and commit**

```bash
pnpm --filter @serfel/frontend build
```

Expected: build succeeds, output in `apps/frontend/dist/frontend/browser`.

```bash
git add apps/frontend tsconfig.json pnpm-lock.yaml
git commit -m "feat(frontend): Angular 20 scaffold, env generation, prototype design system"
```

---

### Task 9: Frontend auth — Amplify config, AuthService, login page, guard, interceptor

**Files:**
- Modify: `apps/frontend/src/main.ts`
- Modify: `apps/frontend/src/app/app.config.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`
- Modify: `apps/frontend/src/app/app.ts` (root component — render `<router-outlet/>` only)
- Create: `apps/frontend/src/app/core/auth.service.ts`
- Create: `apps/frontend/src/app/core/auth.guard.ts`
- Create: `apps/frontend/src/app/core/auth.interceptor.ts`
- Create: `apps/frontend/src/app/features/login/login.component.ts`

**Interfaces:**
- Consumes: `environment` (Task 8), global CSS classes.
- Produces:
  - `AuthService.login(email, password): Promise<"done" | "new-password">`
  - `AuthService.completeNewPassword(newPassword): Promise<void>`
  - `AuthService.logout(): Promise<void>`, `AuthService.getIdToken(): Promise<string | null>`
  - `authGuard: CanActivateFn`, `authInterceptor: HttpInterceptorFn`
  - Routes: `/login` → LoginComponent; `''` → redirect `productos` (the `productos` route itself lands in Task 11).

- [ ] **Step 1: Configure Amplify at bootstrap**

Replace the content of `apps/frontend/src/main.ts` with:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { Amplify } from 'aws-amplify';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: environment.userPoolId,
      userPoolClientId: environment.userPoolClientId,
    },
  },
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
```

(If the scaffold named the root component/file differently — e.g. `app.component.ts` exporting `AppComponent` — keep the scaffold's names and adjust the import here; do not rename scaffold files.)

- [ ] **Step 2: AuthService**

Create `apps/frontend/src/app/core/auth.service.ts`:

```ts
import { Injectable } from '@angular/core';
import {
  signIn,
  confirmSignIn,
  signOut,
  fetchAuthSession,
} from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(email: string, password: string): Promise<'done' | 'new-password'> {
    const { nextStep } = await signIn({ username: email, password });
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return 'new-password';
    }
    return 'done';
  }

  async completeNewPassword(newPassword: string): Promise<void> {
    await confirmSignIn({ challengeResponse: newPassword });
  }

  async logout(): Promise<void> {
    await signOut();
  }

  /** Returns the Cognito ID token (carries custom:id_usuario), or null. */
  async getIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 3: Guard and interceptor**

Create `apps/frontend/src/app/core/auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .getIdToken()
    .then((token) => (token ? true : router.createUrlTree(['/login'])));
};
```

Create `apps/frontend/src/app/core/auth.interceptor.ts`:

```ts
import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  return from(auth.getIdToken()).pipe(
    switchMap((token) =>
      next(
        token
          ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
          : req
      )
    ),
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        void router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
```

In `apps/frontend/src/app/app.config.ts`, register HttpClient with the interceptor (keep whatever providers the scaffold already has and add):

```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth.interceptor';
// inside providers array:
    provideHttpClient(withInterceptors([authInterceptor])),
```

- [ ] **Step 4: Login page**

Create `apps/frontend/src/app/features/login/login.component.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <h1>Serfel</h1>
        <p class="login-sub">Ingresa a tu cuenta para continuar</p>

        @if (error()) {
          <div class="login-error">{{ error() }}</div>
        }

        @if (!needsNewPassword()) {
          <form (ngSubmit)="onLogin()">
            <div class="form-field">
              <label for="email">Email</label>
              <input id="email" type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
            </div>
            <div class="form-field">
              <label for="password">Contraseña</label>
              <input id="password" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
            </div>
            <button class="btn-save btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Ingresando…' : 'Ingresar' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="onNewPassword()">
            <p class="login-sub">Debes definir una contraseña nueva.</p>
            <div class="form-field">
              <label for="newPassword">Nueva contraseña</label>
              <input id="newPassword" type="password" name="newPassword" [(ngModel)]="newPassword" required autocomplete="new-password" />
            </div>
            <button class="btn-save btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Guardando…' : 'Guardar y entrar' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  newPassword = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly needsNewPassword = signal(false);

  async onLogin(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.auth.login(this.email, this.password);
      if (result === 'new-password') {
        this.needsNewPassword.set(true);
      } else {
        await this.router.navigate(['/productos']);
      }
    } catch {
      this.error.set('Email o contraseña incorrectos.');
    } finally {
      this.busy.set(false);
    }
  }

  async onNewPassword(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.completeNewPassword(this.newPassword);
      await this.router.navigate(['/productos']);
    } catch {
      this.error.set('La contraseña no cumple la política (mínimo 12, mayúsculas, minúsculas y números).');
    } finally {
      this.busy.set(false);
    }
  }
}
```

- [ ] **Step 5: Routes and root component**

Replace `apps/frontend/src/app/app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  // 'productos' route is added in the productos feature task
  { path: '**', redirectTo: 'productos' },
];
```

Reduce the root component template (file scaffolded as `apps/frontend/src/app/app.ts` or `app.component.ts`) to just:

```html
<router-outlet />
```

(remove the scaffold placeholder markup; keep `RouterOutlet` in the component's `imports`).

- [ ] **Step 6: Verify build and commit**

```bash
pnpm --filter @serfel/frontend build
```

Expected: build succeeds. (The `productos` redirect 404s until Task 11 — acceptable.)

```bash
git add apps/frontend
git commit -m "feat(frontend): cognito login flow, auth guard and token interceptor"
```

---

### Task 10: Productos data layer — pure logic (TDD), API service, signals store

**Files:**
- Create: `apps/frontend/src/app/features/productos/productos-logic.ts`
- Create: `apps/frontend/src/app/features/productos/productos-api.service.ts`
- Create: `apps/frontend/src/app/features/productos/productos-store.ts`
- Test: `apps/frontend/src/app/features/productos/productos-logic.spec.ts`

**Interfaces:**
- Consumes: `ProductoDto`, `LookupsDto`, `ProductoInput`, `EstadoFilter`, `ESTADO_ACTIVO` from `@serfel/shared`; `environment`; `HttpClient`.
- Produces:
  - `interface Filters { codigo: string; nombre: string; idMarca: number | null; quick: string }`
  - `type SortKey = "codSerfel" | "nomProducto" | "nomMarca" | "nomUm" | "nomTipoProducto"`; `interface Sort { key: SortKey; asc: boolean }`
  - Pure: `applyFilters(rows, f)`, `sortRows(rows, s)`, `paginate(rows, page, perPage)` → `{ slice, totalPages, page, from, to }`, `toCsv(rows)` (`;`-separated, CRLF, quoted), `computeStats(all, filtered)` → `{ total, marcas, tipos, filtrados: number | null }`, `brandBadgeStyle(idMarca)` → `{ background, color }`.
  - `ProductosApi` (injectable): `list(estado)`, `lookups()`, `create(input)`, `update(id, input)`, `deactivate(id)`, `restore(id)` — all returning rxjs Observables of the DTO types.
  - `ProductosStore` (injectable): signals `productos`, `lookups`, `loading`, `errorMsg`, `estadoFilter`, `filters`, `sort`, `page`, `perPage`; computed `filtered`, `paged`, `stats`; methods `load()`, `setEstado(e)`, `setFilter(patch)`, `clearFilters()`, `toggleSort(key)`, `create(input)`, `update(id, input)`, `deactivate(id)`, `restore(id)`.

- [ ] **Step 1: Write the failing tests for the pure logic**

Create `apps/frontend/src/app/features/productos/productos-logic.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { ProductoDto } from "@serfel/shared";
import {
  applyFilters,
  sortRows,
  paginate,
  toCsv,
  computeStats,
} from "./productos-logic";

function p(over: Partial<ProductoDto>): ProductoDto {
  return {
    idProducto: 1, codSerfel: 100, nomProducto: "YOGURT X", idMarca: 1,
    nomMarca: "SOPROLE", idUm: 1, nomUm: "UNI", idTipoProducto: 1,
    nomTipoProducto: "YOGURT", idEstado: 1, ...over,
  };
}

const rows = [
  p({ idProducto: 1, codSerfel: 311, nomProducto: "YOG.BATIDO", idMarca: 1, nomMarca: "SOPROLE" }),
  p({ idProducto: 2, codSerfel: 422, nomProducto: "LECHE ENTERA", idMarca: 3, nomMarca: "COLUN" }),
  p({ idProducto: 3, codSerfel: 610, nomProducto: "NESQUIK", idMarca: 2, nomMarca: "NESTLE" }),
];

describe("applyFilters", () => {
  const none = { codigo: "", nombre: "", idMarca: null, quick: "" };
  it("passes everything with empty filters", () => {
    expect(applyFilters(rows, none)).toHaveLength(3);
  });
  it("filters by codigo substring, nombre and marca", () => {
    expect(applyFilters(rows, { ...none, codigo: "31" })).toHaveLength(1);
    expect(applyFilters(rows, { ...none, nombre: "leche" })).toHaveLength(1);
    expect(applyFilters(rows, { ...none, idMarca: 2 })).toHaveLength(1);
  });
  it("quick search matches nombre, codigo or marca", () => {
    expect(applyFilters(rows, { ...none, quick: "colun" })).toHaveLength(1);
    expect(applyFilters(rows, { ...none, quick: "610" })).toHaveLength(1);
  });
});

describe("sortRows", () => {
  it("sorts numerically by codSerfel and alphabetically by name", () => {
    expect(sortRows(rows, { key: "codSerfel", asc: false })[0].codSerfel).toBe(610);
    expect(sortRows(rows, { key: "nomProducto", asc: true })[0].nomProducto).toBe("LECHE ENTERA");
  });
  it("does not mutate the input", () => {
    const before = rows.map((r) => r.idProducto);
    sortRows(rows, { key: "codSerfel", asc: false });
    expect(rows.map((r) => r.idProducto)).toEqual(before);
  });
});

describe("paginate", () => {
  const many = Array.from({ length: 23 }, (_, i) => i + 1);
  it("slices pages and reports ranges", () => {
    expect(paginate(many, 1, 10)).toMatchObject({ totalPages: 3, from: 1, to: 10 });
    expect(paginate(many, 3, 10).slice).toEqual([21, 22, 23]);
  });
  it("clamps out-of-range pages and handles empty", () => {
    expect(paginate(many, 99, 10).page).toBe(3);
    expect(paginate([], 1, 10)).toMatchObject({ totalPages: 1, from: 0, to: 0, slice: [] });
  });
});

describe("toCsv", () => {
  it("emits semicolon-separated quoted CSV with header", () => {
    const csv = toCsv([p({ nomProducto: 'CON "COMILLAS"' })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Nº";"Nombre";"Marca";"UM";"Tipo";"Estado"');
    expect(lines[1]).toContain('"CON ""COMILLAS"""');
    expect(lines[1]).toContain('"Activo"');
  });
});

describe("computeStats", () => {
  it("counts totals and distincts; filtrados null when nothing filtered", () => {
    expect(computeStats(rows, rows)).toEqual({ total: 3, marcas: 3, tipos: 1, filtrados: null });
    expect(computeStats(rows, rows.slice(0, 1)).filtrados).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend test`
Expected: FAIL — `./productos-logic` does not exist.

- [ ] **Step 3: Implement the pure logic**

Create `apps/frontend/src/app/features/productos/productos-logic.ts`:

```ts
import { ESTADO_ACTIVO, type ProductoDto } from "@serfel/shared";

export interface Filters {
  codigo: string;
  nombre: string;
  idMarca: number | null;
  quick: string;
}

export type SortKey =
  | "codSerfel"
  | "nomProducto"
  | "nomMarca"
  | "nomUm"
  | "nomTipoProducto";

export interface Sort {
  key: SortKey;
  asc: boolean;
}

export function applyFilters(rows: ProductoDto[], f: Filters): ProductoDto[] {
  const codigo = f.codigo.trim();
  const nombre = f.nombre.trim().toLowerCase();
  const quick = f.quick.trim().toLowerCase();
  return rows.filter((p) => {
    if (codigo && !String(p.codSerfel).includes(codigo)) return false;
    if (nombre && !p.nomProducto.toLowerCase().includes(nombre)) return false;
    if (f.idMarca !== null && p.idMarca !== f.idMarca) return false;
    if (
      quick &&
      !p.nomProducto.toLowerCase().includes(quick) &&
      !String(p.codSerfel).includes(quick) &&
      !p.nomMarca.toLowerCase().includes(quick)
    ) {
      return false;
    }
    return true;
  });
}

export function sortRows(rows: ProductoDto[], s: Sort): ProductoDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key];
    const vb = b[s.key];
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
    return s.asc ? cmp : -cmp;
  });
}

export function paginate<T>(
  rows: T[],
  page: number,
  perPage: number
): { slice: T[]; totalPages: number; page: number; from: number; to: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = rows.length === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, rows.length);
  return {
    slice: rows.slice((current - 1) * perPage, current * perPage),
    totalPages,
    page: current,
    from,
    to,
  };
}

export function toCsv(rows: ProductoDto[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Nº", "Nombre", "Marca", "UM", "Tipo", "Estado"].map(esc).join(";");
  const lines = rows.map((r) =>
    [
      r.codSerfel,
      r.nomProducto,
      r.nomMarca,
      r.nomUm,
      r.nomTipoProducto,
      r.idEstado === ESTADO_ACTIVO ? "Activo" : "Inactivo",
    ]
      .map(esc)
      .join(";")
  );
  return [header, ...lines].join("\r\n");
}

export function computeStats(
  all: ProductoDto[],
  filtered: ProductoDto[]
): { total: number; marcas: number; tipos: number; filtrados: number | null } {
  return {
    total: all.length,
    marcas: new Set(all.map((p) => p.idMarca)).size,
    tipos: new Set(all.map((p) => p.idTipoProducto)).size,
    filtrados: filtered.length === all.length ? null : filtered.length,
  };
}

const BADGE_PALETTE: ReadonlyArray<{ background: string; color: string }> = [
  { background: "#fef3c7", color: "#92400e" },
  { background: "#dcfce7", color: "#14532d" },
  { background: "#dbeafe", color: "#1e3a8a" },
  { background: "#fce7f3", color: "#831843" },
  { background: "#ede9fe", color: "#5b21b6" },
  { background: "#ffedd5", color: "#9a3412" },
];

export function brandBadgeStyle(idMarca: number): {
  background: string;
  color: string;
} {
  return BADGE_PALETTE[idMarca % BADGE_PALETTE.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend test`
Expected: PASS.

- [ ] **Step 5: API service and store**

Create `apps/frontend/src/app/features/productos/productos-api.service.ts`:

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter,
  LookupsDto,
  ProductoDto,
  ProductoInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ProductosApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<ProductoDto[]>(`${this.base}/products`, {
      params: { estado },
    });
  }
  lookups() {
    return this.http.get<LookupsDto>(`${this.base}/lookups`);
  }
  create(input: ProductoInput) {
    return this.http.post<ProductoDto>(`${this.base}/products`, input);
  }
  update(id: number, input: ProductoInput) {
    return this.http.put<ProductoDto>(`${this.base}/products/${id}`, input);
  }
  deactivate(id: number) {
    return this.http.delete<ProductoDto>(`${this.base}/products/${id}`);
  }
  restore(id: number) {
    return this.http.post<ProductoDto>(`${this.base}/products/${id}/restore`, {});
  }
}
```

Create `apps/frontend/src/app/features/productos/productos-store.ts`:

```ts
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody,
  EstadoFilter,
  LookupsDto,
  ProductoDto,
  ProductoInput,
} from "@serfel/shared";
import { ProductosApi } from "./productos-api.service";
import {
  applyFilters,
  computeStats,
  paginate,
  sortRows,
  type Filters,
  type Sort,
  type SortKey,
} from "./productos-logic";

const EMPTY_FILTERS: Filters = { codigo: "", nombre: "", idMarca: null, quick: "" };

/** Extracts the structured API error body, or null for network/unknown errors. */
export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class ProductosStore {
  private api = inject(ProductosApi);

  readonly productos = signal<ProductoDto[]>([]);
  readonly lookups = signal<LookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "codSerfel", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() =>
    sortRows(applyFilters(this.productos(), this.filters()), this.sort())
  );
  readonly paged = computed(() =>
    paginate(this.filtered(), this.page(), this.perPage())
  );
  readonly stats = computed(() =>
    computeStats(this.productos(), this.filtered())
  );

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [productos, lookups] = await Promise.all([
        firstValueFrom(this.api.list(this.estadoFilter())),
        this.lookups()
          ? Promise.resolve(this.lookups()!)
          : firstValueFrom(this.api.lookups()),
      ]);
      this.productos.set(productos);
      this.lookups.set(lookups);
    } catch (err) {
      const known = apiError(err);
      this.errorMsg.set(
        known?.message ?? "No se pudo cargar el catálogo. Revisa tu conexión."
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
    this.sort.update((s) =>
      s.key === key ? { key, asc: !s.asc } : { key, asc: true }
    );
  }

  async create(input: ProductoInput): Promise<void> {
    await firstValueFrom(this.api.create(input));
    await this.load();
  }
  async update(id: number, input: ProductoInput): Promise<void> {
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

- [ ] **Step 6: Typecheck-build, test, commit**

```bash
pnpm --filter @serfel/frontend test
pnpm --filter @serfel/frontend build
git add apps/frontend
git commit -m "feat(frontend): productos pure logic, API client and signals store"
```

---

### Task 11: Productos page — header, hero, stats, filters, table, pagination

**Files:**
- Create: `apps/frontend/src/app/features/productos/productos-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ProductosStore`, `brandBadgeStyle`, `AuthService.logout`, global prototype CSS classes.
- Produces: `/productos` route (guarded). The page exposes two hooks wired in Task 12: `openModal(product: ProductoDto | null)` and `confirmDelete(product: ProductoDto)` — in this task their bodies are `console.log` placeholders REPLACED in Task 12 (this is the single allowed stub, called out explicitly so Task 12 knows to replace it).

- [ ] **Step 1: Create the page component**

Create `apps/frontend/src/app/features/productos/productos-page.component.ts`:

```ts
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { EstadoFilter, ProductoDto } from '@serfel/shared';
import { AuthService } from '../../core/auth.service';
import { ProductosStore } from './productos-store';
import { brandBadgeStyle, toCsv, type SortKey } from './productos-logic';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [FormsModule],
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
          <div class="nav-item active">Productos</div>
        </nav>
        <div class="header-spacer"></div>
        <div class="header-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Buscar en catálogo…"
                 [ngModel]="store.filters().quick"
                 (ngModelChange)="store.setFilter({ quick: $event })" />
        </div>
        <div class="header-avatar" (click)="logout()" title="Cerrar sesión">⎋</div>
      </div>
    </header>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Catálogo de Productos</h1>
          <p>Gestiona, filtra y actualiza todos los productos del sistema</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo Producto
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) {
        <div class="login-error">{{ msg }}</div>
      }

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div>
            <div class="stat-lbl">Productos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#2563eb">{{ store.stats().marcas }}</div>
            <div class="stat-lbl">Marcas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#059669">{{ store.stats().tipos }}</div>
            <div class="stat-lbl">Tipos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#d97706">{{ store.stats().filtrados ?? '—' }}</div>
            <div class="stat-lbl">Filtrados</div>
          </div>
        </div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field">
          <label for="f-code">Nº</label>
          <input id="f-code" type="text" placeholder="311" style="width:130px"
                 [ngModel]="store.filters().codigo"
                 (ngModelChange)="store.setFilter({ codigo: $event })" />
        </div>
        <div class="fd-field" style="flex:1">
          <label for="f-name">Nombre del Producto</label>
          <input id="f-name" type="text" placeholder="Buscar por nombre…"
                 [ngModel]="store.filters().nombre"
                 (ngModelChange)="store.setFilter({ nombre: $event })" />
        </div>
        <div class="fd-field">
          <label for="f-brand">Marca</label>
          <select id="f-brand" style="min-width:160px"
                  [ngModel]="store.filters().idMarca"
                  (ngModelChange)="store.setFilter({ idMarca: $event })">
            <option [ngValue]="null">Todas las marcas</option>
            @for (m of store.lookups()?.marcas ?? []; track m.id) {
              <option [ngValue]="m.id">{{ m.nombre }}</option>
            }
          </select>
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
          {{ store.filtered().length }} producto{{ store.filtered().length === 1 ? '' : 's' }} encontrado{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
        <div class="toolbar-spacer"></div>
        <button class="filter-pill" [class.active]="store.filters().idMarca === null"
                (click)="store.setFilter({ idMarca: null })">
          Todos <span class="count">{{ store.productos().length }}</span>
        </button>
        @for (m of store.lookups()?.marcas ?? []; track m.id) {
          <button class="filter-pill" [class.active]="store.filters().idMarca === m.id"
                  (click)="store.setFilter({ idMarca: m.id })">{{ m.nombre }}</button>
        }
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th (click)="store.toggleSort('codSerfel')" [class.sorted]="store.sort().key === 'codSerfel'">
                  Nº <span class="sort-ind">{{ sortInd('codSerfel') }}</span>
                </th>
                <th (click)="store.toggleSort('nomProducto')" [class.sorted]="store.sort().key === 'nomProducto'">
                  Nombre Producto <span class="sort-ind">{{ sortInd('nomProducto') }}</span>
                </th>
                <th (click)="store.toggleSort('nomMarca')" [class.sorted]="store.sort().key === 'nomMarca'">
                  Marca <span class="sort-ind">{{ sortInd('nomMarca') }}</span>
                </th>
                <th (click)="store.toggleSort('nomUm')" [class.sorted]="store.sort().key === 'nomUm'">
                  UM <span class="sort-ind">{{ sortInd('nomUm') }}</span>
                </th>
                <th (click)="store.toggleSort('nomTipoProducto')" [class.sorted]="store.sort().key === 'nomTipoProducto'">
                  Tipo <span class="sort-ind">{{ sortInd('nomTipoProducto') }}</span>
                </th>
                <th style="width:150px; text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of store.paged().slice; track p.idProducto) {
                <tr>
                  <td class="t-num">{{ p.codSerfel }}</td>
                  <td class="t-name">{{ p.nomProducto }}</td>
                  <td>
                    <span class="brand-badge"
                          [style.background]="badge(p.idMarca).background"
                          [style.color]="badge(p.idMarca).color">{{ p.nomMarca }}</span>
                  </td>
                  <td><span class="um-badge">{{ p.nomUm }}</span></td>
                  <td class="t-muted">{{ p.nomTipoProducto }}</td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (p.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(p)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(p)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          Eliminar
                        </button>
                      } @else {
                        <button class="t-btn t-btn-edit" (click)="restore(p)" title="Restaurar">↩ Restaurar</button>
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
          <div class="empty-title">No se encontraron productos</div>
          <div class="empty-sub">Intenta con otros filtros de búsqueda</div>
        </div>
      }
    </div>
  `,
})
export class ProductosPageComponent implements OnInit {
  readonly store = inject(ProductosStore);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    void this.store.load();
  }

  badge = brandBadgeStyle;

  sortInd(key: SortKey): string {
    const s = this.store.sort();
    return s.key === key ? (s.asc ? '↑' : '↓') : '↕';
  }

  goPage(n: number): void {
    this.store.page.set(n);
  }

  /** Windowed page numbers (max 7 buttons). */
  pageNumbers(): number[] {
    const total = this.store.paged().totalPages;
    const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6));
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  setEstado(estado: EstadoFilter): void {
    void this.store.setEstado(estado);
  }

  restore(p: ProductoDto): void {
    void this.store.restore(p.idProducto);
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'productos.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  // Wired to the real modal/confirm flow in the next task (product-modal component).
  openModal(product: ProductoDto | null): void {
    console.log('modal placeholder', product);
  }
  confirmDelete(product: ProductoDto): void {
    console.log('delete placeholder', product);
  }
}
```

- [ ] **Step 2: Register the route**

In `apps/frontend/src/app/app.routes.ts`, add above the wildcard:

```ts
import { authGuard } from './core/auth.guard';
import { ProductosPageComponent } from './features/productos/productos-page.component';
// in routes:
  { path: 'productos', component: ProductosPageComponent, canActivate: [authGuard] },
```

- [ ] **Step 3: Verify build + visual smoke against the dev API**

```bash
pnpm --filter @serfel/frontend build
```

Expected: build succeeds.

Manual smoke (requires dev DB started — `AWS_PROFILE=admin-christian pnpm db:start`):

```bash
API_URL=$(aws apigatewayv2 get-apis --profile admin-christian --region us-east-1 \
  --query "Items[?Name=='serfel-dev-api'].ApiEndpoint | [0]" --output text)
POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --profile admin-christian --region us-east-1 \
  --query "UserPools[?Name=='serfel-dev-users'].Id | [0]" --output text)
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --profile admin-christian --region us-east-1 \
  --query "UserPoolClients[?ClientName=='serfel-dev-web'].ClientId | [0]" --output text)
cd apps/frontend
APP_API_URL="$API_URL" APP_USER_POOL_ID="$POOL_ID" APP_USER_POOL_CLIENT_ID="$CLIENT_ID" pnpm start
```

Open http://localhost:4200 → login with the seeded user → the catalog renders with real data; filters, pills, sorting, pagination, estado filter, CSV export work. Stop the DB afterwards (`pnpm db:stop`).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend
git commit -m "feat(frontend): productos page with stats, filters, sortable table and pagination"
```

---

### Task 12: Product modal, delete confirm, toasts

**Files:**
- Create: `apps/frontend/src/app/features/productos/product-modal.component.ts`
- Create: `apps/frontend/src/app/core/toast.service.ts`
- Create: `apps/frontend/src/app/core/toast.component.ts`
- Modify: `apps/frontend/src/app/features/productos/productos-page.component.ts` (replace the two placeholders)

**Interfaces:**
- Consumes: `ProductosStore`, `apiError` (from `productos-store.ts`), `ProductoInputSchema`, `LookupsDto`, `ProductoDto` from `@serfel/shared`.
- Produces:
  - `ToastService.show(msg: string, kind?: "ok" | "error" | "info")` + `<app-toast/>` rendered by the productos page.
  - `ProductModalComponent` — inputs: `product: ProductoDto | null`, `lookups: LookupsDto`; outputs: `save: EventEmitter<ProductoInput>`, `cancel: EventEmitter<void>`; method `setServerError(code: "COD_SERFEL_EN_USO" | "NOMBRE_EN_USO", message: string)` (called by the page on 409).

- [ ] **Step 1: Toast service + component**

Create `apps/frontend/src/app/core/toast.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';

export type ToastKind = 'ok' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<{ msg: string; kind: ToastKind } | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, kind: ToastKind = 'ok'): void {
    this.current.set({ msg, kind });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.current.set(null), 3500);
  }
}
```

Create `apps/frontend/src/app/core/toast.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

const COLORS = { ok: '#059669', error: '#dc2626', info: '#2563eb' } as const;

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (toasts.current(); as t) {
      <div class="toast show">
        <div class="toast-icon" [style.background]="color(t.kind)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <span>{{ t.msg }}</span>
      </div>
    }
  `,
})
export class ToastComponent {
  readonly toasts = inject(ToastService);
  color(kind: 'ok' | 'error' | 'info'): string {
    return COLORS[kind];
  }
}
```

- [ ] **Step 2: Product modal**

Create `apps/frontend/src/app/features/productos/product-modal.component.ts`:

```ts
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ProductoInputSchema,
  type LookupsDto,
  type ProductoDto,
  type ProductoInput,
} from '@serfel/shared';

interface FieldErrors {
  codigo?: string;
  nombre?: string;
}

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ product ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field full">
            <label for="m-name">Nombre del Producto *</label>
            <input id="m-name" type="text" placeholder="YOG.BATIDO SOPR 165grs"
                   [(ngModel)]="nombre" />
            @if (errors().nombre; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="m-code">Nº (código Serfel) *</label>
            <input id="m-code" type="number" placeholder="311" [(ngModel)]="codigo" />
            @if (errors().codigo; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="m-brand">Marca *</label>
            <select id="m-brand" [(ngModel)]="idMarca">
              @for (m of lookups.marcas; track m.id) {
                <option [ngValue]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="m-um">Unidad de Medida *</label>
            <select id="m-um" [(ngModel)]="idUm">
              @for (u of lookups.unidadesMedida; track u.id) {
                <option [ngValue]="u.id">{{ u.nombre }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label for="m-tipo">Tipo *</label>
            <select id="m-tipo" [(ngModel)]="idTipoProducto">
              @for (t of lookups.tiposProducto; track t.id) {
                <option [ngValue]="t.id">{{ t.nombre }}</option>
              }
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Producto' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProductModalComponent implements OnInit {
  @Input() product: ProductoDto | null = null;
  @Input({ required: true }) lookups!: LookupsDto;
  @Output() save = new EventEmitter<ProductoInput>();
  @Output() cancel = new EventEmitter<void>();

  nombre = '';
  codigo: number | null = null;
  idMarca: number | null = null;
  idUm: number | null = null;
  idTipoProducto: number | null = null;

  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.product) {
      this.nombre = this.product.nomProducto;
      this.codigo = this.product.codSerfel;
      this.idMarca = this.product.idMarca;
      this.idUm = this.product.idUm;
      this.idTipoProducto = this.product.idTipoProducto;
    } else {
      this.idMarca = this.lookups.marcas[0]?.id ?? null;
      this.idUm = this.lookups.unidadesMedida[0]?.id ?? null;
      this.idTipoProducto = this.lookups.tiposProducto[0]?.id ?? null;
    }
  }

  onSave(): void {
    const parsed = ProductoInputSchema.safeParse({
      codSerfel: this.codigo,
      nomProducto: this.nombre,
      idMarca: this.idMarca,
      idUm: this.idUm,
      idTipoProducto: this.idTipoProducto,
    });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'codSerfel') errs.codigo = 'Ingresa un número válido (> 0)';
        if (issue.path[0] === 'nomProducto') errs.nombre = 'El nombre es obligatorio (máx. 200)';
      }
      this.errors.set(errs);
      return;
    }
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(parsed.data);
  }

  /** Called by the parent when the API returns a 409. */
  setServerError(code: 'COD_SERFEL_EN_USO' | 'NOMBRE_EN_USO', message: string): void {
    this.busy.set(false);
    this.errors.set(
      code === 'COD_SERFEL_EN_USO' ? { codigo: message } : { nombre: message }
    );
  }
}
```

- [ ] **Step 3: Wire the modal + delete confirm + toasts into the page**

In `apps/frontend/src/app/features/productos/productos-page.component.ts`:

1. Extend imports:

```ts
import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import type { EstadoFilter, ProductoDto, ProductoInput } from '@serfel/shared';
import { ProductosStore, apiError } from './productos-store';
import { ProductModalComponent } from './product-modal.component';
import { ToastComponent } from '../../core/toast.component';
import { ToastService } from '../../core/toast.service';
```

2. Add `ProductModalComponent, ToastComponent` to the component `imports` array.

3. Append to the template (before the closing backtick):

```html
    @if (modalOpen()) {
      <app-product-modal
        [product]="editing()"
        [lookups]="store.lookups()!"
        (save)="onSave($event)"
        (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
```

4. Replace the two placeholder methods and add the state/handlers:

```ts
  private toasts = inject(ToastService);
  readonly modalOpen = signal(false);
  readonly editing = signal<ProductoDto | null>(null);
  private modal = viewChild(ProductModalComponent);

  openModal(product: ProductoDto | null): void {
    if (!this.store.lookups()) return; // still loading
    this.editing.set(product);
    this.modalOpen.set(true);
  }

  async onSave(input: ProductoInput): Promise<void> {
    const current = this.editing();
    try {
      if (current) {
        await this.store.update(current.idProducto, input);
        this.toasts.show('Producto actualizado exitosamente');
      } else {
        await this.store.create(input);
        this.toasts.show('Producto creado exitosamente');
      }
      this.modalOpen.set(false);
    } catch (err) {
      const known = apiError(err);
      if (known && (known.code === 'COD_SERFEL_EN_USO' || known.code === 'NOMBRE_EN_USO')) {
        this.modal()?.setServerError(known.code, known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? 'Error al guardar el producto', 'error');
      }
    }
  }

  async confirmDelete(product: ProductoDto): Promise<void> {
    if (!confirm(`¿Eliminar "${product.nomProducto}" del catálogo? Podrás restaurarlo desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(product.idProducto);
      this.toasts.show('Producto eliminado', 'error');
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? 'Error al eliminar', 'error');
    }
  }
```

Also update `restore()` to toast:

```ts
  async restore(p: ProductoDto): Promise<void> {
    try {
      await this.store.restore(p.idProducto);
      this.toasts.show('Producto restaurado');
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? 'No se pudo restaurar', 'error');
    }
  }
```

- [ ] **Step 4: Verify build + full manual CRUD smoke**

```bash
pnpm --filter @serfel/frontend test && pnpm --filter @serfel/frontend build
```

Then repeat the `pnpm start` smoke from Task 11 Step 3 (DB started): create a product with a fresh Nº, edit it, try a duplicate Nº (inline field error appears), delete it, switch estado filter to Inactivos, restore it, delete it again. Stop the DB afterwards.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend
git commit -m "feat(frontend): product modal with field-level 409 errors, delete/restore, toasts"
```

---

### Task 13: StaticSite deploy (S3 + CloudFront)

**Files:**
- Create: `infra/frontend.ts`
- Modify: `sst.config.ts`

**Interfaces:**
- Consumes: `apiUrl` (from `infra/api.ts`), `userPoolId`, `userPoolClientId` (from `infra/auth.ts`); the frontend build contract from Task 8 (`APP_*` env vars, output `dist/frontend/browser`).
- Produces: deployed CloudFront site serving the Angular app; SPA fallback to `index.html`.

- [ ] **Step 1: StaticSite infra**

Create `infra/frontend.ts`:

```ts
import { apiUrl } from "./api";
import { userPoolClientId, userPoolId } from "./auth";

new sst.aws.StaticSite("Frontend", {
  path: "apps/frontend",
  build: {
    command: "pnpm run build",
    output: "dist/frontend/browser",
  },
  environment: {
    APP_API_URL: apiUrl,
    APP_USER_POOL_ID: userPoolId,
    APP_USER_POOL_CLIENT_ID: userPoolClientId,
  },
  // SPA: serve index.html for unknown paths (Angular router handles the rest)
  errorPage: "index.html",
});
```

In `sst.config.ts` `run()`, append after the api import:

```ts
    await import("./infra/frontend");
```

- [ ] **Step 2: Deploy and smoke**

```bash
pnpm typecheck
AWS_PROFILE=admin-christian npx sst deploy --stage dev
```

Expected: deploy output includes the `Frontend` CloudFront URL.

With the DB started (`pnpm db:start`), open the CloudFront URL in a browser:
- `/login` renders with the approved look; login works (HTTPS origin is required by Amplify for secure contexts — CloudFront provides it).
- `/productos` loads the real catalog; a full CRUD round-trip works (create → edit → duplicate-Nº rejection → delete → restore).
- Deep-link refresh on `/productos` returns the app (SPA fallback), not a 403/404.

Stop the DB afterwards (`pnpm db:stop`).

- [ ] **Step 3: Commit**

```bash
git add infra/frontend.ts sst.config.ts
git commit -m "feat(infra): deploy Angular frontend as StaticSite (S3 + CloudFront)"
```

---

### Task 14: CI tests + on-demand API smoke script

**Files:**
- Modify: `.github/workflows/deploy-dev.yml`
- Create: `scripts/api-smoke.sh`

**Interfaces:**
- Consumes: everything deployed; `serfel-dev-users` pool client with `ALLOW_ADMIN_USER_PASSWORD_AUTH` (Task 7).
- Produces: CI runs typecheck + all workspace tests (against dockerized MariaDB) before deploying; `scripts/api-smoke.sh` is the on-demand integration suite from the spec.

- [ ] **Step 1: CI test steps**

*(Execution note: for `pnpm typecheck` to work on a fresh CI clone — where `.sst/platform` doesn't exist — the root `tsconfig.json` exclude list must also contain `"infra"` and `"sst.config.ts"`; those files' types are enforced by `sst deploy` in the same pipeline. Discovered during execution.)*

In `.github/workflows/deploy-dev.yml`, insert between the `Install dependencies` and `Configure AWS credentials via OIDC` steps:

```yaml
      - name: Typecheck
        run: pnpm typecheck

      - name: Start MariaDB for tests
        run: docker compose -f packages/db/docker-compose.yml up -d --wait

      - name: Run workspace tests
        run: pnpm -r test
```

- [ ] **Step 2: API smoke script**

Create `scripts/api-smoke.sh` (then `chmod +x scripts/api-smoke.sh`):

```bash
#!/usr/bin/env bash
# On-demand integration test: full products CRUD round-trip against the dev API.
# Requires: dev DB running (pnpm db:start), a seeded Cognito user, and:
#   SMOKE_EMAIL=... SMOKE_PASSWORD=... ./scripts/api-smoke.sh
# Respects the caller's AWS_PROFILE. Cleans up after itself (soft delete).
set -euo pipefail

: "${SMOKE_EMAIL:?export SMOKE_EMAIL}"
: "${SMOKE_PASSWORD:?export SMOKE_PASSWORD}"
REGION="us-east-1"

POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" \
  --query "UserPools[?Name=='serfel-dev-users'].Id | [0]" --output text)
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --region "$REGION" \
  --query "UserPoolClients[?ClientName=='serfel-dev-web'].ClientId | [0]" --output text)
API_URL=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='serfel-dev-api'].ApiEndpoint | [0]" --output text)

TOKEN=$(aws cognito-idp admin-initiate-auth --region "$REGION" \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=$SMOKE_EMAIL,PASSWORD=$SMOKE_PASSWORD" \
  --query 'AuthenticationResult.IdToken' --output text)

AUTH=(-H "Authorization: Bearer $TOKEN" -H "content-type: application/json")
COD=$((900000 + RANDOM))
NAME="SMOKE TEST $COD"
PASS=0; FAIL=0

check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "ok   $1"; else FAIL=$((FAIL+1)); echo "FAIL $1 (expected $2, got $3)"; fi
}

json_field() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

# 1. anonymous is rejected
check "401 without token" 401 "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/api/products")"

# 2. list + lookups
check "GET products" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API_URL/api/products")"
check "GET lookups" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API_URL/api/lookups")"
MARCA=$(curl -s "${AUTH[@]}" "$API_URL/api/lookups" | json_field "['marcas'][0]['id']")
UM=$(curl -s "${AUTH[@]}" "$API_URL/api/lookups" | json_field "['unidadesMedida'][0]['id']")
TIPO=$(curl -s "${AUTH[@]}" "$API_URL/api/lookups" | json_field "['tiposProducto'][0]['id']")
BODY="{\"codSerfel\":$COD,\"nomProducto\":\"$NAME\",\"idMarca\":$MARCA,\"idUm\":$UM,\"idTipoProducto\":$TIPO}"

# 3. create
CREATED=$(curl -s "${AUTH[@]}" -X POST -d "$BODY" "$API_URL/api/products")
ID=$(echo "$CREATED" | json_field "['idProducto']")
check "POST creates with DB-assigned id" "yes" "$([ "$ID" -gt 0 ] && echo yes)"

# 4. duplicate rejected with machine-readable code
DUP_CODE=$(curl -s "${AUTH[@]}" -X POST -d "$BODY" "$API_URL/api/products" | json_field "['error']['code']")
check "duplicate cod_serfel rejected" "COD_SERFEL_EN_USO" "$DUP_CODE"

# 5. update
check "PUT updates" 200 "$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" -X PUT \
  -d "{\"codSerfel\":$COD,\"nomProducto\":\"$NAME v2\",\"idMarca\":$MARCA,\"idUm\":$UM,\"idTipoProducto\":$TIPO}" \
  "$API_URL/api/products/$ID")"

# 6. soft delete + restore + final delete (cleanup)
DEL_ESTADO=$(curl -s "${AUTH[@]}" -X DELETE "$API_URL/api/products/$ID" | json_field "['idEstado']")
check "DELETE soft-deletes (idEstado 0)" 0 "$DEL_ESTADO"
REST_ESTADO=$(curl -s "${AUTH[@]}" -X POST "$API_URL/api/products/$ID/restore" | json_field "['idEstado']")
check "restore reactivates (idEstado 1)" 1 "$REST_ESTADO"
curl -s -o /dev/null "${AUTH[@]}" -X DELETE "$API_URL/api/products/$ID"   # leave it inactive

echo "---- $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

- [ ] **Step 3: Run the smoke suite once (DB started)**

```bash
AWS_PROFILE=admin-christian pnpm db:start
AWS_PROFILE=admin-christian SMOKE_EMAIL=fracktured@gmail.com SMOKE_PASSWORD='<the-password>' ./scripts/api-smoke.sh
AWS_PROFILE=admin-christian pnpm db:stop
```

Expected: `---- 9 passed, 0 failed` (exit code 0).

- [ ] **Step 4: Commit, push, watch CI**

```bash
git add .github/workflows/deploy-dev.yml scripts/api-smoke.sh
git commit -m "ci: run typecheck and workspace tests before deploy; add api smoke script"
git push origin main
```

Watch the GitHub Actions run: typecheck + tests pass, deploy succeeds, migrate step runs or warns (depending on DB state).

- [ ] **Step 5: Close out the phase**

- Tick the Fase 3 checklist items in `../plan-trabajo-app-ventas-aws.md` (the `AWS/` folder, outside git).
- Record completion in `serfel/.git/sdd/progress.md` (existing execution-ledger convention).
- Report to the user: CloudFront URL, API URL, how to create more users (`scripts/cognito-create-user.sh`), and the reminder that the dev DB should stay stopped when idle.

---

## Self-Review Notes

- **Spec coverage:** §2 scope → Tasks 7/13 (infra), 3–6 (Lambda), 8–12 (Angular), relations wiring → Task 2. §3 API + rules → Tasks 3–6 + smoke (Task 14). §3 AUTO_INCREMENT migration → Task 2 (+ applied in Task 7 Step 9). §4 auth → Tasks 7 & 9 (ID token per amended spec). §5 frontend behaviors → Tasks 10–12 (stats, filters, pills, sort, pagination, modal, CSV, estado filter + restore, field-level 409s, badge colors from real marcas). §6 testing → unit suites per task, integration = `api-smoke.sh`, frontend logic specs + manual smoke. §7 CI → Task 14; plan-file restructure was done before this plan. §8 portability → no hardcoded account IDs/ARNs introduced (names + lookups by name only); Cognito rebuildable via `infra/auth.ts` + `cognito-create-user.sh`.
- **Known deliberate stub:** `openModal`/`confirmDelete` placeholders in Task 11 are explicitly replaced in Task 12 (declared in both tasks' Interfaces).
- **Naming consistency check:** `createApp(deps)`, `AppDeps`, `setupTestDb`, `SEED`, `ProductoInputSchema`, `apiError`, `brandBadgeStyle` used identically across tasks.
