# Locales de Clientes — Design

**Date:** 2026-08-15
**Status:** Approved (design)
**Entity:** `10_m_local_cliente` (child of `10_m_cliente`)

## Summary

Add management of a cliente's **locales** (branches/points of sale) to the new
Angular frontend, and normalize the **forma de pago** parameter out of the
legacy `10_p_tipo_docto` param table into its own `40_p_forma_pago` table
without breaking existing business rules.

Two deliverables:

1. **Forma de pago normalization** — a DB migration that seeds `40_p_forma_pago`
   with IDs 3-8 (copied verbatim from `10_p_tipo_docto`, same IDs) and adds a
   proper FK on `10_m_local_cliente.id_forma_pago`.
2. **Locales maintainer** — a **Locales tab inside the existing cliente modal**,
   backed by CRUD added to the existing `clientes` lambda and shared Zod
   contracts.

## Context / findings

- `10_m_local_cliente` is a child of `10_m_cliente` via FK `loc_clie_clie`
  (`rut_cliente`). It has ~20 fields: nombre, telefono, direccion, comuna,
  email, giro, contacto (nom/apell/tel/email), tope_venta, tope_credito,
  id_vendedor (default 5), id_forma_pago (default 7), observaciones,
  permite_venta_tope_mensual, id_estado (soft delete).
- `40_p_forma_pago` **already exists** as an unused param table
  (id_forma_pago, nom_forma_pago, desc_forma_pago).
- `10_m_local_cliente.id_forma_pago` **already exists** (default 7) but has
  **no FK constraint** — it is currently a loose int.
- **Landmine:** `60_m_pago.id_forma_pago` has FK `fk_pago_tipo_docto` →
  `10_p_tipo_docto.id_tipo_docto` with **`ON DELETE CASCADE`**. forma-de-pago
  and tipo-docto are conflated in the legacy schema. Deleting IDs 3-8 from
  `10_p_tipo_docto` would cascade-delete payment rows. Therefore we **copy**,
  never delete-from-tipo_docto.
- The `clientes` lambda already reads `10_m_local_cliente` (for route weekdays)
  but has **no local CRUD**.
- `10_m_local_cliente` has both `comuna_local_cliente` (varchar 30, legacy —
  the field legacy actually uses) and `comuna` (varchar 20, newer dup). The
  seed populates both identically.
- `comuna_local_cliente` is still read by **live legacy rehost code**:
  `legacy-php/{Distribuidor,Coproad}/Clases/POJO/LocalCliente.php` and
  `lambdas/node-app-{1,2,3}/src/model/local.model.ts`.

## Decisions

| Decision | Choice |
|---|---|
| Where locales live in the UI | **Locales tab inside the cliente modal** |
| Editing one local (~20 fields) | **In-place full-width view swap** within the modal (no dialog-in-dialog); modal widened |
| forma_pago migration | **Copy rows 3-8 into `40_p_forma_pago` (same IDs), repoint local FK, leave `10_p_tipo_docto` and `60_m_pago` untouched** |
| Backend home | **Extend the existing `clientes` lambda** |
| Inactive locales | **Yes** — `Ver inactivos` toggle + `Restaurar` on inactive rows (maintainer convention) |
| Vendedor / forma de pago inputs | **Both dropdowns from lookups** |
| Vendedor lookup source | `10_m_usuario` where `id_estado = 1 AND id_tipo_usuario = 2` |
| comuna consolidation | New stack uses **`comuna`** only; **keep** `comuna_local_cliente` column and **write it in sync** on save so legacy keeps working. Physical column drop deferred to a later legacy-retirement cleanup. |
| id_local_cliente assignment | Make the column **`AUTO_INCREMENT`** and remove the legacy `MAX(id)+1` from both `legacy-php/{Distribuidor,Coproad}/Clases/LocalCliente.php`. New lambda reads `ResultSetHeader.insertId`. |

## 1. Data model & migration

Edit `packages/db/src/schema.ts`:

- Add a `foreignKey(...)` to `t10MLocalCliente`'s constraint array:
  `id_forma_pago → t40PFormaPago.idFormaPago`, `ON DELETE RESTRICT ON UPDATE
  RESTRICT`. (No column drops — both `comuna` and `comuna_local_cliente` stay.)
