# Usuarios Maintainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Usuarios maintainer as a vertical slice (Angular page + Hono Lambda + shared Zod DTOs) mirroring the Productos maintainer, with per-user on-demand Cognito enrollment and legacy-compatible password storage.

**Architecture:** New `usuarios` authz module. A Hono Lambda (`lambdas/usuarios`) exposes CRUD + activate + Cognito-enroll routes over `10_m_usuario`, storing passwords as `md5(hex)` to keep the still-live legacy PHP login working. Cognito presence is computed live via one `ListUsers` call per list load. `id_usuario` becomes `AUTO_INCREMENT`. The Angular feature copies the Productos page/store/modal structure and reuses the existing global SCSS classes.

**Tech Stack:** TypeScript, Angular 20 (standalone + signals), Hono, Drizzle ORM, MariaDB, Zod, SST v3, AWS Cognito (`@aws-sdk/client-cognito-identity-provider`), Vitest, PHP 5.6 (legacy edits).

## Global Constraints

- Node >= 22; run all commands from repo root unless noted.
- Never hand-assign primary keys — read `ResultSetHeader.insertId` (`t10MUsuario.idUsuario` gains `.autoincrement()`).
- Never read or log `10_m_usuario.password`; only write it. Store `md5(hex)` of the plaintext (legacy computes `hex_md5` client-side; the Lambda produces the identical digest server-side).
- One Zod schema per DTO in `packages/shared`, reused by Lambda and Angular form. Never duplicate DTOs.
- Lambda: ARM64, `nodejs22.x`, DB pool created outside the handler, `custom:id_usuario` read from the Cognito **ID token**.
- Auth identity for writes = acting admin's `custom:id_usuario` → `id_usuario_mod`.
- Module access: `usuarios` allowed for `id_tipo_usuario` `[1]` (Administrador) only.
- Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` first.
- Do not use em dashes in AWS resource names/descriptions.
- Frontend copy is Spanish (matches Productos).

---

## File Structure

**Created:**
- `packages/db/migrations/0008_usuario_id_autoincrement.sql` — `id_usuario` → AUTO_INCREMENT.
- `packages/shared/src/usuarios.ts` — RUT helpers, Zod schemas, DTO types, error codes.
- `packages/shared/src/usuarios.spec.ts` — RUT módulo-11 tests.
- `lambdas/usuarios/index.ts` `app.ts` `service.ts` `authz.ts` `errors.ts` `types.ts` `cognito.ts` `package.json` `tsconfig.json` `vitest.config.ts`.
- `lambdas/usuarios/tests/service.test.ts` `tests/app.test.ts` `tests/helpers.ts`.
- `apps/frontend/src/app/features/usuarios/usuarios-api.service.ts` `usuarios-logic.ts` `usuarios-logic.spec.ts` `usuarios-store.ts` `usuario-modal.component.ts` `usuarios-page.component.ts`.

**Modified:**
- `packages/db/src/schema.ts:219` — add `.autoincrement()` to `t10MUsuario.idUsuario`.
- `packages/db/migrations/meta/_journal.json` — register migration 0008.
- `packages/shared/src/authz.ts` — add `usuarios: [1]`.
- `packages/shared/src/index.ts` — export `./usuarios`.
- `infra/auth.ts` — export `userPoolArn`.
- `infra/api.ts` — register `UsuariosFn`, routes, Cognito IAM, `USER_POOL_ID` env.
- `apps/frontend/src/app/app.routes.ts` — add guarded `/usuarios` route.
- `apps/frontend/src/app/core/nav.ts` — add `usuarios` nav entry.
- `legacy-php/Distribuidor/Clases/Usuario.php` + `legacy-php/Coproad/Clases/Usuario.php` — drop `MAX(id)+1`.

---

## Task 1: Make `id_usuario` AUTO_INCREMENT

**Files:**
- Modify: `packages/db/src/schema.ts:219`
- Create: `packages/db/migrations/0008_usuario_id_autoincrement.sql`
- Modify: `packages/db/migrations/meta/_journal.json`

**Interfaces:**
- Produces: `t10MUsuario.idUsuario` is AUTO_INCREMENT; new inserts omit `idUsuario` and read `insertId`.

- [ ] **Step 1: Edit the schema column**

In `packages/db/src/schema.ts`, line 219, change:

```ts
	idUsuario: int("id_usuario").notNull(),
```
to (matching the `t20MProducto.idProducto` / `t40MVenta.idVenta` style already in this file):
```ts
	idUsuario: int("id_usuario").autoincrement().notNull(),
```

- [ ] **Step 2: Generate the migration and inspect it**

Run: `pnpm --filter @serfel/db generate`
Expected: a new `packages/db/migrations/0008_*.sql` containing exactly:
```sql
ALTER TABLE `10_m_usuario` MODIFY COLUMN `id_usuario` int AUTO_INCREMENT NOT NULL;
```
and `meta/_journal.json` gains an `idx: 8` entry. If drizzle-kit emits unrelated noise, discard it and instead hand-write the file below + add the journal entry by hand.

- [ ] **Step 3: Rename the generated file (if needed) for a descriptive name**

Ensure the file is named `packages/db/migrations/0008_usuario_id_autoincrement.sql` with the single `ALTER TABLE` statement above, and that `meta/_journal.json`'s last entry `tag` is `"0008_usuario_id_autoincrement"`. If you renamed, update the `tag` to match.

- [ ] **Step 4: Verify migrations apply cleanly against local MariaDB**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm --filter @serfel/lambdas exec vitest run lambdas/products/tests/service.test.ts
```
Expected: PASS. (The products test helper runs all migrations 0001-0008 on a fresh DB; seeding `t10MUsuario` with explicit ids still works because MySQL allows explicit values for AUTO_INCREMENT columns.)

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/migrations/0008_usuario_id_autoincrement.sql packages/db/migrations/meta/_journal.json
git commit -m "feat(db): make 10_m_usuario.id_usuario AUTO_INCREMENT"
```

---

## Task 2: Shared RUT helpers, Zod schemas, DTOs, module registration

**Files:**
- Create: `packages/shared/src/usuarios.ts`
- Create: `packages/shared/src/usuarios.spec.ts`
- Modify: `packages/shared/src/authz.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces:
  - `computeDv(rut: number): string`, `parseRut(input: string): { rut: number; dv: string } | null`, `rutValido(input: string): boolean`, `formatRut(rut: number, dv: string): string`
  - `UsuarioCreateSchema`, `UsuarioUpdateSchema` (Zod); types `UsuarioCreateInput`, `UsuarioUpdateInput`
  - `UsuarioDto`, `UsuarioLookupsDto`
  - Error codes added to `ApiErrorCode`
  - `MODULE_ROLES.usuarios = [1]`

- [ ] **Step 1: Write failing RUT tests**

Create `packages/shared/src/usuarios.spec.ts` (it fails to import because `./usuarios` does not exist yet):
```ts
import { describe, it, expect } from "vitest";
import { computeDv, parseRut, rutValido, formatRut } from "./usuarios";

describe("computeDv", () => {
  it("computes check digits including K and 0", () => {
    expect(computeDv(11111111)).toBe("1");
    expect(computeDv(6371526)).toBe("K");
    expect(computeDv(12345678)).toBe("5");
    expect(computeDv(11704324)).toBe("0");
  });
});

describe("parseRut", () => {
  it("parses dotted and plain formats", () => {
    expect(parseRut("12.345.678-5")).toEqual({ rut: 12345678, dv: "5" });
    expect(parseRut("12345678-5")).toEqual({ rut: 12345678, dv: "5" });
    expect(parseRut("6371526-k")).toEqual({ rut: 6371526, dv: "K" });
  });
  it("rejects malformed input", () => {
    expect(parseRut("abc")).toBeNull();
    expect(parseRut("")).toBeNull();
    expect(parseRut("12345678-")).toBeNull();
  });
});

describe("rutValido", () => {
  it("accepts valid ruts and rejects bad check digits", () => {
    expect(rutValido("12.345.678-5")).toBe(true);
    expect(rutValido("6371526-K")).toBe(true);
    expect(rutValido("12345678-9")).toBe(false);
  });
});

describe("formatRut", () => {
  it("joins rut and dv", () => {
    expect(formatRut(12345678, "5")).toBe("12345678-5");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/shared exec vitest run src/usuarios.spec.ts`
Expected: FAIL with "Cannot find module './usuarios'".

- [ ] **Step 3: Implement `packages/shared/src/usuarios.ts`**

