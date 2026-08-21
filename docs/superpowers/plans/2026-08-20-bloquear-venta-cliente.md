# bloquear_venta Client Sales Block — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `bloquear_venta` boolean flag to clients that hides their locales from the legacy pedidos "buscar cliente" search, editable in the Serfel 2.0 clientes maintainer.

**Architecture:** New `tinyint` column on `10_m_cliente` threaded through the existing Drizzle schema → `@serfel/shared` Zod DTO → clientes Lambda → Serfel 2.0 Angular maintainer, mirroring the existing `permiteVentaDeuda` column line-for-line. Enforcement is a single `AND c.bloquear_venta = 0` clause added to the two legacy PHP search DAO methods (Serfel + Coproad). Coproad gets the column + filter but no edit UI.

**Tech Stack:** Drizzle ORM (MariaDB), Zod, Hono Lambda (Node/TS), Angular 20 (signals/standalone), legacy PHP 5.6 (CodeIgniter REST), Vitest.

Spec: `docs/superpowers/specs/2026-08-20-bloquear-venta-cliente-design.md`

## Global Constraints

- Column stored as `tinyint` (default `0`, NOT NULL) — never a native boolean. `1` = blocked, `0` = allowed.
- Mirror `permiteVentaDeuda` exactly at every layer; do not invent new naming.
- DB column name: `bloquear_venta`. TS/DTO field name: `bloquearVenta`.
- Deploy order for the DB migration: `sst deploy` (bundles migration into the migrate Lambda) **before** `db:migrate`, or the new migration silently no-ops.
- Legacy PHP is not built in CI — Fargate images must be rebuilt manually per `legacy-php/README.md` after PHP edits.
- Run commands from the repo root unless noted. Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait`.

---

### Task 1: Backend chain — schema column, migration, shared DTO, Lambda

The shared Zod type, Drizzle schema, and Lambda service must land together so `pnpm typecheck` and the Lambda tests compile and pass. This is the smallest independently-testable backend deliverable.

**Files:**
- Modify: `packages/db/src/schema.ts:257` (add column to `t10MCliente`)
- Create: `packages/db/migrations/<generated>.sql` (via drizzle-kit)
- Modify: `packages/shared/src/clientes.ts:18` (clienteBase) and `:43`-area (`ClienteDto`)
- Modify: `lambdas/clientes/service.ts` (dtoColumns ~`:35`, `Row` type ~`:43`, `toDto` ~`:49`, `writeValues` ~`:218`)
- Test: `lambdas/clientes/tests/service.test.ts:21` (fixture), `lambdas/clientes/tests/app.test.ts:34` (fixture)

**Interfaces:**
- Produces: `ClienteDto.bloquearVenta: boolean`; `clienteBase.bloquearVenta` (Zod `boolean`, default `false`) → present on `ClienteCreateInput` and `ClienteUpdateInput`. Consumed by Task 2.

- [ ] **Step 1: Add the shared Zod field and DTO field**

In `packages/shared/src/clientes.ts`, add to `clienteBase` (after `permiteVentaDeuda`):

```ts
  permiteVentaDeuda: z.boolean().default(false),
  bloquearVenta: z.boolean().default(false),
```

And to `ClienteDto` interface (after `permiteVentaDeuda: boolean;`):

```ts
  permiteVentaDeuda: boolean;
  bloquearVenta: boolean;
```

- [ ] **Step 2: Add the Drizzle column**

In `packages/db/src/schema.ts`, in `t10MCliente` (after the `permiteVentaDeuda` line, `:257`):

```ts
	permiteVentaDeuda: tinyint("permite_venta_deuda").default(0).notNull(),
	bloquearVenta: tinyint("bloquear_venta").default(0).notNull(),
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm --filter @serfel/db generate`
Expected: a new versioned file appears in `packages/db/migrations/` whose SQL is `ALTER TABLE \`10_m_cliente\` ADD \`bloquear_venta\` tinyint NOT NULL DEFAULT 0;`. Open it and confirm it contains only that ALTER (no unrelated diffs). If unrelated changes appear, stop and investigate schema drift.