- Add `.autoincrement()` to the `idLocalCliente` column so the DB assigns new
  IDs. `10_m_local_cliente` is an **FK parent** (referenced by `30_m_pedido`
  `ped_loc_clie`, `40_m_venta`, `40_m_ruta_local_cliente`), so the generated
  `MODIFY COLUMN ... AUTO_INCREMENT` ALTER must be wrapped in
  `SET FOREIGN_KEY_CHECKS=0; ... SET FOREIGN_KEY_CHECKS=1;` to avoid errno 1834
  on populated RDS.

Then `pnpm --filter @serfel/db generate` to produce the versioned migration,
and hand-add the data seed to the generated SQL:

```sql
-- Seed 40_p_forma_pago with the forma-de-pago rows currently living in tipo_docto (same IDs)
INSERT INTO `40_p_forma_pago` (id_forma_pago, nom_forma_pago, desc_forma_pago)
SELECT id_tipo_docto, nom_tipo_docto, desc_tipo_docto
FROM `10_p_tipo_docto`
WHERE id_tipo_docto BETWEEN 3 AND 8
ON DUPLICATE KEY UPDATE nom_forma_pago = VALUES(nom_forma_pago),
                        desc_forma_pago = VALUES(desc_forma_pago);

-- Add FK now that every existing local.id_forma_pago value (all 7 in seed) has a parent row.
ALTER TABLE `10_m_local_cliente`
  ADD CONSTRAINT `loc_clie_forma_pago`
  FOREIGN KEY (`id_forma_pago`) REFERENCES `40_p_forma_pago`(`id_forma_pago`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
```

- `10_p_tipo_docto` rows: **unchanged**.
- `60_m_pago.fk_pago_tipo_docto` cascade FK: **unchanged**.
- If the FK ALTER trips errno 1834 on populated RDS, wrap in
  `SET FOREIGN_KEY_CHECKS=0/1` per the known gotcha.
- Note: this is a schema/param seed, not one of the data-seed migrations
  0004-0007 that `migrateSchemaOnly` skips. Confirm tests still build the DB
  cleanly (the FK is on a param table that the seed populates).

## 2. Shared contracts — `packages/shared/src/locales.ts`

New file mirroring `clientes.ts`:

- `localBase` field object (everything except id/rut), reused by:
  - `LocalCreateSchema` = `{ rutCliente, ...localBase }`
  - `LocalUpdateSchema` = `{ ...localBase }`
- Field validations (trim/max lengths from schema):
  nombre REQUIRED(30), telefono max15 nullable, direccion max200,
  comuna max20, email .email() max50 nullable, giro max30, contacto fields,
  topeVenta/topeCredito int >= 0, idVendedor int positive, idFormaPago int
  positive, observaciones max200, permiteVentaTopeMensual boolean.
- `LocalDto` — includes `idLocalCliente`, `rutCliente`, all fields,
  `nomFormaPago`, `nomVendedor`, `idEstado`.
- `LocalLookupsDto` — `{ formasPago: {id,nombre}[]; vendedores: {id,nombre}[] }`.
- Export all from `packages/shared/src/index.ts`.
- `comuna_local_cliente` is **not** part of the DTO/schema — the new stack does
  not surface it. The lambda keeps it in sync on write (see §3).

## 3. Backend — extend the `clientes` lambda

`lambdas/clientes/service.ts`:

- `listLocales(db, rutCliente, includeInactive)` — join to `40_p_forma_pago`
  (nomFormaPago) and `10_m_usuario` (nomVendedor); filter by `id_estado`
  unless `includeInactive`.
- `createLocal(db, input, idUsuarioMod)` — insert without an explicit
  `id_local_cliente` and read the assigned ID from `ResultSetHeader.insertId`
  (the column is now AUTO_INCREMENT). **Write both `comuna` and
  `comuna_local_cliente` from the single `comuna` input** so legacy stays
  consistent.
- `updateLocal(db, id, input, idUsuarioMod)` — same comuna sync.
- `deactivateLocal(db, id)` / `activateLocal(db, id, input)` — soft delete /
  restore via `id_estado`, mirroring cliente deactivate/activate.
- Extend the lookups function to also return:
  - `formasPago` from `40_p_forma_pago` (ordered by nombre)
  - `vendedores` from `10_m_usuario` where `id_estado = 1 AND
    id_tipo_usuario = 2` (name = nom + apellidos), ordered by name.

`lambdas/clientes/app.ts` (Hono, mounted at `/api`):