```ts
import { z } from "zod";

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

const REQUIRED = (max: number) => z.string().trim().min(1).max(max);

/** Fields common to create and update (everything except rut and password). */
const usuarioBase = {
  nomUsuario: REQUIRED(50),
  apellPatUsuario: REQUIRED(30),
  apellMatUsuario: REQUIRED(30),
  idTipoUsuario: z.number().int().positive(),
  telefonoUsuario: REQUIRED(15),
  direccionUsuario: REQUIRED(200),
  emailUsuario: z.string().trim().email().max(50),
  // optional; when present must be a non-negative integer. 0 means "sin número".
  numUsuario: z.number().int().nonnegative().nullable().default(null),
};

export const UsuarioCreateSchema = z.object({
  rut: z.string().refine(rutValido, "RUT inválido (dígito verificador no coincide)"),
  ...usuarioBase,
  password: z.string().min(4).max(50),
});
export type UsuarioCreateInput = z.infer<typeof UsuarioCreateSchema>;

export const UsuarioUpdateSchema = z.object({
  ...usuarioBase,
  // optional on update: empty/omitted means "keep current password".
  password: z.string().min(4).max(50).optional(),
});
export type UsuarioUpdateInput = z.infer<typeof UsuarioUpdateSchema>;

export interface UsuarioDto {
  idUsuario: number;
  rutUsuario: number;
  dvUsuario: string;
  rut: string;
  nomUsuario: string;
  apellPatUsuario: string;
  apellMatUsuario: string;
  nombreCompleto: string;
  idTipoUsuario: number;
  nomTipoUsuario: string;
  telefonoUsuario: string | null;
  direccionUsuario: string;
  emailUsuario: string | null;
  numUsuario: number;
  idEstado: number;
  tieneCognito: boolean;
}

export interface UsuarioLookupsDto {
  tiposUsuario: { id: number; nombre: string }[];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/shared exec vitest run src/usuarios.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Register the module and export codes**

In `packages/shared/src/authz.ts`, add `usuarios` to `MODULE_ROLES`:
```ts
export const MODULE_ROLES = {
  productos: [1], // 1 = Administrador
  rutas: [1], // 1 = Administrador
  usuarios: [1], // 1 = Administrador
} as const;
```

In `packages/shared/src/productos.ts`, extend the `ApiErrorCode` union with the usuarios codes:
```ts
export type ApiErrorCode =
  | "COD_SERFEL_EN_USO"
  | "NOMBRE_EN_USO"
  | "PRODUCTO_NO_ENCONTRADO"
  | "VALIDACION"
  | "NO_AUTORIZADO"
  | "PROHIBIDO"
  | "DB_NO_DISPONIBLE"
  | "ERROR_INTERNO"
  | "RUT_EN_USO"
  | "RUT_INACTIVO"
  | "NUM_EN_USO"
  | "EMAIL_EN_USO"
  | "USUARIO_NO_ENCONTRADO"
  | "USUARIO_CON_VENTAS_PENDIENTES"
  | "USUARIO_SIN_EMAIL"
  | "COGNITO_YA_EXISTE"
  | "COGNITO_ERROR";
```

In `packages/shared/src/index.ts`, add the export:
```ts
export * from "./usuarios";
```

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm --filter @serfel/shared exec vitest run && pnpm typecheck`
Expected: PASS. (`nav.ts` will now fail typecheck because `NAV_ITEMS` is a full `Record<ModuleName, ...>` missing `usuarios` — that is fixed in Task 9; if running the full `pnpm typecheck` here fails only on `nav.ts`, that is expected. Run `pnpm --filter @serfel/shared exec tsc --noEmit` to scope the check to shared.)

```bash
git add packages/shared/src/usuarios.ts packages/shared/src/usuarios.spec.ts packages/shared/src/authz.ts packages/shared/src/productos.ts packages/shared/src/index.ts
git commit -m "feat(shared): usuarios Zod schemas, RUT módulo-11 helpers, module + error codes"
```

---

## Task 3: Lambda scaffolding (index, types, errors, authz, cognito, config)

**Files:**
- Create: `lambdas/usuarios/package.json` `tsconfig.json` `vitest.config.ts` `errors.ts` `types.ts` `authz.ts` `cognito.ts` `index.ts`

**Interfaces:**
- Consumes: `@serfel/shared` (Task 2), `@serfel/db`.
- Produces:
  - `AppDeps` = `{ getDb; getIdUsuario; listEnrolledIds(): Promise<Set<number>>; enrollCognito(email, idUsuario): Promise<void> }`
  - `AppEnv` variables `{ idUsuario, idTipoUsuario }`
  - `AppError`, `isDbUnreachable`
  - `cognito.ts`: `makeCognito(userPoolId)` → `{ listEnrolledIds, enrollCognito }`
  - `createApp(deps)` (implemented in Task 5); `handler` export

- [ ] **Step 1: Copy the shared lambda config from products**

Copy `lambdas/products/package.json`, `tsconfig.json`, `vitest.config.ts` to `lambdas/usuarios/` and set the package `name` to `@serfel/lambda-usuarios` (match products' naming convention — check products' `name` field and mirror it). Add the Cognito SDK dependency to `lambdas/usuarios/package.json` dependencies:
```json
"@aws-sdk/client-cognito-identity-provider": "^3.600.0"
```
(Use the same major/version line as `@aws-sdk/client-secrets-manager` already pinned in `lambdas/products/package.json`.)

- [ ] **Step 2: Copy `errors.ts` and `types.ts`, extend `types.ts`**

Copy `lambdas/products/errors.ts` to `lambdas/usuarios/errors.ts` unchanged.

Create `lambdas/usuarios/types.ts`:
```ts
import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
  /** Set of id_usuario values that already have a Cognito user. */
  listEnrolledIds: () => Promise<Set<number>>;
  /** Creates a Cognito user (AdminCreateUser + email invite). */
  enrollCognito: (email: string, idUsuario: number) => Promise<void>;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};
```

- [ ] **Step 3: Create `authz.ts`**

Copy `lambdas/products/authz.ts` to `lambdas/usuarios/authz.ts` verbatim (it imports `getUserTipo` from `./service`, which Task 4 provides, and is generic over `ModuleName`).

- [ ] **Step 4: Create `cognito.ts`**

```ts
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { AppError } from "./errors";

const cip = new CognitoIdentityProviderClient({});

export interface CognitoOps {
  listEnrolledIds: () => Promise<Set<number>>;
  enrollCognito: (email: string, idUsuario: number) => Promise<void>;
}

/**
 * Cognito helpers bound to a user pool. `custom:id_usuario` is not a
 * server-side ListUsers filter attribute, so presence is computed by listing
 * users (paginated) and reading the attribute in code — cheap at ~30 users.
 */
export function makeCognito(userPoolId: string): CognitoOps {
  return {
    async listEnrolledIds() {
      const ids = new Set<number>();
      let token: string | undefined;
      do {
        const res = await cip.send(
          new ListUsersCommand({ UserPoolId: userPoolId, Limit: 60, PaginationToken: token })
        );
        for (const u of res.Users ?? []) {
          const attr = u.Attributes?.find((a) => a.Name === "custom:id_usuario");
          const n = attr?.Value ? Number(attr.Value) : NaN;
          if (Number.isInteger(n)) ids.add(n);
        }
        token = res.PaginationToken;
      } while (token);
      return ids;
    },

    async enrollCognito(email: string, idUsuario: number) {
      try {
        await cip.send(
          new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: [
              { Name: "email", Value: email },
              { Name: "email_verified", Value: "true" },
              { Name: "custom:id_usuario", Value: String(idUsuario) },
            ],
            DesiredDeliveryMediums: ["EMAIL"],
          })
        );
      } catch (err) {
        if (err instanceof UsernameExistsException) {
          throw new AppError("COGNITO_YA_EXISTE", 409, "Ya existe un usuario de Cognito con ese email");
        }
        throw new AppError("COGNITO_ERROR", 502, "No se pudo crear el usuario en Cognito");
      }
    },
  };
}
```

- [ ] **Step 5: Create `index.ts`**

```ts
import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import { createApp } from "./app";
import { makeCognito } from "./cognito";

const sm = new SecretsManagerClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
  );
  if (!secret.SecretString) throw new Error("DB secret has no SecretString");
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, {
    ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") },
  }).db;
  return cachedDb;
}

interface JwtEnv {
  event?: {
    requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } };
  };
}

const cognito = makeCognito(process.env.USER_POOL_ID ?? "");

const app = createApp({
  getDb,
  getIdUsuario: (c) => {
    const claims = (c.env as JwtEnv).event?.requestContext?.authorizer?.jwt?.claims;
    const parsed = Number(claims?.["custom:id_usuario"]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
  listEnrolledIds: cognito.listEnrolledIds,
  enrollCognito: cognito.enrollCognito,
});

export const handler = handle(app);
```

- [ ] **Step 6: Install and typecheck**

Run:
```bash
pnpm install
pnpm --filter @serfel/lambda-usuarios exec tsc --noEmit
```
Expected: errors only about missing `./app` and `./service` (provided in Tasks 4-5). If other errors appear, fix the config copy. Do not commit yet — commit at the end of Task 5 when the lambda compiles.

---

## Task 4: Lambda `service.ts` + service tests

**Files:**
- Create: `lambdas/usuarios/service.ts`
- Create: `lambdas/usuarios/tests/helpers.ts`, `lambdas/usuarios/tests/service.test.ts`

**Interfaces:**
- Consumes: `@serfel/db` tables `t10MUsuario`, `t10PTipoUsuario`, `t30MPedido`, `t40MVenta`; `@serfel/shared` types/consts.
- Produces:
  - `getUsuarioLookups(db): Promise<UsuarioLookupsDto>`
  - `listUsuarios(db, estado): Promise<UsuarioDto[]>` (tieneCognito=false; merged in app)
  - `createUsuario(db, input, idUsuario): Promise<{ kind: "created"; dto: UsuarioDto } | { kind: "inactive"; idUsuario: number }>`
  - `activateUsuario(db, id, input, idUsuario): Promise<UsuarioDto>`
  - `updateUsuario(db, id, input, idUsuario): Promise<UsuarioDto>`
  - `deactivateUsuario(db, id, idUsuario): Promise<UsuarioDto>`
  - `getUsuarioForCognito(db, id): Promise<{ email: string }>`
  - `getUserTipo(db, idUsuario): Promise<number | null>` (used by `authz.ts`)
  - `md5hex(s): string`

- [ ] **Step 1: Create the test helper**

Create `lambdas/usuarios/tests/helpers.ts` by copying `lambdas/products/tests/helpers.ts` and trimming it to the tables the usuarios tests touch. Keep the `setupTestDb` shape identical; seed:
```ts
// after migrate(db, ...):
await db.insert(t99PEstado).values([
  { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
  { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
]);
await db.insert(t10PTipoUsuario).values([
  { idTipoUsuario: 1, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
  { idTipoUsuario: 2, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
]);
await db.insert(t10MUsuario).values([
  { idUsuario: 1, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin", apellPatUsuario: "Uno",
    apellMatUsuario: "X", password: "seed", idTipoUsuario: 1, telefonoUsuario: "1",
    direccionUsuario: "-", emailUsuario: "admin@serfel.cl", numUsuario: 0,
    idUsuarioMod: 1, ultFechaMod: "2026-01-01 00:00:00", idEstado: 1 },
]);
```
Export the seeded ids as `SEED = { idAdmin: 1, tipoAdmin: 1, tipoVendedor: 2 }`.

