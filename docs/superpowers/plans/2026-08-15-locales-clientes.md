# Locales de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CRUD management of a cliente's *locales* via a Locales tab in the cliente modal, and normalize *forma de pago* into its own `40_p_forma_pago` param table without breaking legacy business rules.

**Architecture:** A DB migration copies forma-de-pago rows (IDs 3-8) from `10_p_tipo_docto` into the existing-but-empty `40_p_forma_pago` (same IDs) and adds a FK on `10_m_local_cliente.id_forma_pago`. Locales CRUD is added to the existing `clientes` Hono lambda (locales are a child of cliente). The frontend gains a Locales tab inside the existing cliente modal, with an in-place full-width editor. Shared Zod schemas/DTOs are the single source of truth for validation.

**Tech Stack:** Drizzle ORM + MariaDB, Zod (`@serfel/shared`), Hono lambda (Node/TS), Angular 20 standalone components + signals, Vitest, SST v3 (`infra/api.ts`).

## Global Constraints

- Node >= 22; pnpm workspaces; run commands from repo root unless noted.
- Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` first.
- **Every new API route MUST be registered in `infra/api.ts`** — the gateway uses an explicit route array, not a catch-all; an unregistered route returns a CORS 404 in the browser.
- `id_local_cliente` becomes **AUTO_INCREMENT** in this work (Task 1). Never hand-assign it — insert without the column and read `ResultSetHeader.insertId`. The legacy `MAX(id)+1` is removed from both PHP apps (Task 1B).
- DB schema changes: edit `packages/db/src/schema.ts`, then `pnpm --filter @serfel/db generate` to produce a versioned migration in `packages/db/migrations/`.
- `ESTADO_ACTIVO = 1`, `ESTADO_INACTIVO = 0` (from `@serfel/shared`).
- Do not surface `comuna_local_cliente` in the new stack; write it in sync with `comuna` on every local insert/update so the live legacy rehost keeps working. Do NOT drop the column.
- Vendedores lookup = `10_m_usuario` where `id_estado = 1 AND id_tipo_usuario = 2`.
- forma_pago rows to migrate: `10_p_tipo_docto` IDs 3-8, preserving the same IDs.
- Commit after each task with a `feat:`/`test:` message.

---

## File Structure

- `packages/db/src/schema.ts` — add FK `loc_clie_forma_pago` to `t10MLocalCliente` + make `idLocalCliente` AUTO_INCREMENT.
- `packages/db/migrations/00NN_*.sql` — generated; hand-add the forma_pago seed INSERT before the FK ALTER, and wrap the AUTO_INCREMENT MODIFY in `FOREIGN_KEY_CHECKS=0`.
- `legacy-php/Distribuidor/Clases/LocalCliente.php` + `legacy-php/Coproad/Clases/LocalCliente.php` — drop the `MAX(id)+1` id assignment (Task 1B).
- `packages/shared/src/locales.ts` — **new**: `LocalCreateSchema`, `LocalUpdateSchema`, `LocalDto`, `LocalLookupsDto`.
- `packages/shared/src/index.ts` — export `./locales`.
- `packages/shared/src/locales.spec.ts` — **new**: schema tests.
- `lambdas/clientes/service.ts` — add `getLocalLookups`, `listLocales`, `createLocal`, `updateLocal`, `deactivateLocal`, `activateLocal`.
- `lambdas/clientes/app.ts` — add locales routes + `/locales/*` module gate.
- `lambdas/clientes/tests/helpers.ts` — seed `40_p_forma_pago` rows + a vendedor user.
- `lambdas/clientes/tests/service.test.ts` — locales service tests.
- `lambdas/clientes/tests/app.test.ts` — locales route smoke tests.
- `infra/api.ts` — register the 6 new routes.
- `apps/frontend/src/app/features/clientes/locales-api.service.ts` — **new**.
- `apps/frontend/src/app/features/clientes/locales-logic.ts` — **new** + `.spec.ts`.
- `apps/frontend/src/app/features/clientes/locales-store.ts` — **new**.
- `apps/frontend/src/app/features/clientes/local-form.component.ts` — **new**: full-width local editor.
- `apps/frontend/src/app/features/clientes/cliente-modal.component.ts` — add Datos/Locales tabs + list view hosting the editor.

---

## Task 1: DB migration — seed `40_p_forma_pago` + add local FK

**Files:**
- Modify: `packages/db/src/schema.ts:289-293` (the `t10MLocalCliente` constraint array)
- Create: `packages/db/migrations/00NN_*.sql` (generated, then hand-edited)

**Interfaces:**
- Produces: table `40_p_forma_pago` seeded with tipo_docto IDs 3-8; FK `loc_clie_forma_pago` on `10_m_local_cliente.id_forma_pago → 40_p_forma_pago.id_forma_pago`; `id_local_cliente` column is AUTO_INCREMENT.

- [ ] **Step 1: Add the FK + autoincrement to the schema**

In `packages/db/src/schema.ts`, change the `idLocalCliente` column definition (line ~265) to add `.autoincrement()`:

```ts
	idLocalCliente: int("id_local_cliente").autoincrement().notNull(),
```

Then in `t10MLocalCliente`'s constraint array (currently ends with `loc_clie_est`), add:

```ts
	foreignKey({ name: "loc_clie_forma_pago", columns: [table.idFormaPago], foreignColumns: [t40PFormaPago.idFormaPago] }).onDelete("restrict").onUpdate("restrict"),
```

Note: `t40PFormaPago` is declared at line ~150, before `t10MLocalCliente` (~264), so the eager reference resolves. Verify no reordering is needed.

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @serfel/db generate`
Expected: a new file `packages/db/migrations/00NN_<name>.sql` containing a `MODIFY COLUMN \`id_local_cliente\` ... AUTO_INCREMENT` statement and an `ADD CONSTRAINT \`loc_clie_forma_pago\`` statement, plus a new journal entry.

- [ ] **Step 3: Hand-edit the generated SQL (seed + FK-checks wrapper)**

Edit the generated `00NN_*.sql`:

a) **Before** the `ADD CONSTRAINT loc_clie_forma_pago` statement (the FK needs its parent rows first), insert the forma_pago seed:

```sql
INSERT INTO `40_p_forma_pago` (id_forma_pago, nom_forma_pago, desc_forma_pago)
SELECT id_tipo_docto, nom_tipo_docto, desc_tipo_docto
FROM `10_p_tipo_docto`
WHERE id_tipo_docto BETWEEN 3 AND 8
ON DUPLICATE KEY UPDATE nom_forma_pago = VALUES(nom_forma_pago), desc_forma_pago = VALUES(desc_forma_pago);
--> statement-breakpoint
```

b) **Wrap the AUTO_INCREMENT `MODIFY` statement** in a FK-checks guard — `10_m_local_cliente` is an FK parent (`ped_loc_clie`, venta, ruta_local_cliente), so a bare `MODIFY ... AUTO_INCREMENT` fails with errno 1834 on populated RDS. Turn the single MODIFY line into:

```sql
SET FOREIGN_KEY_CHECKS=0;
--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` MODIFY COLUMN `id_local_cliente` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS=1;
--> statement-breakpoint
```

(Use whatever exact column type drizzle emitted; only add the `SET FOREIGN_KEY_CHECKS` bookends around it.) Keep drizzle's `--> statement-breakpoint` separators. Leave `10_p_tipo_docto` and `60_m_pago`'s FK untouched.

- [ ] **Step 4: Verify the schema-only migration path still builds**

Run: `pnpm --filter @serfel/db build` (or `pnpm typecheck`)
Expected: PASS. This migration is a schema migration — it is NOT added to `SKIP_DATA_MIGRATIONS` in `packages/db/src/test-migrate.ts`, so it runs in tests. (In tests, `10_p_tipo_docto` has no rows 3-8 at migration time, so the INSERT seeds 0 rows; the AUTO_INCREMENT MODIFY and the FK ALTER still succeed because no local rows exist yet.)

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/migrations/
git commit -m "feat(db): forma_pago table + local FK + id_local_cliente autoincrement"
```

---

## Task 1B: Legacy PHP — drop the MAX+1 id assignment

**Files:**
- Modify: `legacy-php/Distribuidor/Clases/LocalCliente.php`
- Modify: `legacy-php/Coproad/Clases/LocalCliente.php`

**Interfaces:**
- Consumes: the AUTO_INCREMENT column from Task 1 (must be deployed first).
- Produces: `ingLocalCliente()` in both apps inserts without an explicit id and returns `mysql_insert_id()`.

> **Sequencing:** deploy Task 1's migration to the target DB **before** shipping this change — otherwise the NOT NULL column has no default and inserts fail. The edits are identical in both files (they are near-duplicate copies).

- [ ] **Step 1: Remove the explicit id from the INSERT (both files)**

In each `Clases/LocalCliente.php`, in `ingLocalCliente()`'s `INSERT INTO 10_m_local_cliente (...)`:
- Delete `id_local_cliente,` from the column list (the first column).
- Delete the corresponding first VALUES entry `" . $idLocalCliente . ",` so the remaining values line up with `rut_cliente` onward.

- [ ] **Step 2: Replace the id source with `mysql_insert_id` (both files)**

- Delete the line `$idLocalCliente = $this->obtNuevoIdLocalCliente();`.
- After the insert `mysql_query($query, $db) or die(mysql_error());`, add before `mysql_close($db);`:

```php
                $idLocalCliente = mysql_insert_id($db);
```

The existing `return $idLocalCliente;` then returns the DB-assigned id (still `>0`, preserving the documented `>0 = success` contract).

- [ ] **Step 3: Remove the now-unused `obtNuevoIdLocalCliente()` method (both files)**

Delete the `private function obtNuevoIdLocalCliente() { ... }` method (the block containing `SELECT (MAX(id_local_cliente) + 1)`).

- [ ] **Step 4: PHP lint both files**

Run: `php -l legacy-php/Distribuidor/Clases/LocalCliente.php && php -l legacy-php/Coproad/Clases/LocalCliente.php`
Expected: `No syntax errors detected` for both. (If `php` is unavailable locally, visually verify brace balance.)

- [ ] **Step 5: Commit**

```bash
git add legacy-php/Distribuidor/Clases/LocalCliente.php legacy-php/Coproad/Clases/LocalCliente.php
git commit -m "refactor(legacy): let DB auto-assign id_local_cliente (drop MAX+1)"
```

> **Deploy note:** these live in the PHP 5.6 Fargate rehost images, which are NOT built in CI. Rebuild + redeploy both images manually per `legacy-php/README.md` once the DB migration (Task 1) is live. This is a deploy-time action, not part of the code verification in Task 13.

---

## Task 2: Shared contracts — `locales.ts`

**Files:**
- Create: `packages/shared/src/locales.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/locales.spec.ts`

**Interfaces:**
- Produces:
  - `LocalCreateSchema` / `LocalCreateInput` — `{ rutCliente, ...localBase }`
  - `LocalUpdateSchema` / `LocalUpdateInput` — `{ ...localBase }`
  - `LocalDto` (fields below)
  - `LocalLookupsDto` = `{ formasPago: { id: number; nombre: string }[]; vendedores: { id: number; nombre: string }[] }`

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/locales.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LocalCreateSchema, LocalUpdateSchema } from "./locales";

const validBase = {
  nombre: "Local Centro",
  telefono: "912345678",
  direccion: "Av. Principal 123",
  comuna: "Santiago",
  email: "local@test.cl",
  giro: "Provisiones",
  nomContacto: "Juan",
  apellPatContacto: "Perez",
  apellMatContacto: "Soto",
  telefonoContacto: "998877665",
  emailContacto: "juan@test.cl",
  topeVenta: 0,
  topeCredito: 0,
  idVendedor: 5,
  idFormaPago: 7,
  observaciones: "",
  permiteVentaTopeMensual: false,
};

describe("LocalCreateSchema", () => {
  it("accepts a valid local with rutCliente", () => {
    const r = LocalCreateSchema.safeParse({ ...validBase, rutCliente: 12345678 });
    expect(r.success).toBe(true);
  });
  it("rejects empty nombre", () => {
    const r = LocalCreateSchema.safeParse({ ...validBase, rutCliente: 1, nombre: "" });
    expect(r.success).toBe(false);
  });
  it("rejects a bad email", () => {
    const r = LocalCreateSchema.safeParse({ ...validBase, rutCliente: 1, email: "nope" });
    expect(r.success).toBe(false);
  });
  it("coerces optional blanks to defaults on update", () => {
    const r = LocalUpdateSchema.safeParse({ ...validBase, giro: undefined });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.giro).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/shared exec vitest run src/locales.spec.ts`
Expected: FAIL — cannot resolve `./locales`.

- [ ] **Step 3: Create the schema module**

Create `packages/shared/src/locales.ts`:

```ts
import { z } from "zod";

const REQUIRED = (max: number) => z.string().trim().min(1).max(max);
const OPTTEXT = (max: number) => z.string().trim().max(max);

/** Fields common to create and update (everything except rutCliente / id). */
const localBase = {
  nombre: REQUIRED(30),
  telefono: z.string().trim().max(15).nullable().default(null),
  direccion: REQUIRED(200),
  comuna: OPTTEXT(20).default(""),
  email: z.string().trim().email().max(50).nullable().default(null),
  giro: OPTTEXT(30).default(""),
  nomContacto: OPTTEXT(50).default(""),
  apellPatContacto: OPTTEXT(30).default(""),
  apellMatContacto: OPTTEXT(30).default(""),
  telefonoContacto: z.string().trim().max(15).nullable().default(null),
  emailContacto: z.string().trim().email().max(50).nullable().default(null),
  topeVenta: z.number().int().min(0).default(0),
  topeCredito: z.number().int().min(0).default(0),
  idVendedor: z.number().int().positive(),
  idFormaPago: z.number().int().positive(),
  observaciones: OPTTEXT(200).default(""),
  permiteVentaTopeMensual: z.boolean().default(false),
};