- `GET  /clientes/:rut/locales` (query `?estado=activos|inactivos|todos`)
- `POST /clientes/:rut/locales`
- `PUT  /locales/:id`
- `DELETE /locales/:id`
- `POST /locales/:id/activate`
- Lookups delivered via the existing cliente lookups endpoint (extended payload)
  or a dedicated `GET /locales/lookups` — implementer's choice, prefer reusing
  the existing lookups call the modal already loads.

**Register every new route in `infra/api.ts`** — the gateway uses an explicit
route array, not a catch-all; an unregistered route returns a CORS 404 in the
browser.

Authz: same module as clientes (child entity), via the existing
`requireModule` gate.

## 3b. Legacy PHP — drop the MAX+1 id assignment

Both `legacy-php/Distribuidor/Clases/LocalCliente.php` and
`legacy-php/Coproad/Clases/LocalCliente.php` assign the new id via
`obtNuevoIdLocalCliente()` (`SELECT MAX(id_local_cliente)+1`) and pass it
explicitly in the `INSERT`. With the column now AUTO_INCREMENT:

- Remove the `id_local_cliente` column (and its VALUES entry) from the `INSERT`
  in `ingLocalCliente()` so the DB assigns the id.
- Replace `$idLocalCliente = $this->obtNuevoIdLocalCliente();` — after the
  insert, set `$idLocalCliente = mysql_insert_id($db);` and `return $idLocalCliente;`.
- Remove the now-unused `obtNuevoIdLocalCliente()` method from both files.

**Sequencing:** the DB AUTO_INCREMENT migration must be deployed **before** the
legacy code stops sending an explicit id (otherwise the NOT NULL column has no
default and inserts fail). These are rehost Fargate images — **rebuild the PHP
images manually** per `legacy-php/README.md` after the edit (PHP is not built in
CI). Only the live `Clases/LocalCliente.php` in each app is touched; the many
`restServiceClass_*_OLD`/dated backups are dead and left alone.

## 4. Frontend — Locales tab in the cliente modal

`apps/frontend/src/app/features/clientes/cliente-modal.component.ts`:

- Add a two-tab header: **Datos** (existing form) / **Locales**.
- Widen the modal `max-width` so the local editor fits two columns.
- Locales tab, driven by an internal view signal (`'list' | 'edit'`):
  - **List view:** rows (nombre, comuna, forma de pago), a `☐ Ver inactivos`
    toggle, `[Editar]`/`[Eliminar]` on active rows, `[Restaurar]` on inactive
    rows, and a `+ Nuevo Local` button.
  - **Editor view (in-place, full width):** `‹ Volver a locales` back link +
    a 2-column form. Forma de pago and vendedor are `<select>` dropdowns bound
    to lookups. Only `comuna` is shown (not `comuna_local_cliente`).

New feature files (mirroring the clientes pattern):

- `locales-api.service.ts` — HTTP calls to the new endpoints.
- `locales-store.ts` — signals, scoped to the currently open cliente's rut;
  loads on tab open, exposes active/inactive lists, create/update/deactivate/
  activate, error handling like `clientes-store`.
- `locales-logic.ts` — pure helpers (payload mapping, validation-adjacent
  transforms) + `locales-logic.spec.ts`.

The tab only loads locales when first opened (lazy), keyed by the open cliente.

## 5. Error handling

- Reuse the clientes lambda error envelope (`AppError` + `errors.ts` codes).
- Surface known conflicts (e.g. FK/validation) as toasts / inline modal errors,
  matching `onSave` handling in `clientes-page.component.ts`.
- Deactivate is a soft delete; confirm dialog then `id_estado` flip, restorable
  from the inactivos toggle.

## 6. Testing

- `packages/shared`: `locales.spec.ts` — schema accept/reject cases.
- `lambdas/clientes/tests`: service tests for local CRUD, comuna sync (both
  columns written), lookups filters (vendedores = tipo 2 & activos), and FK
  behavior. Requires local MariaDB (`docker compose -f
  packages/db/docker-compose.yml up -d --wait`).
- `apps/frontend`: `locales-logic.spec.ts` for pure helpers.

## Open items / to confirm at implementation

- **Lookups delivery:** a dedicated `GET /locales/lookups` (rut-independent),
  gated by the added `/locales/*` module gate.

## Out of scope

- Physically dropping `comuna_local_cliente` (deferred to legacy retirement).
- Repointing `60_m_pago`'s cascade FK to `40_p_forma_pago`.
- Any change to `10_p_tipo_docto` rows or to venta/recepcion/pago semantics.
- A standalone Locales page or cross-cliente locales browsing.