- [ ] **Step 2: Write failing service tests**

Create `lambdas/usuarios/tests/service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t10MUsuario, t30MPedido, t40MVenta, type Db } from "@serfel/db";
import { eq } from "drizzle-orm";
import { setupTestDb, SEED } from "./helpers";
import {
  getUsuarioLookups, listUsuarios, createUsuario, activateUsuario,
  updateUsuario, deactivateUsuario, md5hex,
} from "../service";

let db: Db; let pool: Pool; let teardown: () => Promise<void>;
beforeAll(async () => { ({ db, pool, teardown } = await setupTestDb("serfel_usuarios_svc")); });
afterAll(async () => { await teardown(); });

const baseInput = {
  rut: "12345678-5", nomUsuario: "Juan", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
  idTipoUsuario: 2, telefonoUsuario: "+56 9 1234 5678", direccionUsuario: "Calle 1",
  emailUsuario: "juan@serfel.cl", numUsuario: 10, password: "secret1",
};

describe("createUsuario", () => {
  it("inserts a new active user with md5 password and auto id", async () => {
    const res = await createUsuario(db, baseInput, SEED.idAdmin);
    expect(res.kind).toBe("created");
    if (res.kind !== "created") return;
    expect(res.dto.idUsuario).toBeGreaterThan(1);
    expect(res.dto.rut).toBe("12345678-5");
    expect(res.dto.nombreCompleto).toBe("Perez Soto Juan");
    expect(res.dto.idEstado).toBe(1);
    const row = await db.select().from(t10MUsuario).where(eq(t10MUsuario.idUsuario, res.dto.idUsuario));
    expect(row[0].password).toBe(md5hex("secret1"));
  });

  it("rejects duplicate active RUT with RUT_EN_USO", async () => {
    await expect(createUsuario(db, { ...baseInput, emailUsuario: "otro@serfel.cl", numUsuario: 11 }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "RUT_EN_USO" });
  });

  it("rejects duplicate num_usuario with NUM_EN_USO", async () => {
    await expect(createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "z@serfel.cl", numUsuario: 10 }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "NUM_EN_USO" });
  });

  it("rejects duplicate email with EMAIL_EN_USO", async () => {
    await expect(createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "juan@serfel.cl", numUsuario: 12 }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "EMAIL_EN_USO" });
  });

  it("returns inactive when RUT exists but is deactivated", async () => {
    const created = await createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "re@serfel.cl", numUsuario: 20 }, SEED.idAdmin);
    if (created.kind !== "created") throw new Error("expected created");
    await deactivateUsuario(db, created.dto.idUsuario, SEED.idAdmin);
    const again = await createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "re@serfel.cl", numUsuario: 20 }, SEED.idAdmin);
    expect(again).toEqual({ kind: "inactive", idUsuario: created.dto.idUsuario });
  });
});

describe("activateUsuario", () => {
  it("reactivates and applies the submitted form data", async () => {
    const rows = await db.select().from(t10MUsuario).where(eq(t10MUsuario.idEstado, 0));
    const target = rows[0];
    const dto = await activateUsuario(db, target.idUsuario, {
      rut: "6371526-K", nomUsuario: "Nuevo", apellPatUsuario: "Nombre", apellMatUsuario: "Aca",
      idTipoUsuario: 1, telefonoUsuario: "999", direccionUsuario: "Nueva dir",
      emailUsuario: "re@serfel.cl", numUsuario: 20, password: "fresh1",
    }, SEED.idAdmin);
    expect(dto.idEstado).toBe(1);
    expect(dto.nomUsuario).toBe("Nuevo");
    expect(dto.idTipoUsuario).toBe(1);
  });
});

describe("updateUsuario", () => {
  it("updates fields and keeps password when omitted", async () => {
    const c = await createUsuario(db, { ...baseInput, rut: "15155155-1", emailUsuario: "u@serfel.cl", numUsuario: 31 }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error();
    const before = (await db.select().from(t10MUsuario).where(eq(t10MUsuario.idUsuario, c.dto.idUsuario)))[0];
    const dto = await updateUsuario(db, c.dto.idUsuario, {
      nomUsuario: "Cambiado", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
      idTipoUsuario: 2, telefonoUsuario: "1", direccionUsuario: "d", emailUsuario: "u@serfel.cl", numUsuario: 31,
    }, SEED.idAdmin);
    expect(dto.nomUsuario).toBe("Cambiado");
    const after = (await db.select().from(t10MUsuario).where(eq(t10MUsuario.idUsuario, c.dto.idUsuario)))[0];
    expect(after.password).toBe(before.password);
  });
});

describe("deactivateUsuario", () => {
  it("blocks deactivation when the user has a pending-payment venta", async () => {
    const c = await createUsuario(db, { ...baseInput, rut: "18000000-2", emailUsuario: "p@serfel.cl", numUsuario: 40 }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error();
    // minimal pedido + venta rows in id_estado=2 for this user
    await db.insert(t30MPedido).values({
      idPedido: 5001, fechaCreacion: "2026-01-01 00:00:00", idLocalCliente: 1, precioTotal: 0,
      idUsuario: c.dto.idUsuario, idListaPrecio: 1, idEstado: 2,
    } as any);
    await db.insert(t40MVenta).values({
      idListaPrecio: 1, idUsuarioVenta: c.dto.idUsuario, precioTotal: 0, numDoctoEmitido: 1,
      idTipoDoctoEmitido: 1, rutEmpresa: 1, rutCliente: 1, idLocalCliente: 1, idPedido: 5001,
      fechaVenta: "2026-01-01 00:00:00", idUsuarioMod: c.dto.idUsuario, ultFechaMod: "2026-01-01 00:00:00", idEstado: 2,
    } as any);
    await expect(deactivateUsuario(db, c.dto.idUsuario, SEED.idAdmin))
      .rejects.toMatchObject({ code: "USUARIO_CON_VENTAS_PENDIENTES" });
  });

  it("soft-deletes a user with no pending sales", async () => {
    const c = await createUsuario(db, { ...baseInput, rut: "19000000-7", emailUsuario: "q@serfel.cl", numUsuario: 41 }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error();
    const dto = await deactivateUsuario(db, c.dto.idUsuario, SEED.idAdmin);
    expect(dto.idEstado).toBe(0);
  });
});

describe("getUsuarioLookups", () => {
  it("returns tipos ordered by name", async () => {
    const lk = await getUsuarioLookups(db);
    expect(lk.tiposUsuario).toEqual([
      { id: 1, nombre: "Admin" },
      { id: 2, nombre: "Vendedor" },
    ]);
  });
});
```
Note: the exact required columns for the `t30MPedido` insert depend on the schema — open `packages/db/src/schema.ts` for `t30MPedido` and fill every `.notNull()` column without a default. The `as any` casts keep the test terse; adjust field names to the real Drizzle property names.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @serfel/lambda-usuarios exec vitest run tests/service.test.ts`
Expected: FAIL ("Cannot find module '../service'").

- [ ] **Step 4: Implement `service.ts`**

```ts
import { createHash } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import {
  t10MUsuario, t10PTipoUsuario, t30MPedido, t40MVenta, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO, formatRut, modulesForTipo, parseRut,
  type EstadoFilter, type MeDto, type UsuarioCreateInput, type UsuarioDto,
  type UsuarioLookupsDto, type UsuarioUpdateInput,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

/** Legacy stores hex_md5(password) computed client-side; reproduce it here. */
export function md5hex(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const dtoColumns = {
  idUsuario: t10MUsuario.idUsuario,
  rutUsuario: t10MUsuario.rutUsuario,
  dvUsuario: t10MUsuario.dvUsuario,
  nomUsuario: t10MUsuario.nomUsuario,
  apellPatUsuario: t10MUsuario.apellPatUsuario,
  apellMatUsuario: t10MUsuario.apellMatUsuario,
  idTipoUsuario: t10MUsuario.idTipoUsuario,
  nomTipoUsuario: t10PTipoUsuario.nomTipoUsuario,
  telefonoUsuario: t10MUsuario.telefonoUsuario,
  direccionUsuario: t10MUsuario.direccionUsuario,
  emailUsuario: t10MUsuario.emailUsuario,
  numUsuario: t10MUsuario.numUsuario,
  idEstado: t10MUsuario.idEstado,
};

type Row = {
  idUsuario: number; rutUsuario: number; dvUsuario: string; nomUsuario: string;
  apellPatUsuario: string; apellMatUsuario: string; idTipoUsuario: number;
  nomTipoUsuario: string; telefonoUsuario: string | null; direccionUsuario: string;
  emailUsuario: string | null; numUsuario: number; idEstado: number;
};

function toDto(r: Row): UsuarioDto {
  return {
    ...r,
    rut: formatRut(r.rutUsuario, r.dvUsuario),
    nombreCompleto: `${r.apellPatUsuario} ${r.apellMatUsuario} ${r.nomUsuario}`,
    tieneCognito: false,
  };
}

function usuarioQuery(db: DbOrTx) {
  return (db as Db)
    .select(dtoColumns)
    .from(t10MUsuario)
    .innerJoin(t10PTipoUsuario, eq(t10MUsuario.idTipoUsuario, t10PTipoUsuario.idTipoUsuario));
}

async function getDto(db: DbOrTx, id: number): Promise<UsuarioDto> {
  const rows = await usuarioQuery(db).where(eq(t10MUsuario.idUsuario, id));
  if (rows.length === 0) {
    throw new AppError("USUARIO_NO_ENCONTRADO", 404, `Usuario ${id} no existe`);
  }
  return toDto(rows[0]);
}

export async function getUsuarioLookups(db: Db): Promise<UsuarioLookupsDto> {
  const tiposUsuario = await db
    .select({ id: t10PTipoUsuario.idTipoUsuario, nombre: t10PTipoUsuario.nomTipoUsuario })
    .from(t10PTipoUsuario)
    .orderBy(asc(t10PTipoUsuario.nomTipoUsuario));
  return { tiposUsuario };
}

export async function listUsuarios(db: Db, estado: EstadoFilter): Promise<UsuarioDto[]> {
  const q = usuarioQuery(db);
  const rows = await (estado === "todos"
    ? q
    : q.where(eq(t10MUsuario.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO))
  ).orderBy(asc(t10MUsuario.apellPatUsuario));
  return rows.map(toDto);
}

/** RUT/num/email uniqueness. excludeId lets update/activate ignore self. */
async function assertUnique(
  tx: DbOrTx, rutUsuario: number, numUsuario: number | null,
  emailUsuario: string, excludeId: number | null
): Promise<void> {
  const rutClash = await (tx as Db).select({ id: t10MUsuario.idUsuario, estado: t10MUsuario.idEstado })
    .from(t10MUsuario).where(eq(t10MUsuario.rutUsuario, rutUsuario));
  // RUT collision is handled by the caller (create) via getByRut; here we only
  // guard num/email which can clash with a *different* user.
  const notSelf = (col: typeof t10MUsuario.numUsuario | typeof t10MUsuario.emailUsuario, val: number | string) =>
    excludeId === null ? eq(col as any, val) : and(eq(col as any, val), ne(t10MUsuario.idUsuario, excludeId));

  if (numUsuario !== null && numUsuario !== 0) {
    const clash = await (tx as Db).select({ id: t10MUsuario.idUsuario })
      .from(t10MUsuario).where(notSelf(t10MUsuario.numUsuario, numUsuario));
    if (clash.length > 0) throw new AppError("NUM_EN_USO", 409, `El número ${numUsuario} ya está en uso`);
  }
  const emailClash = await (tx as Db).select({ id: t10MUsuario.idUsuario })
    .from(t10MUsuario).where(notSelf(t10MUsuario.emailUsuario, emailUsuario));
  if (emailClash.length > 0) throw new AppError("EMAIL_EN_USO", 409, `El email ${emailUsuario} ya está en uso`);
  void rutClash;
}

export async function createUsuario(
  db: Db, input: UsuarioCreateInput, idUsuario: number
): Promise<{ kind: "created"; dto: UsuarioDto } | { kind: "inactive"; idUsuario: number }> {
  const parsed = parseRut(input.rut)!; // validated by Zod
  return db.transaction(async (tx) => {
    const existing = await (tx as Db).select({ id: t10MUsuario.idUsuario, estado: t10MUsuario.idEstado })
      .from(t10MUsuario).where(eq(t10MUsuario.rutUsuario, parsed.rut));
    if (existing.length > 0) {
      if (existing[0].estado === ESTADO_ACTIVO) {
        throw new AppError("RUT_EN_USO", 409, `El RUT ${input.rut} ya está registrado y activo`);
      }
      return { kind: "inactive" as const, idUsuario: existing[0].id };
    }
    await assertUnique(tx, parsed.rut, input.numUsuario, input.emailUsuario, null);
    const [header] = await tx.insert(t10MUsuario).values({
      rutUsuario: parsed.rut,
      dvUsuario: parsed.dv,
      nomUsuario: input.nomUsuario,
      apellPatUsuario: input.apellPatUsuario,
      apellMatUsuario: input.apellMatUsuario,
      password: md5hex(input.password),
      idTipoUsuario: input.idTipoUsuario,
      telefonoUsuario: input.telefonoUsuario,
      direccionUsuario: input.direccionUsuario,
      emailUsuario: input.emailUsuario,
      numUsuario: input.numUsuario ?? 0,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      idEstado: ESTADO_ACTIVO,
    });
    return { kind: "created" as const, dto: await getDto(tx, header.insertId) };
  });
}

export async function activateUsuario(
  db: Db, id: number, input: UsuarioCreateInput, idUsuario: number
): Promise<UsuarioDto> {
  const parsed = parseRut(input.rut)!;
  return db.transaction(async (tx) => {
    await getDto(tx, id); // 404 if missing
    await assertUnique(tx, parsed.rut, input.numUsuario, input.emailUsuario, id);
    await tx.update(t10MUsuario).set({
      nomUsuario: input.nomUsuario,
      apellPatUsuario: input.apellPatUsuario,
      apellMatUsuario: input.apellMatUsuario,
      password: md5hex(input.password),
      idTipoUsuario: input.idTipoUsuario,
      telefonoUsuario: input.telefonoUsuario,
      direccionUsuario: input.direccionUsuario,
      emailUsuario: input.emailUsuario,
      numUsuario: input.numUsuario ?? 0,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      idEstado: ESTADO_ACTIVO,
    }).where(eq(t10MUsuario.idUsuario, id));
    return getDto(tx, id);
  });
}

export async function updateUsuario(
  db: Db, id: number, input: UsuarioUpdateInput, idUsuario: number
): Promise<UsuarioDto> {
  return db.transaction(async (tx) => {
    await getDto(tx, id);
    await assertUnique(tx, 0, input.numUsuario, input.emailUsuario, id);
    await tx.update(t10MUsuario).set({
      nomUsuario: input.nomUsuario,
      apellPatUsuario: input.apellPatUsuario,
      apellMatUsuario: input.apellMatUsuario,
      idTipoUsuario: input.idTipoUsuario,
      telefonoUsuario: input.telefonoUsuario,
      direccionUsuario: input.direccionUsuario,
      emailUsuario: input.emailUsuario,
      numUsuario: input.numUsuario ?? 0,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      ...(input.password ? { password: md5hex(input.password) } : {}),
    }).where(eq(t10MUsuario.idUsuario, id));
    return getDto(tx, id);
  });
}

export async function deactivateUsuario(
  db: Db, id: number, idUsuario: number
): Promise<UsuarioDto> {
  return db.transaction(async (tx) => {
    const current = await getDto(tx, id);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    const pending = await (tx as Db)
      .select({ id: t40MVenta.idVenta })
      .from(t40MVenta)
      .innerJoin(t30MPedido, eq(t40MVenta.idPedido, t30MPedido.idPedido))
      .where(and(eq(t30MPedido.idUsuario, id), eq(t40MVenta.idEstado, 2)));
    if (pending.length > 0) {
      throw new AppError("USUARIO_CON_VENTAS_PENDIENTES", 409,
        "El usuario tiene ventas en proceso de pago y no puede eliminarse");
    }
    await tx.update(t10MUsuario).set({
      idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: nowDateTime(),
    }).where(eq(t10MUsuario.idUsuario, id));
    return getDto(tx, id);
  });
}

export async function getUsuarioForCognito(db: Db, id: number): Promise<{ email: string }> {
  const dto = await getDto(db, id);
  if (!dto.emailUsuario) {
    throw new AppError("USUARIO_SIN_EMAIL", 400, "El usuario no tiene email; no se puede crear en Cognito");
  }
  return { email: dto.emailUsuario };
}

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function getMe(db: Db, idUsuario: number): Promise<MeDto> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario, nomUsuario: t10MUsuario.nomUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  if (rows.length === 0) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no existe en el sistema");
  return { idUsuario, idTipoUsuario: rows[0].idTipoUsuario, nomUsuario: rows[0].nomUsuario, modulos: modulesForTipo(rows[0].idTipoUsuario) };
}
```
Note on `assertUnique(..., 0, ...)` in `updateUsuario`: passing `rutUsuario: 0` skips the RUT branch (there is none) — num/email are the only cross-user checks on update. Keep the `void rutClash` line or remove the unused query; simplest is to delete the `rutClash` query from `assertUnique` since callers own the RUT check. Do that cleanup when implementing.

- [ ] **Step 5: Run the service tests**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm --filter @serfel/lambda-usuarios exec vitest run tests/service.test.ts
```
Expected: PASS. Fix real column names for `t30MPedido`/`t40MVenta` inserts if any insert fails on a NOT NULL column.

- [ ] **Step 6: Commit**

```bash
git add lambdas/usuarios/service.ts lambdas/usuarios/tests
git commit -m "feat(usuarios): lambda service (CRUD, reactivate, deactivate guard) + tests"
```

---

## Task 5: Lambda `app.ts` (routing) + app tests

**Files:**
- Create: `lambdas/usuarios/app.ts`
- Create: `lambdas/usuarios/tests/app.test.ts`

**Interfaces:**
- Consumes: everything from Task 4; `AppDeps`/`AppEnv` from Task 3.
- Produces: `createApp(deps: AppDeps)` Hono app with routes:
  - `GET /api/me`, `GET /api/usuarios/lookups`, `GET /api/usuarios?estado=`
  - `POST /api/usuarios` (201 created, or 409 `RUT_INACTIVO` with `{ idUsuario }` body, or 409 `RUT_EN_USO`/`NUM_EN_USO`/`EMAIL_EN_USO`)
  - `PUT /api/usuarios/:id`, `POST /api/usuarios/:id/activate`, `POST /api/usuarios/:id/deactivate`, `POST /api/usuarios/:id/cognito`

- [ ] **Step 1: Write failing app tests**

Create `lambdas/usuarios/tests/app.test.ts` following `lambdas/products/tests/app.test.ts`. Instantiate `createApp` with stubbed deps (a fake `getDb`, `getIdUsuario: () => 1`, `listEnrolledIds: async () => new Set([1])`, `enrollCognito: async () => {}`), and assert:
```ts
// GET list merges tieneCognito from listEnrolledIds
// POST with an inactive-RUT-producing service returns 409 with body { error:{code:'RUT_INACTIVO'}, idUsuario }
// POST /:id/cognito calls enrollCognito with the user's email and returns 200
```
Use the products app.test.ts structure for wiring; mock the service module with `vi.mock("../service", ...)` so no DB is needed. Reference `lambdas/products/tests/app.test.ts` for the exact `vi.mock` + `app.request(...)` pattern.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @serfel/lambda-usuarios exec vitest run tests/app.test.ts`
Expected: FAIL ("Cannot find module '../app'").

- [ ] **Step 3: Implement `app.ts`**

```ts
import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema, UsuarioCreateSchema, UsuarioUpdateSchema, type ApiErrorBody,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { requireModule } from "./authz";
import {
  activateUsuario, createUsuario, deactivateUsuario, getMe, getUsuarioForCognito,
  getUsuarioLookups, listUsuarios, updateUsuario,
} from "./service";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new AppError("VALIDACION", 400, "id de usuario inválido");
  return id;
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
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)");
    c.set("idUsuario", idUsuario);
    await next();
  });

  const gate = requireModule("usuarios", deps);
  app.use("/usuarios", gate);
  app.use("/usuarios/*", gate);

  app.get("/me", async (c) => c.json(await getMe(await deps.getDb(), c.get("idUsuario"))));

  app.get("/usuarios/lookups", async (c) => c.json(await getUsuarioLookups(await deps.getDb())));

  app.get("/usuarios", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    const [rows, enrolled] = await Promise.all([
      listUsuarios(await deps.getDb(), parsed.data),
      deps.listEnrolledIds(),
    ]);
    return c.json(rows.map((r) => ({ ...r, tieneCognito: enrolled.has(r.idUsuario) })));
  });

  app.post("/usuarios", async (c) => {
    const input = await parseBody<import("@serfel/shared").UsuarioCreateInput>(c, UsuarioCreateSchema);
    const res = await createUsuario(await deps.getDb(), input, c.get("idUsuario"));
    if (res.kind === "inactive") {
      return c.json({ ...errorBody("RUT_INACTIVO", "El RUT existe pero está inactivo. ¿Deseas reactivarlo?"), idUsuario: res.idUsuario }, 409);
    }
    return c.json(res.dto, 201);
  });

  app.put("/usuarios/:id", async (c) => {
    const id = parseId(c);
    const input = await parseBody<import("@serfel/shared").UsuarioUpdateInput>(c, UsuarioUpdateSchema);
    return c.json(await updateUsuario(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.post("/usuarios/:id/activate", async (c) => {
    const id = parseId(c);
    const input = await parseBody<import("@serfel/shared").UsuarioCreateInput>(c, UsuarioCreateSchema);
    return c.json(await activateUsuario(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.post("/usuarios/:id/deactivate", async (c) => {
    const id = parseId(c);
    return c.json(await deactivateUsuario(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.post("/usuarios/:id/cognito", async (c) => {
    const id = parseId(c);
    const { email } = await getUsuarioForCognito(await deps.getDb(), id);
    await deps.enrollCognito(email, id);
    return c.json({ ok: true });
  });

  return app;
}
```

- [ ] **Step 4: Run app + full lambda tests**

Run:
```bash
pnpm --filter @serfel/lambda-usuarios exec vitest run
pnpm --filter @serfel/lambda-usuarios exec tsc --noEmit
```
Expected: PASS and clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add lambdas/usuarios/app.ts lambdas/usuarios/index.ts lambdas/usuarios/authz.ts lambdas/usuarios/cognito.ts lambdas/usuarios/errors.ts lambdas/usuarios/types.ts lambdas/usuarios/package.json lambdas/usuarios/tsconfig.json lambdas/usuarios/vitest.config.ts lambdas/usuarios/tests/app.test.ts
git commit -m "feat(usuarios): lambda routing (CRUD, activate, cognito enroll) + app tests"
```

---

## Task 6: Infra wiring (SST function, routes, Cognito IAM)

**Files:**
- Modify: `infra/auth.ts`
- Modify: `infra/api.ts`

**Interfaces:**
- Consumes: `userPoolId`, new `userPoolArn` from `auth.ts`.
- Produces: deployed `UsuariosFn` behind the JWT authorizer with `USER_POOL_ID` env and Cognito IAM.

- [ ] **Step 1: Export the pool ARN**

In `infra/auth.ts`, after `export const userPoolId = userPool.id;` add:
```ts
export const userPoolArn = userPool.arn;
```

- [ ] **Step 2: Add the function and routes in `infra/api.ts`**

Add to the imports at the top:
```ts
import { userPoolClientId, userPoolEndpoint, userPoolId, userPoolArn } from "./auth";
```
After the `rutasFn` definition, add:
```ts
const usuariosFn = new sst.aws.Function("UsuariosFn", {
  handler: "lambdas/usuarios/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: {
    DB_SECRET_ARN: dbSecretArn,
    USER_POOL_ID: userPoolId,
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] },
    { actions: ["cognito-idp:ListUsers", "cognito-idp:AdminCreateUser"], resources: [userPoolArn] },
  ],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-usuarios`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```
After the products route loop, add the usuarios routes:
```ts
const usuariosRoutes = [
  "GET /api/usuarios",
  "GET /api/usuarios/lookups",
  "POST /api/usuarios",
  "PUT /api/usuarios/{id}",
  "POST /api/usuarios/{id}/activate",
  "POST /api/usuarios/{id}/deactivate",
  "POST /api/usuarios/{id}/cognito",
] as const;
for (const route of usuariosRoutes) {
  api.route(route, usuariosFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}
```
Note: `GET /api/me` is already routed to `productsFn`; do not add a second `/api/me` route. The usuarios lambda's `/me` handler is only exercised in tests.

- [ ] **Step 3: Typecheck infra**

Run: `pnpm typecheck`
Expected: PASS (infra compiles; `nav.ts`/routes still pending Task 9 — scope with `pnpm --filter @serfel/frontend exec tsc -p tsconfig.app.json --noEmit` if needed, or proceed and let Task 9 close it).

- [ ] **Step 4: Commit**

```bash
git add infra/auth.ts infra/api.ts
git commit -m "feat(infra): deploy UsuariosFn with Cognito IAM + routes"
```

---

## Task 7: Frontend API service, logic (+spec), store

**Files:**
- Create: `apps/frontend/src/app/features/usuarios/usuarios-api.service.ts`
- Create: `apps/frontend/src/app/features/usuarios/usuarios-logic.ts`
- Create: `apps/frontend/src/app/features/usuarios/usuarios-logic.spec.ts`
- Create: `apps/frontend/src/app/features/usuarios/usuarios-store.ts`

**Interfaces:**
- Produces:
  - `UsuariosApi` with `list/lookups/create/update/activate/deactivate/enrollCognito`
  - logic: `Filters`, `SortKey`, `Sort`, `applyFilters`, `sortRows`, `paginate` (reused from productos shape), `toCsv`, `computeStats`
  - `UsuariosStore` (signals) + `apiError`, `rutInactivoId` helpers

- [ ] **Step 1: Write failing logic tests**

Create `apps/frontend/src/app/features/usuarios/usuarios-logic.spec.ts`:
```ts
import { describe, it, expect } from "vitest";
import { applyFilters, sortRows, computeStats, toCsv, type Filters } from "./usuarios-logic";
import type { UsuarioDto } from "@serfel/shared";

const u = (over: Partial<UsuarioDto>): UsuarioDto => ({
  idUsuario: 1, rutUsuario: 12345678, dvUsuario: "5", rut: "12345678-5",
  nomUsuario: "Juan", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
  nombreCompleto: "Perez Soto Juan", idTipoUsuario: 2, nomTipoUsuario: "Vendedor",
  telefonoUsuario: "1", direccionUsuario: "d", emailUsuario: "j@x.cl", numUsuario: 10,
  idEstado: 1, tieneCognito: false, ...over,
});

const EMPTY: Filters = { nombre: "", rut: "", idTipoUsuario: null, quick: "" };

describe("applyFilters", () => {
  it("matches by name tokens, rut, and tipo", () => {
    const rows = [u({}), u({ idUsuario: 2, nombreCompleto: "Gomez Diaz Ana", rut: "6371526-K", idTipoUsuario: 1 })];
    expect(applyFilters(rows, { ...EMPTY, nombre: "perez" }).map((r) => r.idUsuario)).toEqual([1]);
    expect(applyFilters(rows, { ...EMPTY, rut: "6371526" }).map((r) => r.idUsuario)).toEqual([2]);
    expect(applyFilters(rows, { ...EMPTY, idTipoUsuario: 1 }).map((r) => r.idUsuario)).toEqual([2]);
  });
});

describe("sortRows", () => {
  it("sorts by nombreCompleto ascending and descending", () => {
    const rows = [u({ idUsuario: 1, nombreCompleto: "B" }), u({ idUsuario: 2, nombreCompleto: "A" })];
    expect(sortRows(rows, { key: "nombreCompleto", asc: true }).map((r) => r.idUsuario)).toEqual([2, 1]);
    expect(sortRows(rows, { key: "nombreCompleto", asc: false }).map((r) => r.idUsuario)).toEqual([1, 2]);
  });
});

describe("computeStats", () => {
  it("counts users, tipos, and cognito", () => {
    const all = [u({ tieneCognito: true }), u({ idUsuario: 2, idTipoUsuario: 1, tieneCognito: false })];
    const s = computeStats(all, all);
    expect(s.total).toBe(2);
    expect(s.tipos).toBe(2);
    expect(s.conCognito).toBe(1);
    expect(s.filtrados).toBeNull();
  });
});

describe("toCsv", () => {
  it("emits a header and one row per user", () => {
    const csv = toCsv([u({})]);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("12345678-5");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/usuarios/usuarios-logic.spec.ts`
Expected: FAIL ("Cannot find module './usuarios-logic'").

- [ ] **Step 3: Implement `usuarios-logic.ts`**

Copy the structure of `productos-logic.ts` (reuse `normalizeSearch`, `matchesAllTokens`, `paginate` verbatim) and adapt:
```ts
import { ESTADO_ACTIVO, type UsuarioDto } from "@serfel/shared";

export interface Filters {
  nombre: string;
  rut: string;
  idTipoUsuario: number | null;
  quick: string;
}

export type SortKey = "rut" | "nombreCompleto" | "nomTipoUsuario" | "emailUsuario" | "numUsuario";
export interface Sort { key: SortKey; asc: boolean; }

function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).split(" ").filter(Boolean).every((t) => haystack.includes(t));
}

export function applyFilters(rows: UsuarioDto[], f: Filters): UsuarioDto[] {
  const nombre = f.nombre.trim();
  const rut = f.rut.trim().replace(/\./g, "");
  const quick = f.quick.trim();
  return rows.filter((r) => {
    if (nombre && !matchesAllTokens(r.nombreCompleto, nombre)) return false;
    if (rut && !r.rut.replace(/\./g, "").includes(rut)) return false;
    if (f.idTipoUsuario !== null && r.idTipoUsuario !== f.idTipoUsuario) return false;
    if (quick && !matchesAllTokens(r.nombreCompleto, quick) && !r.rut.includes(quick) &&
        !matchesAllTokens(r.emailUsuario ?? "", quick)) return false;
    return true;
  });
}

export function sortRows(rows: UsuarioDto[], s: Sort): UsuarioDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key]; const vb = b[s.key];
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb : String(va ?? "").localeCompare(String(vb ?? ""));
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

export function toCsv(rows: UsuarioDto[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["RUT", "Nombre", "Tipo", "Email", "Nº", "Cognito", "Estado"].map(esc).join(";");
  const lines = rows.map((r) => [
    r.rut, r.nombreCompleto, r.nomTipoUsuario, r.emailUsuario ?? "", r.numUsuario || "",
    r.tieneCognito ? "Sí" : "No", r.idEstado === ESTADO_ACTIVO ? "Activo" : "Inactivo",
  ].map(esc).join(";"));
  return [header, ...lines].join("\r\n");
}

export function computeStats(all: UsuarioDto[], filtered: UsuarioDto[]) {
  return {
    total: all.length,
    tipos: new Set(all.map((u) => u.idTipoUsuario)).size,
    conCognito: all.filter((u) => u.tieneCognito).length,
    filtrados: filtered.length === all.length ? null : filtered.length,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/usuarios/usuarios-logic.spec.ts`
Expected: PASS.

- [ ] **Step 5: Implement the API service**

Create `usuarios-api.service.ts`:
```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter, UsuarioCreateInput, UsuarioDto, UsuarioLookupsDto, UsuarioUpdateInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class UsuariosApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<UsuarioDto[]>(`${this.base}/usuarios`, { params: { estado } });
  }
  lookups() {
    return this.http.get<UsuarioLookupsDto>(`${this.base}/usuarios/lookups`);
  }
  create(input: UsuarioCreateInput) {
    return this.http.post<UsuarioDto>(`${this.base}/usuarios`, input);
  }
  update(id: number, input: UsuarioUpdateInput) {
    return this.http.put<UsuarioDto>(`${this.base}/usuarios/${id}`, input);
  }
  activate(id: number, input: UsuarioCreateInput) {
    return this.http.post<UsuarioDto>(`${this.base}/usuarios/${id}/activate`, input);
  }
  deactivate(id: number) {
    return this.http.post<UsuarioDto>(`${this.base}/usuarios/${id}/deactivate`, {});
  }
  enrollCognito(id: number) {
    return this.http.post<{ ok: true }>(`${this.base}/usuarios/${id}/cognito`, {});
  }
}
```

- [ ] **Step 6: Implement the store**

Create `usuarios-store.ts` mirroring `productos-store.ts`, plus a `rutInactivoId` helper:
```ts
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, UsuarioCreateInput, UsuarioDto, UsuarioLookupsDto, UsuarioUpdateInput,
} from "@serfel/shared";
import { UsuariosApi } from "./usuarios-api.service";
import { applyFilters, computeStats, paginate, sortRows, type Filters, type Sort, type SortKey } from "./usuarios-logic";

const EMPTY_FILTERS: Filters = { nombre: "", rut: "", idTipoUsuario: null, quick: "" };

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) return err.error.error as ApiErrorBody["error"];
  return null;
}
/** For a 409 RUT_INACTIVO, the body carries the existing user's id. */
export function rutInactivoId(err: unknown): number | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code === "RUT_INACTIVO") {
    const id = Number(err.error.idUsuario);
    return Number.isInteger(id) ? id : null;
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class UsuariosStore {
  private api = inject(UsuariosApi);

  readonly usuarios = signal<UsuarioDto[]>([]);
  readonly lookups = signal<UsuarioLookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "nombreCompleto", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() => sortRows(applyFilters(this.usuarios(), this.filters()), this.sort()));
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.usuarios(), this.filtered()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [usuarios, lookups] = await Promise.all([
        firstValueFrom(this.api.list(this.estadoFilter())),
        this.lookups() ? Promise.resolve(this.lookups()!) : firstValueFrom(this.api.lookups()),
      ]);
      this.usuarios.set(usuarios);
      this.lookups.set(lookups);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar los usuarios. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> { this.estadoFilter.set(estado); this.page.set(1); await this.load(); }
  setFilter(patch: Partial<Filters>): void { this.filters.update((f) => ({ ...f, ...patch })); this.page.set(1); }
  clearFilters(): void { this.filters.set(EMPTY_FILTERS); this.page.set(1); }
  toggleSort(key: SortKey): void { this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true })); }

  async create(input: UsuarioCreateInput): Promise<void> { await firstValueFrom(this.api.create(input)); await this.load(); }
  async update(id: number, input: UsuarioUpdateInput): Promise<void> { await firstValueFrom(this.api.update(id, input)); await this.load(); }
  async activate(id: number, input: UsuarioCreateInput): Promise<void> { await firstValueFrom(this.api.activate(id, input)); await this.load(); }
  async deactivate(id: number): Promise<void> { await firstValueFrom(this.api.deactivate(id)); await this.load(); }
  async enrollCognito(id: number): Promise<void> { await firstValueFrom(this.api.enrollCognito(id)); await this.load(); }
}
```

- [ ] **Step 7: Typecheck + tests, commit**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/usuarios/`
Expected: PASS.
```bash
git add apps/frontend/src/app/features/usuarios/usuarios-api.service.ts apps/frontend/src/app/features/usuarios/usuarios-logic.ts apps/frontend/src/app/features/usuarios/usuarios-logic.spec.ts apps/frontend/src/app/features/usuarios/usuarios-store.ts
git commit -m "feat(frontend): usuarios api service, logic + tests, signals store"
```

---

## Task 8: Frontend modal component

**Files:**
- Create: `apps/frontend/src/app/features/usuarios/usuario-modal.component.ts`

**Interfaces:**
- Consumes: `UsuarioLookupsDto`, `UsuarioDto`, `UsuarioCreateSchema`, `UsuarioUpdateSchema`, `parseRut`.
- Produces: `<app-usuario-modal>` emitting `save` (a `{ create?: UsuarioCreateInput; update?: UsuarioUpdateInput }`-shaped payload) and `cancel`; exposes `setServerError(field, message)`.

To keep the parent simple, the modal emits the raw validated payload plus a flag:

- [ ] **Step 1: Implement the modal**

Create `usuario-modal.component.ts`, mirroring `product-modal.component.ts` (reuse the same global CSS classes: `modal-bg`, `modal`, `form-grid`, `form-field`, `login-error`, `modal-footer`, `btn-cancel`, `btn-save`). Fields: RUT (text, disabled when editing), Nombres, Ap. Paterno, Ap. Materno, Tipo (select from `lookups.tiposUsuario`), Teléfono, Dirección, Email, Nº (number, optional), Password, Confirmar Password.

```ts
import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  UsuarioCreateSchema, UsuarioUpdateSchema, rutValido,
  type UsuarioCreateInput, type UsuarioDto, type UsuarioLookupsDto, type UsuarioUpdateInput,
} from "@serfel/shared";

interface FieldErrors {
  rut?: string; nombres?: string; apPat?: string; apMat?: string;
  telefono?: string; direccion?: string; email?: string; numero?: string; password?: string;
}
export type UsuarioSavePayload =
  | { mode: "create"; data: UsuarioCreateInput }
  | { mode: "update"; data: UsuarioUpdateInput };

@Component({
  selector: "app-usuario-modal",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ usuario ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="u-rut">RUT *</label>
            <input id="u-rut" type="text" placeholder="12345678-5" [(ngModel)]="rut" [disabled]="!!usuario" />
            @if (errors().rut; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-num">Nº (opcional)</label>
            <input id="u-num" type="number" [(ngModel)]="numero" />
            @if (errors().numero; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-nom">Nombres *</label>
            <input id="u-nom" type="text" [(ngModel)]="nombres" />
            @if (errors().nombres; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-pat">Apellido Paterno *</label>
            <input id="u-pat" type="text" [(ngModel)]="apPat" />
            @if (errors().apPat; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-mat">Apellido Materno *</label>
            <input id="u-mat" type="text" [(ngModel)]="apMat" />
            @if (errors().apMat; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-tipo">Tipo *</label>
            <select id="u-tipo" [(ngModel)]="idTipoUsuario">
              @for (t of lookups.tiposUsuario; track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
            </select>
          </div>
          <div class="form-field">
            <label for="u-fono">Teléfono *</label>
            <input id="u-fono" type="text" [(ngModel)]="telefono" />
            @if (errors().telefono; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="u-dir">Dirección *</label>
            <input id="u-dir" type="text" [(ngModel)]="direccion" />
            @if (errors().direccion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="u-email">Email *</label>
            <input id="u-email" type="email" [(ngModel)]="email" />
            @if (errors().email; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-pass">Contraseña {{ usuario ? '(dejar vacío para mantener)' : '*' }}</label>
            <input id="u-pass" type="password" [(ngModel)]="password" />
            @if (errors().password; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-pass2">Confirmar Contraseña {{ usuario ? '' : '*' }}</label>
            <input id="u-pass2" type="password" [(ngModel)]="password2" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Usuario' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UsuarioModalComponent implements OnInit {
  @Input() usuario: UsuarioDto | null = null;
  @Input({ required: true }) lookups!: UsuarioLookupsDto;
  @Output() save = new EventEmitter<UsuarioSavePayload>();
  @Output() cancel = new EventEmitter<void>();

  rut = ""; nombres = ""; apPat = ""; apMat = "";
  idTipoUsuario: number | null = null; telefono = ""; direccion = ""; email = "";
  numero: number | null = null; password = ""; password2 = "";

  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.usuario) {
      this.rut = this.usuario.rut;
      this.nombres = this.usuario.nomUsuario;
      this.apPat = this.usuario.apellPatUsuario;
      this.apMat = this.usuario.apellMatUsuario;
      this.idTipoUsuario = this.usuario.idTipoUsuario;
      this.telefono = this.usuario.telefonoUsuario ?? "";
      this.direccion = this.usuario.direccionUsuario;
      this.email = this.usuario.emailUsuario ?? "";
      this.numero = this.usuario.numUsuario || null;
    } else {
      this.idTipoUsuario = this.lookups.tiposUsuario[0]?.id ?? null;
    }
  }

  onSave(): void {
    // Frontend-only: confirm-password must match when a password is entered.
    if (this.password && this.password !== this.password2) {
      this.errors.set({ password: "Las contraseñas no coinciden" });
      return;
    }
    const common = {
      nomUsuario: this.nombres, apellPatUsuario: this.apPat, apellMatUsuario: this.apMat,
      idTipoUsuario: this.idTipoUsuario, telefonoUsuario: this.telefono,
      direccionUsuario: this.direccion, emailUsuario: this.email,
      numUsuario: this.numero === null || Number.isNaN(this.numero) ? null : this.numero,
    };
    if (this.usuario) {
      const parsed = UsuarioUpdateSchema.safeParse({ ...common, password: this.password || undefined });
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "update", data: parsed.data });
    } else {
      if (!rutValido(this.rut)) return this.errors.set({ rut: "RUT inválido (dígito verificador no coincide)" });
      const parsed = UsuarioCreateSchema.safeParse({ ...common, rut: this.rut, password: this.password });
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "create", data: parsed.data });
    }
  }

  private emit(p: UsuarioSavePayload): void {
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(p);
  }

  private applyErrors(issues: { path: (string | number)[]; message: string }[]): void {
    const e: FieldErrors = {};
    for (const i of issues) {
      const k = i.path[0];
      if (k === "rut") e.rut = i.message;
      else if (k === "nomUsuario") e.nombres = "Nombres es obligatorio";
      else if (k === "apellPatUsuario") e.apPat = "Apellido paterno es obligatorio";
      else if (k === "apellMatUsuario") e.apMat = "Apellido materno es obligatorio";
      else if (k === "telefonoUsuario") e.telefono = "Teléfono es obligatorio";
      else if (k === "direccionUsuario") e.direccion = "Dirección es obligatoria";
      else if (k === "emailUsuario") e.email = "Email inválido";
      else if (k === "numUsuario") e.numero = "Número inválido";
      else if (k === "password") e.password = "Mínimo 4 caracteres";
    }
    this.errors.set(e);
  }

  /** Called by the parent on a 409 from the API. */
  setServerError(code: "RUT_EN_USO" | "NUM_EN_USO" | "EMAIL_EN_USO", message: string): void {
    this.busy.set(false);
    if (code === "RUT_EN_USO") this.errors.set({ rut: message });
    else if (code === "NUM_EN_USO") this.errors.set({ numero: message });
    else this.errors.set({ email: message });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc -p tsconfig.app.json --noEmit` (or `pnpm --filter @serfel/frontend build` at Task 9).
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/features/usuarios/usuario-modal.component.ts
git commit -m "feat(frontend): usuario create/edit modal with RUT + confirm-password validation"
```

---

## Task 9: Frontend page, route, navbar entry

**Files:**
- Create: `apps/frontend/src/app/features/usuarios/usuarios-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`
- Modify: `apps/frontend/src/app/core/nav.ts`

**Interfaces:**
- Consumes: `UsuariosStore`, `UsuarioModalComponent`, `apiError`, `rutInactivoId`, logic helpers, `NavbarComponent`, `ToastComponent`/`ToastService`.
- Produces: `UsuariosPageComponent` routed at `/usuarios`.

- [ ] **Step 1: Add the nav entry**

In `apps/frontend/src/app/core/nav.ts`, add the `usuarios` key (the `Record<ModuleName, ...>` type now requires it):
```ts
export const NAV_ITEMS: Record<ModuleName, { label: string; path: string }> = {
  productos: { label: "Productos", path: "/productos" },
  rutas: { label: "Listado Carga", path: "/listado-carga" },
  usuarios: { label: "Usuarios", path: "/usuarios" },
};
```

- [ ] **Step 2: Add the route**

In `apps/frontend/src/app/app.routes.ts`, import the page and add a guarded route:
```ts
import { UsuariosPageComponent } from './features/usuarios/usuarios-page.component';
```
```ts
  { path: 'usuarios', component: UsuariosPageComponent, canActivate: [moduleGuard('usuarios')] },
```
(Insert alongside the other feature routes, before the `**` wildcard.)

- [ ] **Step 3: Implement the page**

Create `usuarios-page.component.ts` mirroring `productos-page.component.ts` (hero, stat cards, filter row, sortable table, pagination, modal host, toast). Table columns: RUT, Nombre completo, Tipo, Email, Nº, Cognito (badge + "Crear Cognito" button when `!tieneCognito` and active), Acciones (Editar/Eliminar or Restaurar).

```ts
import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { EstadoFilter, UsuarioDto } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { UsuariosStore, apiError, rutInactivoId } from "./usuarios-store";
import { UsuarioModalComponent, type UsuarioSavePayload } from "./usuario-modal.component";
import { toCsv, type SortKey } from "./usuarios-logic";

@Component({
  selector: "app-usuarios-page",
  standalone: true,
  imports: [FormsModule, NavbarComponent, UsuarioModalComponent, ToastComponent],
  template: `
    <app-navbar>
      <div class="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Buscar usuarios…"
               [ngModel]="store.filters().quick" (ngModelChange)="store.setFilter({ quick: $event })" />
      </div>
    </app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Usuarios</h1>
          <p>Gestiona usuarios del sistema y su acceso</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo Usuario
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div><div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div><div class="stat-lbl">Usuarios</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg></div>
          <div><div class="stat-num" style="color:#2563eb">{{ store.stats().tipos }}</div><div class="stat-lbl">Tipos</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg></div>
          <div><div class="stat-num" style="color:#059669">{{ store.stats().conCognito }}</div><div class="stat-lbl">Con Cognito</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
          <div><div class="stat-num" style="color:#d97706">{{ store.stats().filtrados ?? '—' }}</div><div class="stat-lbl">Filtrados</div></div></div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field"><label for="f-rut">RUT</label>
          <input id="f-rut" type="text" placeholder="12345678" style="width:150px"
                 [ngModel]="store.filters().rut" (ngModelChange)="store.setFilter({ rut: $event })" /></div>
        <div class="fd-field" style="flex:1"><label for="f-nom">Nombre</label>
          <input id="f-nom" type="text" placeholder="Buscar por nombre…"
                 [ngModel]="store.filters().nombre" (ngModelChange)="store.setFilter({ nombre: $event })" /></div>
        <div class="fd-field"><label for="f-tipo">Tipo</label>
          <select id="f-tipo" style="min-width:160px"
                  [ngModel]="store.filters().idTipoUsuario" (ngModelChange)="store.setFilter({ idTipoUsuario: $event })">
            <option [ngValue]="null">Todos los tipos</option>
            @for (t of store.lookups()?.tiposUsuario ?? []; track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
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
          {{ store.filtered().length }} usuario{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th (click)="store.toggleSort('rut')" [class.sorted]="store.sort().key === 'rut'">RUT <span class="sort-ind">{{ sortInd('rut') }}</span></th>
              <th (click)="store.toggleSort('nombreCompleto')" [class.sorted]="store.sort().key === 'nombreCompleto'">Nombre <span class="sort-ind">{{ sortInd('nombreCompleto') }}</span></th>
              <th (click)="store.toggleSort('nomTipoUsuario')" [class.sorted]="store.sort().key === 'nomTipoUsuario'">Tipo <span class="sort-ind">{{ sortInd('nomTipoUsuario') }}</span></th>
              <th (click)="store.toggleSort('emailUsuario')" [class.sorted]="store.sort().key === 'emailUsuario'">Email <span class="sort-ind">{{ sortInd('emailUsuario') }}</span></th>
              <th>Cognito</th>
              <th style="width:190px; text-align:center">Acciones</th>
            </tr></thead>
            <tbody>
              @for (u of store.paged().slice; track u.idUsuario) {
                <tr>
                  <td class="t-num">{{ u.rut }}</td>
                  <td class="t-name">{{ u.nombreCompleto }}</td>
                  <td class="t-muted">{{ u.nomTipoUsuario }}</td>
                  <td class="t-muted">{{ u.emailUsuario }}</td>
                  <td>
                    @if (u.tieneCognito) { <span class="um-badge">Sí</span> }
                    @else if (u.idEstado === 1) {
                      <button class="t-btn t-btn-edit" (click)="enroll(u)" title="Crear en Cognito">Crear Cognito</button>
                    } @else { <span class="t-muted">—</span> }
                  </td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (u.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(u)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(u)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg> Eliminar
                        </button>
                      } @else { <span class="t-muted">Inactivo</span> }
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
        <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No se encontraron usuarios</div><div class="empty-sub">Intenta con otros filtros</div></div>
      }
    </div>

    @if (modalOpen()) {
      <app-usuario-modal [usuario]="editing()" [lookups]="store.lookups()!"
        (save)="onSave($event)" (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class UsuariosPageComponent implements OnInit {
  readonly store = inject(UsuariosStore);
  private toasts = inject(ToastService);
  readonly modalOpen = signal(false);
  readonly editing = signal<UsuarioDto | null>(null);
  private modal = viewChild(UsuarioModalComponent);

  ngOnInit(): void { void this.store.load(); }

  sortInd(key: SortKey): string { const s = this.store.sort(); return s.key === key ? (s.asc ? "↑" : "↓") : "↕"; }
  goPage(n: number): void { this.store.page.set(n); }
  pageNumbers(): number[] {
    const total = this.store.paged().totalPages; const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6)); const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  setEstado(estado: EstadoFilter): void { void this.store.setEstado(estado); }

  openModal(u: UsuarioDto | null): void { if (!this.store.lookups()) return; this.editing.set(u); this.modalOpen.set(true); }

  async onSave(payload: UsuarioSavePayload): Promise<void> {
    const current = this.editing();
    try {
      if (payload.mode === "update" && current) {
        await this.store.update(current.idUsuario, payload.data);
        this.toasts.show("Usuario actualizado exitosamente");
      } else if (payload.mode === "create") {
        await this.store.create(payload.data);
        this.toasts.show("Usuario creado exitosamente");
      }
      this.modalOpen.set(false);
    } catch (err) {
      const inactiveId = rutInactivoId(err);
      if (inactiveId !== null && payload.mode === "create") {
        if (confirm("Este RUT existe pero está inactivo. ¿Deseas reactivarlo con estos datos?")) {
          try {
            await this.store.activate(inactiveId, payload.data);
            this.toasts.show("Usuario reactivado exitosamente");
            this.modalOpen.set(false);
          } catch (e2) {
            this.toasts.show(apiError(e2)?.message ?? "No se pudo reactivar", "error");
          }
        } else {
          this.modal()?.setServerError("RUT_EN_USO", "RUT inactivo");
        }
        return;
      }
      const known = apiError(err);
      if (known && (known.code === "RUT_EN_USO" || known.code === "NUM_EN_USO" || known.code === "EMAIL_EN_USO")) {
        this.modal()?.setServerError(known.code, known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? "Error al guardar el usuario", "error");
      }
    }
  }

  async enroll(u: UsuarioDto): Promise<void> {
    if (!confirm(`¿Crear el usuario de Cognito para ${u.nombreCompleto}? Se enviará una invitación a ${u.emailUsuario}.`)) return;
    try {
      await this.store.enrollCognito(u.idUsuario);
      this.toasts.show("Usuario de Cognito creado; invitación enviada");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "No se pudo crear en Cognito", "error");
    }
  }

  async confirmDelete(u: UsuarioDto): Promise<void> {
    if (!confirm(`¿Eliminar a "${u.nombreCompleto}"? Podrás restaurarlo desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(u.idUsuario);
      this.toasts.show("Usuario eliminado", "error");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "Error al eliminar", "error");
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "usuarios.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
}
```
Note: inactive rows have no "Restaurar" button here (unlike Productos) because reactivation of a user re-applies form data via the modal flow. If a plain restore is wanted later, add a `restore` that calls `activate` with the row's current values — out of scope for this plan.

- [ ] **Step 4: Build the frontend**

Run: `pnpm --filter @serfel/frontend build`
Expected: successful production build (this compiles templates and catches any binding/type errors).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/usuarios/usuarios-page.component.ts apps/frontend/src/app/app.routes.ts apps/frontend/src/app/core/nav.ts
git commit -m "feat(frontend): usuarios page, route, and navbar entry"
```

---

## Task 10: Legacy PHP — drop MAX(id)+1 (Distribuidor + Coproad)

**Files:**
- Modify: `legacy-php/Distribuidor/Clases/Usuario.php:161-182` (`obtNuevoIdUsuario`) and `:184-254` (`ingUsuario`)
- Modify: `legacy-php/Coproad/Clases/Usuario.php` (same two methods)

**Interfaces:**
- Produces: legacy `ingUsuario` relies on AUTO_INCREMENT instead of a precomputed id, returning `mysql_insert_id()`.

- [ ] **Step 1: Edit `legacy-php/Distribuidor/Clases/Usuario.php`**

Delete the `obtNuevoIdUsuario()` method (lines ~161-182). In `ingUsuario`, remove the `$idUsuario = $this->obtNuevoIdUsuario();` line and drop `id_usuario` from the INSERT. Change the INSERT so `id_usuario` is neither named nor valued:
```php
                    $query = "INSERT INTO 10_m_usuario (rut_usuario,
                                                        dv_usuario,
                                                        nom_usuario,
                                                        apell_pat_usuario,
                                                        apell_mat_usuario,
                                                        password,
                                                        id_tipo_usuario,
                                                        telefono_usuario,
                                                        direccion_usuario,
                                                        email_usuario,
                                                        num_usuario,
                                                        id_usuario_mod,
                                                        ult_fecha_mod)
                                VALUES (" . $rut[0] . ",
                                        '" . $rut[1] . "',
                                        '" . $nomUsu . "',
                                        '" . $apellPatUsu . "',
                                        '" . $apellMatUsu . "',
                                        '" . $passUsu . "',
                                        " . $idTipoUsu . ",
                                        '" . $fonoUsu . "',
                                        '" . $direUsu . "',
                                        '" . $emailUsu . "',
                                        " . $numero . ",
                                        " . $idUsuIng . ",
                                        NOW())";
                    mysql_query($query, $db) or die(mysql_error());
                    $idUsuario = mysql_insert_id($db);

                    mysql_close($db);
                    return $idUsuario;
```

- [ ] **Step 2: Apply the identical edit to `legacy-php/Coproad/Clases/Usuario.php`**

Make the same two changes (delete `obtNuevoIdUsuario`, rewrite the INSERT, return `mysql_insert_id`). Verify the Coproad copy's `ingUsuario` column list matches before editing — open the file and confirm the column names are identical to Distribuidor.

- [ ] **Step 3: Lint the PHP syntax**

Run:
```bash
php -l legacy-php/Distribuidor/Clases/Usuario.php
php -l legacy-php/Coproad/Clases/Usuario.php
```
Expected: "No syntax errors detected" for both. (If `php` is unavailable locally, visually confirm the INSERT column count equals the VALUES count in each file.)

- [ ] **Step 4: Commit**

```bash
git add legacy-php/Distribuidor/Clases/Usuario.php legacy-php/Coproad/Clases/Usuario.php
git commit -m "fix(legacy): use AUTO_INCREMENT for id_usuario in ingUsuario (Distribuidor + Coproad)"
```
Note: the legacy PHP Fargate images are not rebuilt in CI — rebuild per `legacy-php/README.md` when deploying these changes.

---

## Final verification (after all tasks)

- [ ] **Full test + typecheck**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm -r test
pnpm typecheck
pnpm --filter @serfel/frontend build
```
Expected: all green.

- [ ] **Deploy + smoke (dev)**

Per memory `sst-deploy-dev-gotchas`: `AWS_PROFILE=admin-christian` + Node 22 + `./scripts/sst-deploy.sh --stage dev`, then `pnpm db:migrate` **after** deploy (memory `migrate-lambda-bundles-migrations`). Manual browser smoke on the CloudFront URL: login → create user → verify legacy login works with the new user (rehosted PHP) → reactivate an inactive RUT → "Crear Cognito" and confirm the invite email + the button disappears on reload.

---

## Self-Review Notes (author)

- **Spec coverage:** RUT módulo-11 + unique (Task 2 schema + Task 4 create), num unique-when-nonzero (Task 4 `assertUnique`), email required + valid + unique (Task 2 schema + Task 4), required fields (Task 2 `usuarioBase`/`REQUIRED`), confirm-password frontend-only (Task 8 `onSave`), no Cognito at create + per-row button gated on presence (Tasks 5-6 + Task 9), reactivate-on-inactive confirm dialog (Tasks 4-5 + Task 9), md5 legacy compat (Task 4 `md5hex`), AUTO_INCREMENT + legacy PHP (Tasks 1 + 10), deactivate pending-payment guard (Task 4). All covered.
- **Type consistency:** `UsuarioCreateInput`/`UsuarioUpdateInput`, `UsuarioDto` (with `tieneCognito`), `UsuarioSavePayload`, error codes, and `AppDeps` (`listEnrolledIds`/`enrollCognito`) are used consistently across Tasks 2-9.
- **Known adjust-on-implement points (flagged inline):** exact NOT NULL columns for the `t30MPedido`/`t40MVenta` test inserts (Task 4 Step 2), and the removal of the unused `rutClash` query in `assertUnique` (Task 4 Step 4).