export const LocalCreateSchema = z.object({
  rutCliente: z.number().int().positive(),
  ...localBase,
});
export type LocalCreateInput = z.infer<typeof LocalCreateSchema>;

export const LocalUpdateSchema = z.object({ ...localBase });
export type LocalUpdateInput = z.infer<typeof LocalUpdateSchema>;

export interface LocalDto {
  idLocalCliente: number;
  rutCliente: number;
  nombre: string;
  telefono: string | null;
  direccion: string;
  comuna: string;
  email: string | null;
  giro: string;
  nomContacto: string;
  apellPatContacto: string;
  apellMatContacto: string;
  telefonoContacto: string | null;
  emailContacto: string | null;
  topeVenta: number;
  topeCredito: number;
  idVendedor: number;
  nomVendedor: string | null;
  idFormaPago: number;
  nomFormaPago: string | null;
  observaciones: string;
  permiteVentaTopeMensual: boolean;
  idEstado: number;
}

export interface LocalLookupsDto {
  formasPago: { id: number; nombre: string }[];
  vendedores: { id: number; nombre: string }[];
}
```

- [ ] **Step 4: Export from index and re-run tests**

Add to `packages/shared/src/index.ts`:

```ts
export * from "./locales";
```

Run: `pnpm --filter @serfel/shared exec vitest run src/locales.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/locales.ts packages/shared/src/locales.spec.ts packages/shared/src/index.ts
git commit -m "feat(shared): local cliente schemas and DTOs"
```

---

## Task 3: Test helper — seed forma_pago + vendedor

**Files:**
- Modify: `lambdas/clientes/tests/helpers.ts`

**Interfaces:**
- Consumes: `t40PFormaPago`, `t10MUsuario` from `@serfel/db`.
- Produces: `SEED.idFormaPago = 7`, `SEED.idVendedor` (a user with `idTipoUsuario = 2`, active); `40_p_forma_pago` has a row with id 7; used by Tasks 4-7.

- [ ] **Step 1: Import the forma_pago table**

In `lambdas/clientes/tests/helpers.ts`, add `t40PFormaPago` to the `@serfel/db` import list (line ~3-8).

- [ ] **Step 2: Add SEED entries**

In the `SEED` object add:

```ts
  idFormaPago: 7,
  idVendedor: 30, // active user, id_tipo_usuario = 2 (Vendedor)