- [ ] **Step 4: Wire the Lambda service**

In `lambdas/clientes/service.ts`:

`dtoColumns` (after `permiteVentaDeuda`):
```ts
  permiteVentaDeuda: t10MCliente.permiteVentaDeuda,
  bloquearVenta: t10MCliente.bloquearVenta,
```

`Row` type (after `permiteVentaDeuda: number;`):
```ts
  permiteVentaDeuda: number; bloquearVenta: number; idEstado: number;
```

`toDto` return (add alongside the existing override, since `...r` spreads the numeric value):
```ts
    permiteVentaDeuda: r.permiteVentaDeuda === 1,
    bloquearVenta: r.bloquearVenta === 1,
```

`writeValues` return (after `permiteVentaDeuda`):
```ts
    permiteVentaDeuda: input.permiteVentaDeuda ? 1 : 0,
    bloquearVenta: input.bloquearVenta ? 1 : 0,
```

- [ ] **Step 5: Write the failing round-trip test**

In `lambdas/clientes/tests/service.test.ts`, add a test asserting `bloquearVenta` persists and reads back. Use the existing suite's DB setup/helpers (match how neighboring create/get tests build input and call the service):

```ts
it("persists and reads back bloquearVenta", async () => {
  const created = await createCliente(db, { ...validClienteInput, bloquearVenta: true }, TEST_UID);
  expect(created.kind).toBe("created");
  if (created.kind !== "created") return;
  expect(created.dto.bloquearVenta).toBe(true);

  const updated = await updateCliente(db, created.dto.rutCliente, { ...validUpdateInput, bloquearVenta: false }, TEST_UID);
  expect(updated.bloquearVenta).toBe(false);
});
```

Adjust `validClienteInput` / `validUpdateInput` / `TEST_UID` to the names already used in this test file. Also add `bloquearVenta: false` to the shared fixtures at `service.test.ts:21` and `app.test.ts:34` so existing assertions that compare whole DTO objects still match.

- [ ] **Step 6: Run the test to verify it fails (before column exists in the test DB)**

Ensure local MariaDB is up, then run:
`pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes/tests/service.test.ts`
Expected: the new test fails (unknown column / property `bloquearVenta`) if run before the schema-only test migration picks up the column. Tests build the DB via `migrateSchemaOnly`, which reads `schema.ts` — with Step 2 done it should actually pass; if it fails on the column, confirm the test harness regenerated the schema. The meaningful check is Step 7.

- [ ] **Step 7: Run the full clientes Lambda suite**

Run:
`pnpm --filter @serfel/lambdas exec vitest run lambdas/clientes`
then `pnpm typecheck`
Expected: all green. Fix any other cliente fixtures the typechecker flags (column additions have historically rippled into hardcoded fixtures).

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema.ts packages/db/migrations packages/shared/src/clientes.ts lambdas/clientes
git commit -m "feat(clientes): add bloquear_venta column through schema, DTO, and lambda

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Serfel 2.0 maintainer — editable checkbox, list badge, stat

**Files:**
- Modify: `apps/frontend/src/app/features/clientes/cliente-modal.component.ts` (template `:85`-area, field `:161`, `ngOnInit` `:183`, `onSave` `:194`)
- Modify: `apps/frontend/src/app/features/clientes/clientes-page.component.ts` (`toUpdate` `:191`, row template `:99`-area)
- Modify: `apps/frontend/src/app/features/clientes/clientes-logic.ts` (`computeStats` `:47`)
- Test: `apps/frontend/src/app/features/clientes/clientes-logic.spec.ts`

**Interfaces:**
- Consumes: `ClienteDto.bloquearVenta`, `ClienteUpdateInput.bloquearVenta` from Task 1.