```

- [ ] **Step 3: Seed a forma_pago row and a vendedor user**

After the `t40MListaPrecio` insert (line ~55-58), add:

```ts
  await db.insert(t40PFormaPago).values({
    idFormaPago: SEED.idFormaPago, nomFormaPago: "CREDITO", descFormaPago: "Pago a crédito",
  });
```

After the existing admin-user insert (line ~49-54), add a vendedor user:

```ts
  await db.insert(t10MUsuario).values([{
    idUsuario: SEED.idVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vera",
    apellPatUsuario: "Vendedora", apellMatUsuario: "Test", password: "seed", idTipoUsuario: SEED.tipoVendedor,
    telefonoUsuario: "2", direccionUsuario: "-", emailUsuario: "vera@serfel.cl", numUsuario: 0,
    idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  }]);
```

- [ ] **Step 4: Verify existing tests still pass**

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait` then
`pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: PASS (existing cliente tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/tests/helpers.ts
git commit -m "test(clientes): seed forma_pago and vendedor for locales tests"
```

---

## Task 4: Lambda — `getLocalLookups` + `listLocales`

**Files:**
- Modify: `lambdas/clientes/service.ts`
- Test: `lambdas/clientes/tests/service.test.ts`

**Interfaces:**
- Consumes: `t10MLocalCliente`, `t40PFormaPago`, `t10MUsuario` from `@serfel/db`; `LocalDto`, `LocalLookupsDto`, `EstadoFilter`, `ESTADO_ACTIVO`, `ESTADO_INACTIVO` from `@serfel/shared`.
- Produces:
  - `getLocalLookups(db: Db): Promise<LocalLookupsDto>`
  - `listLocales(db: Db, rutCliente: number, estado: EstadoFilter): Promise<LocalDto[]>`
  - `localToDto(row): LocalDto` (internal), `localDtoColumns` (internal)

- [ ] **Step 1: Write the failing test**

Add to `lambdas/clientes/tests/service.test.ts` (a new `describe` block; import `getLocalLookups`, `listLocales`, `createLocal` from `../service` and `t10MLocalCliente` from `@serfel/db`):

```ts
describe("locales lookups + list", () => {
  it("getLocalLookups returns forma_pago and vendedores (only tipo 2 & activos)", async () => {
    const lk = await getLocalLookups(db);
    expect(lk.formasPago.map((f) => f.id)).toContain(SEED.idFormaPago);
    expect(lk.vendedores.map((v) => v.id)).toContain(SEED.idVendedor);
    // admin (tipo 1) must NOT be listed as a vendedor
    expect(lk.vendedores.map((v) => v.id)).not.toContain(SEED.idAdmin);
  });

  it("listLocales returns the seeded local for the client with joins", async () => {
    const rows = await listLocales(db, SEED.rutClienteConVenta, "activos");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].idLocalCliente).toBe(SEED.idLocalConVenta);
    expect(rows[0].nombre).toBe("Local Principal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts -t "locales lookups"`
Expected: FAIL — `getLocalLookups` / `listLocales` not exported.

- [ ] **Step 3: Implement lookups + list in service.ts**

Add imports to `lambdas/clientes/service.ts` (extend the `@serfel/db` and `@serfel/shared` import lists): `t40PFormaPago`, and `type LocalDto, type LocalLookupsDto, type LocalCreateInput, type LocalUpdateInput`. Then add:

```ts
const localDtoColumns = {
  idLocalCliente: t10MLocalCliente.idLocalCliente,
  rutCliente: t10MLocalCliente.rutCliente,
  nombre: t10MLocalCliente.nomLocalCliente,
  telefono: t10MLocalCliente.telefonoLocalCliente,
  direccion: t10MLocalCliente.direccionLocalCliente,
  comuna: t10MLocalCliente.comuna,
  email: t10MLocalCliente.emailLocalCliente,
  giro: t10MLocalCliente.giro,
  nomContacto: t10MLocalCliente.nomContacto,
  apellPatContacto: t10MLocalCliente.apellPatContacto,
  apellMatContacto: t10MLocalCliente.apellMatContacto,
  telefonoContacto: t10MLocalCliente.telefonoContacto,
  emailContacto: t10MLocalCliente.emailContacto,
  topeVenta: t10MLocalCliente.topeVenta,
  topeCredito: t10MLocalCliente.topeCredito,
  idVendedor: t10MLocalCliente.idVendedor,
  nomVendedor: t10MUsuario.nomUsuario,
  idFormaPago: t10MLocalCliente.idFormaPago,
  nomFormaPago: t40PFormaPago.nomFormaPago,
  observaciones: t10MLocalCliente.observaciones,
  permiteVentaTopeMensual: t10MLocalCliente.permiteVentaTopeMensual,
  idEstado: t10MLocalCliente.idEstado,
};

function localToDto(r: Record<string, unknown>): LocalDto {
  return {
    ...(r as Omit<LocalDto, "permiteVentaTopeMensual" | "giro" | "comuna" | "observaciones" | "nomContacto" | "apellPatContacto" | "apellMatContacto">),
    giro: (r.giro as string | null) ?? "",
    comuna: (r.comuna as string | null) ?? "",
    observaciones: (r.observaciones as string | null) ?? "",
    nomContacto: (r.nomContacto as string | null) ?? "",
    apellPatContacto: (r.apellPatContacto as string | null) ?? "",
    apellMatContacto: (r.apellMatContacto as string | null) ?? "",
    permiteVentaTopeMensual: (r.permiteVentaTopeMensual as number) === 1,
  } as LocalDto;
}

function localQuery(db: DbOrTx) {
  return (db as Db)
    .select(localDtoColumns)
    .from(t10MLocalCliente)
    .leftJoin(t40PFormaPago, eq(t10MLocalCliente.idFormaPago, t40PFormaPago.idFormaPago))
    .leftJoin(t10MUsuario, eq(t10MLocalCliente.idVendedor, t10MUsuario.idUsuario));
}

export async function getLocalLookups(db: Db): Promise<LocalLookupsDto> {
  const formasPago = await db
    .select({ id: t40PFormaPago.idFormaPago, nombre: t40PFormaPago.nomFormaPago })
    .from(t40PFormaPago)
    .orderBy(asc(t40PFormaPago.nomFormaPago));
  const vendedorRows = await db
    .select({
      id: t10MUsuario.idUsuario, nom: t10MUsuario.nomUsuario,
      apPat: t10MUsuario.apellPatUsuario, apMat: t10MUsuario.apellMatUsuario,
    })
    .from(t10MUsuario)
    .where(and(eq(t10MUsuario.idEstado, ESTADO_ACTIVO), eq(t10MUsuario.idTipoUsuario, 2)))
    .orderBy(asc(t10MUsuario.nomUsuario));
  const vendedores = vendedorRows.map((v) => ({
    id: v.id, nombre: `${v.nom} ${v.apPat} ${v.apMat}`.trim(),
  }));
  return { formasPago, vendedores };
}

export async function listLocales(db: Db, rutCliente: number, estado: EstadoFilter): Promise<LocalDto[]> {
  const base = localQuery(db).where(
    estado === "todos"
      ? eq(t10MLocalCliente.rutCliente, rutCliente)
      : and(
          eq(t10MLocalCliente.rutCliente, rutCliente),
          eq(t10MLocalCliente.idEstado, estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO),
        ),
  );
  const rows = await base.orderBy(asc(t10MLocalCliente.nomLocalCliente));
  return rows.map((r) => localToDto(r as Record<string, unknown>));
}
```

Note: `t10MUsuario` is already imported in `service.ts`. `ESTADO_ACTIVO`/`ESTADO_INACTIVO` are already imported.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts -t "locales lookups"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/service.ts lambdas/clientes/tests/service.test.ts
git commit -m "feat(clientes): local lookups and list service"
```

---

## Task 5: Lambda — `createLocal` (MAX+1 id, comuna sync)

**Files:**
- Modify: `lambdas/clientes/service.ts`
- Test: `lambdas/clientes/tests/service.test.ts`

**Interfaces:**
- Consumes: `LocalCreateInput`, `getRow`-style helpers.
- Produces: `createLocal(db: Db, input: LocalCreateInput, idUsuario: number): Promise<LocalDto>`; internal `getLocalDto(db, id)` and `localWriteValues(input, idUsuario)`.

- [ ] **Step 1: Write the failing test**

Add to `service.test.ts`:

```ts
describe("createLocal", () => {
  it("auto-assigns the id, writes comuna to both columns, returns the DTO", async () => {
    const input = {
      rutCliente: SEED.rutClienteConVenta, nombre: "Sucursal Norte",
      telefono: "911112222", direccion: "Calle 9 #9", comuna: "Quilpue",
      email: null, giro: "Kiosko", nomContacto: "Ana", apellPatContacto: "Rojas",
      apellMatContacto: "Diaz", telefonoContacto: null, emailContacto: null,
      topeVenta: 0, topeCredito: 0, idVendedor: SEED.idVendedor,
      idFormaPago: SEED.idFormaPago, observaciones: "", permiteVentaTopeMensual: false,
    };
    const dto = await createLocal(db, input, SEED.idAdmin);
    // seeded row has explicit id 10, so the auto-increment counter yields 11 next
    expect(dto.idLocalCliente).toBe(SEED.idLocalConVenta + 1);
    expect(dto.nombre).toBe("Sucursal Norte");
    expect(dto.comuna).toBe("Quilpue");
    expect(dto.nomFormaPago).toBe("CREDITO");
    // legacy column kept in sync
    const raw = await db.select({ c: t10MLocalCliente.comunaLocalCliente })
      .from(t10MLocalCliente).where(eq(t10MLocalCliente.idLocalCliente, dto.idLocalCliente));
    expect(raw[0].c).toBe("Quilpue");
  });
});
```

(Ensure `eq` and `t10MLocalCliente` are imported in the test file; `service.test.ts` likely imports drizzle helpers already — add if missing.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts -t "createLocal"`
Expected: FAIL — `createLocal` not exported.

- [ ] **Step 3: Implement createLocal**

Add to `service.ts`:

```ts
function localWriteValues(input: LocalUpdateInput, idUsuario: number) {
  return {
    nomLocalCliente: input.nombre,
    telefonoLocalCliente: input.telefono,
    direccionLocalCliente: input.direccion,
    comuna: input.comuna,
    comunaLocalCliente: input.comuna, // keep legacy column in sync
    emailLocalCliente: input.email,
    giro: input.giro,
    nomContacto: input.nomContacto,
    apellPatContacto: input.apellPatContacto,
    apellMatContacto: input.apellMatContacto,
    telefonoContacto: input.telefonoContacto,
    emailContacto: input.emailContacto,
    topeVenta: input.topeVenta,
    topeCredito: input.topeCredito,
    idVendedor: input.idVendedor,
    idFormaPago: input.idFormaPago,
    observaciones: input.observaciones,
    permiteVentaTopeMensual: input.permiteVentaTopeMensual ? 1 : 0,
    idUsuarioMod: idUsuario,
    ultFechaMod: nowDateTime(),
  };
}

async function getLocalDto(db: DbOrTx, id: number): Promise<LocalDto> {
  const rows = await localQuery(db).where(eq(t10MLocalCliente.idLocalCliente, id));
  if (rows.length === 0) throw new AppError("LOCAL_NO_ENCONTRADO", 404, `Local ${id} no existe`);
  return localToDto(rows[0] as Record<string, unknown>);
}

export async function createLocal(db: Db, input: LocalCreateInput, idUsuario: number): Promise<LocalDto> {
  return db.transaction(async (tx) => {
    // Verify the parent cliente exists (FK + clearer error).
    await getRow(tx, input.rutCliente);
    // id_local_cliente is AUTO_INCREMENT — insert without it and read insertId
    // from mysql2's ResultSetHeader (same pattern as lambdas/products/service.ts:193).
    const [header] = await tx.insert(t10MLocalCliente).values({
      rutCliente: input.rutCliente,
      ...localWriteValues(input, idUsuario), idEstado: ESTADO_ACTIVO,
    });
    return getLocalDto(tx, header.insertId);
  });
}
```