- [ ] **Step 1: Write the failing stat test**

In `clientes-logic.spec.ts`, add (match the file's existing `computeStats` test setup and DTO factory helper):

```ts
it("counts bloqueados clients", () => {
  const all = [
    makeCliente({ bloquearVenta: true }),
    makeCliente({ bloquearVenta: false }),
    makeCliente({ bloquearVenta: true }),
  ];
  expect(computeStats(all, all).bloqueados).toBe(2);
});
```

If the file has no `makeCliente` helper, build the three DTOs inline the way neighboring tests construct `ClienteDto` objects.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/clientes-logic.spec.ts`
Expected: FAIL — `bloqueados` is `undefined`.

- [ ] **Step 3: Add the stat**

In `clientes-logic.ts` `computeStats` return:

```ts
    conDeuda: all.filter((r) => r.permiteVentaDeuda).length,
    bloqueados: all.filter((r) => r.bloquearVenta).length,
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes/clientes-logic.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire the modal field**

In `cliente-modal.component.ts`:

Field declaration (`:161`):
```ts
  idListaPrecio: number | null = null; permiteVentaDeuda = false; bloquearVenta = false;
```

Template — add a second checkbox row after the "Permite venta a deuda" block (`:89`):
```html
            <div class="form-field full">
              <label class="checkbox-row">
                <input type="checkbox" [(ngModel)]="bloquearVenta" />
                Bloquear venta
              </label>
            </div>
```

`ngOnInit`, in the `if (this.cliente)` block (after the `permiteVentaDeuda` line, `:183`):
```ts
      this.permiteVentaDeuda = this.cliente.permiteVentaDeuda;
      this.bloquearVenta = this.cliente.bloquearVenta;
```

`onSave` `common` object (`:194`):
```ts
      idListaPrecio: this.idListaPrecio, permiteVentaDeuda: this.permiteVentaDeuda,
      bloquearVenta: this.bloquearVenta,
```

- [ ] **Step 6: Wire the page mapping and list badge**

In `clientes-page.component.ts` `toUpdate` (`:191`):
```ts
      idListaPrecio: cli.idListaPrecio, permiteVentaDeuda: cli.permiteVentaDeuda,
      bloquearVenta: cli.bloquearVenta,
```

Row template — add a "Bloqueado" badge in the razón social cell (`:99`) so blocked clients are visibly flagged but still listed:
```html
                  <td class="t-name">{{ cli.razonSocial }}
                    @if (cli.bloquearVenta) { <span class="badge-bloqueado" title="Venta bloqueada">Bloqueado</span> }
                    <br /><span class="t-muted">{{ cli.nomFantasia }}</span></td>
```

Add a minimal style for `.badge-bloqueado` in the component's styles (small red pill, following existing badge/pill conventions in this component's SCSS; if none exist, use `display:inline-block;font-size:11px;padding:1px 6px;border-radius:8px;background:#fee2e2;color:#b91c1c;margin-left:6px`).

- [ ] **Step 7: Build and run frontend tests**

Run:
`pnpm --filter @serfel/frontend exec vitest run src/app/features/clientes`
then `pnpm --filter @serfel/frontend build`
Expected: tests green, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/app/features/clientes
git commit -m "feat(clientes): edit bloquearVenta in maintainer, flag blocked clients

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Legacy search filter (Serfel + Coproad DAO)

The enforcement point. Both search endpoints (`findByRut`, `findByName`) funnel through these two DAO methods, and these methods are called only by the search endpoints — so the filter affects nothing else.

**Files:**
- Modify: `legacy-php/Distribuidor/Clases/DAO/LocalClienteDAO.php` (`listarPorRut` `:77`-79, `listarPorRazonSocialONombre` `:104`-105)
- Modify: `legacy-php/Coproad/Clases/DAO/LocalClienteDAO.php` (`listarPorRut` `:77`-79, `listarPorRazonSocialONombre` `:104`-105)