Add `"LOCAL_NO_ENCONTRADO"` to the error-code union in `lambdas/clientes/errors.ts` (find the `AppErrorCode` / code type and add the literal).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts -t "createLocal"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/service.ts lambdas/clientes/errors.ts lambdas/clientes/tests/service.test.ts
git commit -m "feat(clientes): create local with MAX+1 id and comuna sync"
```

---

## Task 6: Lambda — `updateLocal`, `deactivateLocal`, `activateLocal`

**Files:**
- Modify: `lambdas/clientes/service.ts`
- Test: `lambdas/clientes/tests/service.test.ts`

**Interfaces:**
- Produces:
  - `updateLocal(db: Db, id: number, input: LocalUpdateInput, idUsuario: number): Promise<LocalDto>`
  - `deactivateLocal(db: Db, id: number, idUsuario: number): Promise<LocalDto>`
  - `activateLocal(db: Db, id: number, input: LocalUpdateInput, idUsuario: number): Promise<LocalDto>`

- [ ] **Step 1: Write the failing test**

Add to `service.test.ts`:

```ts
describe("update/deactivate/activate local", () => {
  it("updates fields and syncs comuna", async () => {
    const dto = await updateLocal(db, SEED.idLocalConVenta, {
      nombre: "Local Renombrado", telefono: null, direccion: "Nueva Dir 1",
      comuna: "Concon", email: null, giro: "", nomContacto: "", apellPatContacto: "",
      apellMatContacto: "", telefonoContacto: null, emailContacto: null,
      topeVenta: 0, topeCredito: 0, idVendedor: SEED.idVendedor,
      idFormaPago: SEED.idFormaPago, observaciones: "", permiteVentaTopeMensual: true,
    }, SEED.idAdmin);
    expect(dto.nombre).toBe("Local Renombrado");
    expect(dto.comuna).toBe("Concon");
    expect(dto.permiteVentaTopeMensual).toBe(true);
  });

  it("deactivate then activate flips id_estado", async () => {
    const off = await deactivateLocal(db, SEED.idLocalConVenta, SEED.idAdmin);
    expect(off.idEstado).toBe(0);
    const on = await activateLocal(db, SEED.idLocalConVenta, {
      nombre: off.nombre, telefono: off.telefono, direccion: off.direccion,
      comuna: off.comuna, email: off.email, giro: off.giro, nomContacto: off.nomContacto,
      apellPatContacto: off.apellPatContacto, apellMatContacto: off.apellMatContacto,
      telefonoContacto: off.telefonoContacto, emailContacto: off.emailContacto,
      topeVenta: off.topeVenta, topeCredito: off.topeCredito, idVendedor: off.idVendedor,
      idFormaPago: off.idFormaPago, observaciones: off.observaciones,
      permiteVentaTopeMensual: off.permiteVentaTopeMensual,
    }, SEED.idAdmin);
    expect(on.idEstado).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts -t "update/deactivate/activate local"`
Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement the three functions**

Add to `service.ts`:

```ts
export async function updateLocal(db: Db, id: number, input: LocalUpdateInput, idUsuario: number): Promise<LocalDto> {
  return db.transaction(async (tx) => {
    await getLocalDto(tx, id); // 404 if missing
    await tx.update(t10MLocalCliente).set(localWriteValues(input, idUsuario))
      .where(eq(t10MLocalCliente.idLocalCliente, id));
    return getLocalDto(tx, id);
  });
}

export async function deactivateLocal(db: Db, id: number, idUsuario: number): Promise<LocalDto> {
  return db.transaction(async (tx) => {
    const current = await getLocalDto(tx, id);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx.update(t10MLocalCliente)
      .set({ idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: nowDateTime() })
      .where(eq(t10MLocalCliente.idLocalCliente, id));
    return getLocalDto(tx, id);
  });
}

export async function activateLocal(db: Db, id: number, input: LocalUpdateInput, idUsuario: number): Promise<LocalDto> {
  return db.transaction(async (tx) => {
    await getLocalDto(tx, id);
    await tx.update(t10MLocalCliente)
      .set({ ...localWriteValues(input, idUsuario), idEstado: ESTADO_ACTIVO })
      .where(eq(t10MLocalCliente.idLocalCliente, id));
    return getLocalDto(tx, id);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts -t "update/deactivate/activate local"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/service.ts lambdas/clientes/tests/service.test.ts
git commit -m "feat(clientes): update/deactivate/activate local service"
```

---

## Task 7: Lambda — routes in `app.ts` + module gate

**Files:**
- Modify: `lambdas/clientes/app.ts`
- Test: `lambdas/clientes/tests/app.test.ts`

**Interfaces:**
- Consumes: `LocalCreateSchema`, `LocalUpdateSchema`, `EstadoFilterSchema` (already imported), and the Task 4-6 service functions.
- Produces routes:
  - `GET /api/clientes/:rut/locales?estado=`
  - `POST /api/clientes/:rut/locales`
  - `GET /api/locales/lookups`
  - `PUT /api/locales/:id`
  - `DELETE /api/locales/:id`
  - `POST /api/locales/:id/activate`

- [ ] **Step 1: Write the failing test**

Look at the existing `app.test.ts` to reuse its app/deps builder (it constructs `createApp` with a fake `getDb`/`getIdUsuario`). Add a test that hits `GET /api/clientes/:rut/locales` and expects 200 with an array, and `POST /api/clientes/:rut/locales` returns 201. Mirror the existing cliente route tests' structure (same `app.request(...)` helper). Example:

```ts
it("GET /api/clientes/:rut/locales returns the client's locales", async () => {
  const res = await app.request(`/api/clientes/${SEED.rutClienteConVenta}/locales?estado=activos`, {
    headers: authHeaders, // whatever the existing tests use
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body)).toBe(true);
});
```

(Reuse the exact request/auth helper names already present in `app.test.ts`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/app.test.ts -t "locales"`
Expected: FAIL — 404 (route not registered).

- [ ] **Step 3: Add routes + gate to app.ts**

In `lambdas/clientes/app.ts`: extend the service import (line 7-10) with `createLocal, listLocales, updateLocal, deactivateLocal, activateLocal, getLocalLookups`, and the shared import (line 2-4) with `LocalCreateSchema, LocalUpdateSchema`.

Add a `parseIdParam` helper next to `parseRutParam`:

```ts
function parseIdParam(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new AppError("VALIDACION", 400, "id de local inválido");
  return id;
}
```

After the existing `app.use("/clientes/*", gate);` (line 52), add the locales gate:

```ts
  app.use("/locales", gate);
  app.use("/locales/*", gate);
```

Before `return app;`, add:

```ts
  app.get("/locales/lookups", async (c) => c.json(await getLocalLookups(await deps.getDb())));

  app.get("/clientes/:rut/locales", async (c) => {
    const rut = parseRutParam(c);
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    return c.json(await listLocales(await deps.getDb(), rut, parsed.data));
  });

  app.post("/clientes/:rut/locales", async (c) => {
    const rut = parseRutParam(c);
    const raw = await c.req.json().catch(() => { throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido"); });
    const input = await parseBody<import("@serfel/shared").LocalCreateInput>(
      { req: { json: async () => ({ ...raw, rutCliente: rut }) } } as Context, LocalCreateSchema);
    return c.json(await createLocal(await deps.getDb(), input, c.get("idUsuario")), 201);
  });

  app.put("/locales/:id", async (c) => {
    const id = parseIdParam(c);
    const input = await parseBody<import("@serfel/shared").LocalUpdateInput>(c, LocalUpdateSchema);
    return c.json(await updateLocal(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.delete("/locales/:id", async (c) => {
    const id = parseIdParam(c);
    return c.json(await deactivateLocal(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.post("/locales/:id/activate", async (c) => {
    const id = parseIdParam(c);
    const input = await parseBody<import("@serfel/shared").LocalUpdateInput>(c, LocalUpdateSchema);
    return c.json(await activateLocal(await deps.getDb(), id, input, c.get("idUsuario")));
  });
```

Note on the POST body: the route injects `rutCliente` from the URL param so the client body need not repeat it. If the existing `parseBody` helper signature makes the wrapper above awkward, instead read+merge inline:

```ts
  app.post("/clientes/:rut/locales", async (c) => {
    const rut = parseRutParam(c);
    const raw = await c.req.json().catch(() => { throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido"); });
    const parsed = LocalCreateSchema.safeParse({ ...raw, rutCliente: rut });
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new AppError("VALIDACION", 400, detail);
    }
    return c.json(await createLocal(await deps.getDb(), parsed.data, c.get("idUsuario")), 201);
  });
```

Prefer this inline form (it avoids faking a `Context`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/app.test.ts -t "locales"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lambdas/clientes/app.ts lambdas/clientes/tests/app.test.ts
git commit -m "feat(clientes): locales HTTP routes"
```

---

## Task 8: Infra — register routes in `infra/api.ts`

**Files:**
- Modify: `infra/api.ts:174-183` (the `clientesRoutes` array + loop)

**Interfaces:**
- Consumes: `clientesFn`, `jwtAuthorizer` (already defined).
- Produces: 6 new API Gateway routes wired to `clientesFn`.

- [ ] **Step 1: Add the routes to the clientes route array**

In `infra/api.ts`, extend the `clientesRoutes` array (currently lines ~174-181) with:

```ts
  "GET /api/locales/lookups",
  "GET /api/clientes/{rut}/locales",
  "POST /api/clientes/{rut}/locales",
  "PUT /api/locales/{id}",
  "DELETE /api/locales/{id}",
  "POST /api/locales/{id}/activate",
```

The existing `for (const route of clientesRoutes) { api.route(route, clientesFn.arn, ...) }` loop wires them. No new function needed — locales live in the clientes lambda.

- [ ] **Step 2: Typecheck the infra**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add infra/api.ts
git commit -m "feat(infra): register locales routes on the clientes lambda"
```

---

## Task 9: Frontend — logic helpers + spec

**Files:**
- Create: `apps/frontend/src/app/features/clientes/locales-logic.ts`
- Test: `apps/frontend/src/app/features/clientes/locales-logic.spec.ts`

**Interfaces:**
- Produces:
  - `emptyLocalForm(): LocalFormModel` — a blank form model with sensible defaults.
  - `dtoToForm(dto: LocalDto): LocalFormModel`
  - `formToInput(m: LocalFormModel): unknown` — shapes a form model into the object passed to `LocalUpdateSchema`/`LocalCreateSchema` (trims, blank→null for nullable fields).
  - `type LocalFormModel` — all fields as strings/numbers/booleans for `[(ngModel)]`.

- [ ] **Step 1: Write the failing test**

Create `locales-logic.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyLocalForm, dtoToForm, formToInput } from "./locales-logic";
import type { LocalDto } from "@serfel/shared";

describe("locales-logic", () => {
  it("emptyLocalForm has blank strings and numeric defaults", () => {
    const m = emptyLocalForm();
    expect(m.nombre).toBe("");
    expect(m.topeVenta).toBe(0);
    expect(m.permiteVentaTopeMensual).toBe(false);
  });

  it("formToInput trims and maps blank nullable fields to null", () => {
    const m = { ...emptyLocalForm(), nombre: " Centro ", direccion: "Dir 1", telefono: "", email: "" };
    const input = formToInput(m) as Record<string, unknown>;
    expect(input.nombre).toBe("Centro");
    expect(input.telefono).toBeNull();
    expect(input.email).toBeNull();
  });

  it("dtoToForm round-trips a DTO into an editable model", () => {
    const dto = { idLocalCliente: 3, rutCliente: 1, nombre: "N", telefono: null,
      direccion: "D", comuna: "C", email: null, giro: "G", nomContacto: "",
      apellPatContacto: "", apellMatContacto: "", telefonoContacto: null,
      emailContacto: null, topeVenta: 5, topeCredito: 6, idVendedor: 2,
      nomVendedor: "V", idFormaPago: 7, nomFormaPago: "F", observaciones: "",
      permiteVentaTopeMensual: true, idEstado: 1 } as LocalDto;
    const m = dtoToForm(dto);
    expect(m.nombre).toBe("N");
    expect(m.telefono).toBe("");
    expect(m.idFormaPago).toBe(7);
    expect(m.permiteVentaTopeMensual).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/locales-logic.spec.ts`
Expected: FAIL — cannot resolve `./locales-logic`.

- [ ] **Step 3: Implement locales-logic.ts**

```ts
import type { LocalDto } from "@serfel/shared";

export interface LocalFormModel {
  nombre: string; telefono: string; direccion: string; comuna: string; email: string;
  giro: string; nomContacto: string; apellPatContacto: string; apellMatContacto: string;
  telefonoContacto: string; emailContacto: string;
  topeVenta: number; topeCredito: number;
  idVendedor: number | null; idFormaPago: number | null;
  observaciones: string; permiteVentaTopeMensual: boolean;
}

export function emptyLocalForm(): LocalFormModel {
  return {
    nombre: "", telefono: "", direccion: "", comuna: "", email: "",
    giro: "", nomContacto: "", apellPatContacto: "", apellMatContacto: "",
    telefonoContacto: "", emailContacto: "",
    topeVenta: 0, topeCredito: 0, idVendedor: null, idFormaPago: null,
    observaciones: "", permiteVentaTopeMensual: false,
  };
}

export function dtoToForm(dto: LocalDto): LocalFormModel {
  return {
    nombre: dto.nombre, telefono: dto.telefono ?? "", direccion: dto.direccion,
    comuna: dto.comuna, email: dto.email ?? "", giro: dto.giro,
    nomContacto: dto.nomContacto, apellPatContacto: dto.apellPatContacto,
    apellMatContacto: dto.apellMatContacto, telefonoContacto: dto.telefonoContacto ?? "",
    emailContacto: dto.emailContacto ?? "", topeVenta: dto.topeVenta,
    topeCredito: dto.topeCredito, idVendedor: dto.idVendedor, idFormaPago: dto.idFormaPago,
    observaciones: dto.observaciones, permiteVentaTopeMensual: dto.permiteVentaTopeMensual,
  };
}

export function formToInput(m: LocalFormModel): unknown {
  const nn = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    nombre: m.nombre.trim(), telefono: nn(m.telefono), direccion: m.direccion.trim(),
    comuna: m.comuna.trim(), email: nn(m.email), giro: m.giro.trim(),
    nomContacto: m.nomContacto.trim(), apellPatContacto: m.apellPatContacto.trim(),
    apellMatContacto: m.apellMatContacto.trim(), telefonoContacto: nn(m.telefonoContacto),
    emailContacto: nn(m.emailContacto), topeVenta: m.topeVenta, topeCredito: m.topeCredito,
    idVendedor: m.idVendedor, idFormaPago: m.idFormaPago,
    observaciones: m.observaciones.trim(), permiteVentaTopeMensual: m.permiteVentaTopeMensual,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/locales-logic.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/features/clientes/locales-logic.ts apps/frontend/src/app/features/clientes/locales-logic.spec.ts
git commit -m "feat(frontend): locales form logic helpers"
```

---

## Task 10: Frontend — API service + store

**Files:**
- Create: `apps/frontend/src/app/features/clientes/locales-api.service.ts`
- Create: `apps/frontend/src/app/features/clientes/locales-store.ts`

**Interfaces:**
- Consumes: `LocalDto`, `LocalCreateInput`, `LocalUpdateInput`, `LocalLookupsDto`, `EstadoFilter` from `@serfel/shared`; `environment`.
- Produces:
  - `LocalesApi` with `list(rut, estado)`, `lookups()`, `create(input)`, `update(id, input)`, `deactivate(id)`, `activate(id, input)`.
  - `LocalesStore` (signals) with `lookups`, `locales`, `loading`, `errorMsg`, `showInactive`; methods `loadFor(rut)`, `toggleInactive()`, `create`, `update`, `deactivate`, `activate`.

- [ ] **Step 1: Create the API service**

`locales-api.service.ts`:

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter, LocalCreateInput, LocalDto, LocalLookupsDto, LocalUpdateInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class LocalesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(rut: number, estado: EstadoFilter) {
    return this.http.get<LocalDto[]>(`${this.base}/clientes/${rut}/locales`, { params: { estado } });
  }
  lookups() {
    return this.http.get<LocalLookupsDto>(`${this.base}/locales/lookups`);
  }
  create(rut: number, input: Omit<LocalCreateInput, "rutCliente">) {
    return this.http.post<LocalDto>(`${this.base}/clientes/${rut}/locales`, input);
  }
  update(id: number, input: LocalUpdateInput) {
    return this.http.put<LocalDto>(`${this.base}/locales/${id}`, input);
  }
  deactivate(id: number) {
    return this.http.delete<LocalDto>(`${this.base}/locales/${id}`);
  }
  activate(id: number, input: LocalUpdateInput) {
    return this.http.post<LocalDto>(`${this.base}/locales/${id}/activate`, input);
  }
}
```

- [ ] **Step 2: Create the store**

`locales-store.ts`:

```ts
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, LocalCreateInput, LocalDto, LocalLookupsDto, LocalUpdateInput,
} from "@serfel/shared";
import { LocalesApi } from "./locales-api.service";

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) return err.error.error as ApiErrorBody["error"];
  return null;
}

@Injectable({ providedIn: "root" })
export class LocalesStore {
  private api = inject(LocalesApi);

  readonly locales = signal<LocalDto[]>([]);
  readonly lookups = signal<LocalLookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly showInactive = signal(false);
  private rut = signal<number | null>(null);

  readonly visible = computed(() =>
    this.showInactive() ? this.locales() : this.locales().filter((l) => l.idEstado === 1));

  private estado(): EstadoFilter { return this.showInactive() ? "todos" : "activos"; }

  async loadFor(rut: number): Promise<void> {
    this.rut.set(rut);
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [locales, lookups] = await Promise.all([
        firstValueFrom(this.api.list(rut, this.estado())),
        this.lookups() ? Promise.resolve(this.lookups()!) : firstValueFrom(this.api.lookups()),
      ]);
      this.locales.set(locales);
      this.lookups.set(lookups);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudieron cargar los locales.");
    } finally {
      this.loading.set(false);
    }
  }

  async toggleInactive(): Promise<void> {
    this.showInactive.update((v) => !v);
    const rut = this.rut();
    if (rut !== null) await this.loadFor(rut);
  }

  private async reload(): Promise<void> { const r = this.rut(); if (r !== null) await this.loadFor(r); }

  async create(input: Omit<LocalCreateInput, "rutCliente">): Promise<void> {
    const rut = this.rut(); if (rut === null) return;
    await firstValueFrom(this.api.create(rut, input)); await this.reload();
  }
  async update(id: number, input: LocalUpdateInput): Promise<void> {
    await firstValueFrom(this.api.update(id, input)); await this.reload();
  }
  async deactivate(id: number): Promise<void> {
    await firstValueFrom(this.api.deactivate(id)); await this.reload();
  }
  async activate(id: number, input: LocalUpdateInput): Promise<void> {
    await firstValueFrom(this.api.activate(id, input)); await this.reload();
  }

  reset(): void { this.locales.set([]); this.rut.set(null); this.showInactive.set(false); this.errorMsg.set(null); }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc --noEmit -p tsconfig.app.json` (or `pnpm typecheck`)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/clientes/locales-api.service.ts apps/frontend/src/app/features/clientes/locales-store.ts
git commit -m "feat(frontend): locales api service and store"
```

---

## Task 11: Frontend — `local-form.component.ts` (full-width editor)

**Files:**
- Create: `apps/frontend/src/app/features/clientes/local-form.component.ts`

**Interfaces:**
- Consumes: `LocalDto`, `LocalLookupsDto`, `LocalCreateSchema`, `LocalUpdateSchema` from `@serfel/shared`; `emptyLocalForm`, `dtoToForm`, `formToInput`, `LocalFormModel` from `./locales-logic`.
- Produces: `<app-local-form [local] [lookups] (save) (back)>`; `LocalSavePayload = { mode: "create" | "update"; data: unknown }`; methods `setServerError(msg)`, `resetBusy()`.

- [ ] **Step 1: Create the component**

Model it on `cliente-modal.component.ts`'s form/validation pattern (Zod `safeParse` → per-field errors, `busy` signal, `save`/`back` outputs). Two-column `form-grid` using the existing `.full` class for wide fields.

```ts
import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LocalCreateSchema, LocalUpdateSchema, type LocalDto, type LocalLookupsDto } from "@serfel/shared";
import { emptyLocalForm, dtoToForm, formToInput, type LocalFormModel } from "./locales-logic";

export type LocalSavePayload = { mode: "create" | "update"; data: unknown };

@Component({
  selector: "app-local-form",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="local-editor">
      <button class="btn-cancel" style="margin-bottom:12px" (click)="back.emit()">‹ Volver a locales</button>
      <h3>{{ local ? 'Editar local: ' + local.nombre : 'Nuevo local' }}</h3>
      @if (serverError(); as e) { <div class="login-error">{{ e }}</div> }
      <div class="form-grid">
        <div class="form-field full">
          <label for="l-nom">Nombre *</label>
          <input id="l-nom" type="text" [(ngModel)]="m.nombre" />
          @if (errors().nombre; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
        </div>
        <div class="form-field"><label for="l-fono">Teléfono</label>
          <input id="l-fono" type="text" [(ngModel)]="m.telefono" /></div>
        <div class="form-field"><label for="l-email">Email</label>
          <input id="l-email" type="email" [(ngModel)]="m.email" />
          @if (errors().email; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field full"><label for="l-dir">Dirección *</label>
          <input id="l-dir" type="text" [(ngModel)]="m.direccion" />
          @if (errors().direccion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field"><label for="l-comuna">Comuna</label>
          <input id="l-comuna" type="text" [(ngModel)]="m.comuna" /></div>
        <div class="form-field"><label for="l-giro">Giro</label>
          <input id="l-giro" type="text" [(ngModel)]="m.giro" /></div>
        <div class="form-field"><label for="l-fp">Forma de pago *</label>
          <select id="l-fp" [(ngModel)]="m.idFormaPago">
            @for (f of lookups.formasPago; track f.id) { <option [ngValue]="f.id">{{ f.nombre }}</option> }
          </select></div>
        <div class="form-field"><label for="l-vend">Vendedor *</label>
          <select id="l-vend" [(ngModel)]="m.idVendedor">
            @for (v of lookups.vendedores; track v.id) { <option [ngValue]="v.id">{{ v.nombre }}</option> }
          </select></div>
        <div class="form-field"><label for="l-tv">Tope venta</label>
          <input id="l-tv" type="number" [(ngModel)]="m.topeVenta" /></div>
        <div class="form-field"><label for="l-tc">Tope crédito</label>
          <input id="l-tc" type="number" [(ngModel)]="m.topeCredito" /></div>
        <div class="form-field"><label for="l-cn">Contacto</label>
          <input id="l-cn" type="text" [(ngModel)]="m.nomContacto" /></div>
        <div class="form-field"><label for="l-cap">Apellido paterno contacto</label>
          <input id="l-cap" type="text" [(ngModel)]="m.apellPatContacto" /></div>
        <div class="form-field"><label for="l-cam">Apellido materno contacto</label>
          <input id="l-cam" type="text" [(ngModel)]="m.apellMatContacto" /></div>
        <div class="form-field"><label for="l-cf">Teléfono contacto</label>
          <input id="l-cf" type="text" [(ngModel)]="m.telefonoContacto" /></div>
        <div class="form-field"><label for="l-ce">Email contacto</label>
          <input id="l-ce" type="email" [(ngModel)]="m.emailContacto" />
          @if (errors().emailContacto; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field full"><label for="l-obs">Observaciones</label>
          <input id="l-obs" type="text" [(ngModel)]="m.observaciones" /></div>
        <div class="form-field full"><label class="checkbox-row">
          <input type="checkbox" [(ngModel)]="m.permiteVentaTopeMensual" /> Permite venta sobre tope mensual
        </label></div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" (click)="back.emit()">Cancelar</button>
        <button class="btn-save" (click)="onSave()" [disabled]="busy()">
          {{ busy() ? 'Guardando…' : 'Guardar Local' }}
        </button>
      </div>
    </div>
  `,
})
export class LocalFormComponent implements OnInit {
  @Input() local: LocalDto | null = null;
  @Input({ required: true }) lookups!: LocalLookupsDto;
  @Output() save = new EventEmitter<LocalSavePayload>();
  @Output() back = new EventEmitter<void>();

  m: LocalFormModel = emptyLocalForm();
  readonly errors = signal<{ nombre?: string; direccion?: string; email?: string; emailContacto?: string }>({});
  readonly serverError = signal<string | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.local) this.m = dtoToForm(this.local);
    else {
      this.m = emptyLocalForm();
      this.m.idFormaPago = this.lookups.formasPago[0]?.id ?? null;
      this.m.idVendedor = this.lookups.vendedores[0]?.id ?? null;
    }
  }

  onSave(): void {
    const data = formToInput(this.m);
    const schema = this.local ? LocalUpdateSchema : LocalCreateSchema;
    // create needs rutCliente, injected server-side from the URL, so validate with a stub for create.
    const toValidate = this.local ? data : { ...(data as object), rutCliente: 1 };
    const parsed = schema.safeParse(toValidate);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0]);
        if (k === "nombre") e.nombre = "Nombre es obligatorio";
        else if (k === "direccion") e.direccion = "Dirección es obligatoria";
        else if (k === "email") e.email = "Email inválido";
        else if (k === "emailContacto") e.emailContacto = "Email de contacto inválido";
      }
      this.errors.set(e);
      return;
    }
    this.errors.set({});
    this.serverError.set(null);
    this.busy.set(true);
    this.save.emit({ mode: this.local ? "update" : "create", data });
  }

  setServerError(msg: string): void { this.busy.set(false); this.serverError.set(msg); }
  resetBusy(): void { this.busy.set(false); }
}
```

Note: for create, `rutCliente` is injected by the parent store (`create(input)` omits it) and by the server (from the URL param), so the client sends the body without `rutCliente`; the stubbed `rutCliente: 1` used only to satisfy `LocalCreateSchema` validation locally.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc --noEmit -p tsconfig.app.json`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/features/clientes/local-form.component.ts
git commit -m "feat(frontend): full-width local editor component"
```

---

## Task 12: Frontend — Locales tab in the cliente modal

**Files:**
- Modify: `apps/frontend/src/app/features/clientes/cliente-modal.component.ts`

**Interfaces:**
- Consumes: `LocalesStore`, `LocalFormComponent`, `LocalSavePayload`, `LocalDto`.
- Produces: a two-tab modal (Datos / Locales); the Locales tab shows a list + `Ver inactivos` toggle + `+ Nuevo Local`, and swaps to `<app-local-form>` in-place for add/edit.

- [ ] **Step 1: Wire the store, imports, and tab state**

In `cliente-modal.component.ts`:
- Add to `imports`: `LocalFormComponent`.
- `inject(LocalesStore)` as `readonly locales = inject(LocalesStore);`.
- Add signals: `readonly tab = signal<'datos' | 'locales'>('datos');` and `readonly localView = signal<'list' | 'edit'>('list');` and `readonly editingLocal = signal<LocalDto | null>(null);`.
- Widen the modal: add an inline `style="max-width:920px"` (or a class) to the `.modal` div so the two-column local form fits. Only widen when needed; a static wider modal is acceptable.
- On `ngOnInit`, if editing an existing cliente (`this.cliente`), preload locales: `if (this.cliente) void this.locales.loadFor(this.cliente.rutCliente);` — but ONLY load lazily when the Locales tab is first opened to avoid loading for create. Implement `openLocalesTab()` that calls `loadFor` once.

- [ ] **Step 2: Add the tab header + Locales panel to the template**

Add a tab strip under `.modal-head`:

```html
<div class="tab-strip">
  <button [class.active]="tab() === 'datos'" (click)="tab.set('datos')">Datos</button>
  <button [class.active]="tab() === 'locales'" (click)="openLocalesTab()" [disabled]="!cliente">Locales</button>
</div>
```

Disable the Locales tab for a not-yet-created cliente (`!cliente`) since locales need a parent rut. Wrap the existing `.form-grid` + footer in `@if (tab() === 'datos') { ... }`. Add the Locales panel:

```html
@if (tab() === 'locales') {
  @if (localView() === 'list') {
    <div class="locales-list">
      <div class="toolbar">
        <label class="checkbox-row"><input type="checkbox"
          [ngModel]="locales.showInactive()" (ngModelChange)="locales.toggleInactive()" /> Ver inactivos</label>
        <button class="hero-btn hero-btn-white" (click)="newLocal()">+ Nuevo Local</button>
      </div>
      @if (locales.errorMsg(); as e) { <div class="login-error">{{ e }}</div> }
      <table><thead><tr><th>Nombre</th><th>Comuna</th><th>Forma de pago</th><th>Acciones</th></tr></thead>
      <tbody>
        @for (l of locales.visible(); track l.idLocalCliente) {
          <tr>
            <td>{{ l.nombre }}</td><td>{{ l.comuna }}</td><td>{{ l.nomFormaPago ?? '—' }}</td>
            <td>
              @if (l.idEstado === 1) {
                <button class="t-btn t-btn-edit" (click)="editLocal(l)">Editar</button>
                <button class="t-btn t-btn-del" (click)="removeLocal(l)">Eliminar</button>
              } @else {
                <button class="t-btn t-btn-edit" (click)="restoreLocal(l)">Restaurar</button>
              }
            </td>
          </tr>
        }
      </tbody></table>
    </div>
  } @else {
    <app-local-form [local]="editingLocal()" [lookups]="locales.lookups()!"
      (save)="onLocalSave($event)" (back)="localView.set('list')" />
  }
}
```

- [ ] **Step 3: Add the component methods**

```ts
openLocalesTab(): void {
  if (!this.cliente) return;
  this.tab.set('locales');
  if (this.locales.lookups() === null || this.localesLoadedFor !== this.cliente.rutCliente) {
    this.localesLoadedFor = this.cliente.rutCliente;
    void this.locales.loadFor(this.cliente.rutCliente);
  }
}
private localesLoadedFor: number | null = null;