- [ ] **Step 1: Add the filter to Distribuidor `listarPorRut`**

WHERE clause becomes:
```php
            WHERE c.rut_cliente = :rut_cliente
            AND c.rut_cliente > 0
            AND c.bloquear_venta = 0
            AND lc.id_estado = 1";
```

- [ ] **Step 2: Add the filter to Distribuidor `listarPorRazonSocialONombre`**

WHERE clause becomes:
```php
            WHERE (upper(c.razon_social) LIKE upper(:palabra) OR upper(lc.nom_local_cliente) LIKE upper(:palabra))
            AND c.bloquear_venta = 0
            AND lc.id_estado = 1";
```

- [ ] **Step 3: Apply the identical two edits to the Coproad DAO**

`legacy-php/Coproad/Clases/DAO/LocalClienteDAO.php` has structurally identical WHERE clauses at the same lines — make the same two additions of `AND c.bloquear_venta = 0`.

- [ ] **Step 4: Static sanity check**

Run: `php -l legacy-php/Distribuidor/Clases/DAO/LocalClienteDAO.php && php -l legacy-php/Coproad/Clases/DAO/LocalClienteDAO.php`
Expected: `No syntax errors detected` for both. (If `php` is unavailable locally, visually confirm the SQL string still has balanced quotes and the trailing `";`.)

- [ ] **Step 5: Commit**

```bash
git add legacy-php/Distribuidor/Clases/DAO/LocalClienteDAO.php legacy-php/Coproad/Clases/DAO/LocalClienteDAO.php
git commit -m "feat(pedidos): exclude bloquear_venta clients from buscar cliente search

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Note — manual Fargate rebuild required**

These PHP changes do not deploy via CI. After merge, rebuild and push the legacy PHP Fargate images per `legacy-php/README.md`, then run `pnpm rehost:smoke`.

---

### Task 4: Coproad schema column (ops)

Coproad has no Drizzle migration path — its schema is a static dump applied manually. The Serfel migration from Task 1 does not touch the coproad schema.

**Files:**
- Modify: `packages/db/dump/coproad/legacy-schema.sql:44` (`10_m_cliente` CREATE TABLE)

- [ ] **Step 1: Add the column to the coproad dump**

In `packages/db/dump/coproad/legacy-schema.sql`, in the `10_m_cliente` CREATE TABLE, change the last column line so the new column follows `permite_venta_deuda`:

```sql
  `permite_venta_deuda` tinyint(4) NOT NULL DEFAULT 0,
  `bloquear_venta` tinyint(4) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
```

- [ ] **Step 2: Commit the dump change**

```bash
git add packages/db/dump/coproad/legacy-schema.sql
git commit -m "chore(db): add bloquear_venta to coproad schema dump

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 3: Apply the DDL to the live coproad schema (deploy-time op, not code)**

Against the live `coproad` schema (via `db:tunnel` / bastion, per repo DB ops), run:

```sql
ALTER TABLE `10_m_cliente`
  ADD COLUMN `bloquear_venta` tinyint(4) NOT NULL DEFAULT 0;
```

This is a one-off operational step performed during rollout — record it in the deploy notes / WORKLOG.

---

## Deploy order (rollout runbook)

1. Merge Tasks 1–4 to `main` (CI deploys frontend + Lambdas via `sst deploy`).
2. Confirm the SST deploy finished (migrate Lambda now bundles the new migration), then run `pnpm db:migrate` to apply the Serfel `bloquear_venta` migration. **Never run `db:migrate` before the deploy completes.**
3. Apply the Coproad live `ALTER TABLE` (Task 4, Step 3).
4. Rebuild + push the legacy PHP Fargate images (Task 3, Step 6); run `pnpm rehost:smoke`.
5. Smoke-verify: set `bloquear_venta = 1` on one test client per schema and confirm its locales vanish from both buscar-cliente searches; set back to `0` and confirm they reappear.