newLocal(): void { this.editingLocal.set(null); this.localView.set('edit'); }
editLocal(l: LocalDto): void { this.editingLocal.set(l); this.localView.set('edit'); }

async onLocalSave(payload: LocalSavePayload): Promise<void> {
  try {
    if (payload.mode === 'update' && this.editingLocal()) {
      await this.locales.update(this.editingLocal()!.idLocalCliente, payload.data as never);
    } else {
      await this.locales.create(payload.data as never);
    }
    this.localView.set('list');
  } catch (err) {
    const form = this.localForm();
    form?.setServerError(apiErrorMessage(err) ?? 'No se pudo guardar el local');
  }
}

async removeLocal(l: LocalDto): Promise<void> {
  if (!confirm(`¿Eliminar el local "${l.nombre}"? Podrás restaurarlo con el filtro Inactivos.`)) return;
  await this.locales.deactivate(l.idLocalCliente);
}

async restoreLocal(l: LocalDto): Promise<void> {
  if (!confirm(`¿Restaurar el local "${l.nombre}"?`)) return;
  await this.locales.activate(l.idLocalCliente, {
    nombre: l.nombre, telefono: l.telefono, direccion: l.direccion, comuna: l.comuna,
    email: l.email, giro: l.giro, nomContacto: l.nomContacto, apellPatContacto: l.apellPatContacto,
    apellMatContacto: l.apellMatContacto, telefonoContacto: l.telefonoContacto,
    emailContacto: l.emailContacto, topeVenta: l.topeVenta, topeCredito: l.topeCredito,
    idVendedor: l.idVendedor, idFormaPago: l.idFormaPago, observaciones: l.observaciones,
    permiteVentaTopeMensual: l.permiteVentaTopeMensual,
  });
}
```

Add a `viewChild(LocalFormComponent)` named `localForm` for `setServerError`, and a small local `apiErrorMessage(err)` helper (or import `apiError` from `locales-store` and read `.message`). Import `LocalDto`, `LocalSavePayload`, `signal`, `viewChild`, `inject` as needed.

- [ ] **Step 4: Add minimal tab-strip styles**

If `.tab-strip`/`.tab-strip button.active` styles don't already exist in the shared SCSS, add a small scoped `styles` block to the component (border-bottom strip, active underline). Reuse existing `.toolbar`, `.t-btn`, `.form-grid`, `.modal-footer`, `.login-error` classes.

- [ ] **Step 5: Build the frontend to verify it compiles**

Run: `pnpm --filter @serfel/frontend build`
Expected: PASS (no template/type errors).

- [ ] **Step 6: Manual smoke (optional but recommended)**

Run `pnpm --filter @serfel/frontend start`, open a cliente, switch to the Locales tab, add/edit/deactivate/restore a local, confirm forma de pago + vendedor dropdowns populate. (Use the `/run` or `verify` skill to drive the app.)

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/features/clientes/cliente-modal.component.ts
git commit -m "feat(frontend): locales tab in cliente modal"
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole repo**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 2: Run all affected tests**

Run (MariaDB up first):
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm --filter @serfel/shared test
pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests
pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes
```
Expected: all PASS.

- [ ] **Step 3: Build frontend**

Run: `pnpm --filter @serfel/frontend build`
Expected: PASS.

- [ ] **Step 4: Commit any final fixups**

```bash
git add -A
git commit -m "test(locales): full verification pass" --allow-empty
```

---

## Self-Review notes

- **Spec coverage:** migration + FK + autoincrement (Task 1), legacy PHP MAX+1 removal (Task 1B), shared contracts (Task 2), lambda lookups/list/create/update/deactivate/activate (Tasks 4-6), routes + infra registration (Tasks 7-8), frontend api/store/logic/editor/tab (Tasks 9-12), inactivos + Restaurar (Tasks 6, 10, 12), vendedor filter tipo 2 & activos (Task 4), comuna sync (Tasks 5-6), full-width in-place editor (Tasks 11-12). All spec sections mapped.
- **Deferred/out-of-scope (per spec):** no DROP of `comuna_local_cliente`, no repointing of `60_m_pago` FK, no changes to `10_p_tipo_docto`.
- **id_local_cliente:** changed to AUTO_INCREMENT (Task 1, FK-checks-wrapped); create reads `ResultSetHeader.insertId` (Task 5); legacy `MAX(id)+1` removed from both PHP apps (Task 1B). Sequencing: deploy Task 1 migration before shipping Task 1B; rebuild PHP rehost images manually.
- **Lookups delivery:** dedicated `GET /api/locales/lookups` (rut-independent), gated by the added `/locales/*` module gate.
