# Design: `bloquear_venta` — block sales to flagged clients

**Date:** 2026-08-20
**Status:** Approved

## Summary

A boolean flag on a client (`10_m_cliente.bloquear_venta`) that, when set to `1`,
removes that client's locales from the "buscar cliente" search in the legacy
pedidos flow — so vendors cannot create orders (pedidos) for that client. The flag
is editable in the Serfel 2.0 clientes maintainer (Serfel schema). For the Coproad
variant the column and the search filter exist, but the flag is set directly in the
DB (no Coproad UI).

Stored as `tinyint` (not a native boolean) to match Drizzle/MariaDB constraints and
the existing `permite_venta_deuda` column, which this feature mirrors line-for-line
across every layer.

## Scope decisions

- **Variants:** Serfel **and** Coproad (both schemas get the column + search filter).
- **Serfel 2.0 maintainer UX:** blocked clients stay visible in the list with a
  badge/indicator; the flag is an editable checkbox in the client modal.
- **Legacy pedidos behavior:** blocked clients are **silently absent** from search
  results (no greyed-out row, no message).
- **Coproad edit path:** filter only, no Coproad UI. Blocking a Coproad client is a
  manual/DB operation for now.

## 1. Data model

### Serfel schema (Drizzle-managed)
- `packages/db/src/schema.ts`: add to `t10MCliente`:
  ```ts
  bloquearVenta: tinyint("bloquear_venta").default(0).notNull(),
  ```
- Generate the migration: `pnpm --filter @serfel/db generate` → produces a new
  versioned file in `packages/db/migrations/`.
- **Deploy order:** run `sst deploy` (bundles the migration into the migrate Lambda)
  **before** `db:migrate`, otherwise the new migration silently no-ops.

### Coproad schema (static dump, no Drizzle path)
- Update `packages/db/dump/coproad/legacy-schema.sql`: add the column to the
  `10_m_cliente` CREATE TABLE (place it after `permite_venta_deuda`, matching the
  Serfel column definition).
- Apply a one-off DDL to the **live** coproad schema:
  ```sql
  ALTER TABLE `10_m_cliente`
    ADD COLUMN `bloquear_venta` tinyint(4) NOT NULL DEFAULT 0;
  ```

## 2. Shared DTO — `packages/shared/src/clientes.ts`

- Add to `clienteBase` (flows into both `ClienteCreateSchema` and
  `ClienteUpdateSchema`):
  ```ts
  bloquearVenta: z.boolean().default(false),
  ```
- Add to `ClienteDto`:
  ```ts
  bloquearVenta: boolean;
  ```

## 3. Clientes Lambda — `lambdas/clientes/service.ts`

Mirror `permiteVentaDeuda` exactly:
- Select projection: add `bloquearVenta: t10MCliente.bloquearVenta`.
- Row type: add `bloquearVenta: number`.
- DTO builder: `bloquearVenta: r.bloquearVenta === 1`.
- `writeValues`: `bloquearVenta: input.bloquearVenta ? 1 : 0`.

No new Hono route → no `infra/api.ts` change required.

## 4. Serfel 2.0 frontend — `apps/frontend/src/app/features/clientes/`

- `cliente-modal.component.ts`:
  - Add a `bloquearVenta = false` field.
  - Add a **"Bloquear venta"** checkbox in the template next to the existing
    `permiteVentaDeuda` checkbox.
  - Load from `this.cliente.bloquearVenta` on edit; include `bloquearVenta` in the
    emitted save payload.
- `clientes-page.component.ts`:
  - Include `bloquearVenta` in the row → modal mapping.
  - Render a **"Bloqueado"** badge/indicator on rows where `bloquearVenta` is true.
    Clients remain visible so they can be un-blocked.
- `clientes-logic.ts`: if the badge (or any count/stat) is derived here, add the
  corresponding helper — consistent with the existing `conDeuda` stat.

## 5. Legacy search filter (the enforcement point)

The two "buscar cliente" buttons in the legacy Angular 14 pedidos flow call
`LocalClienteREST::findByRut` / `findByName`, which funnel through two DAO methods.
Both already `INNER JOIN 10_m_cliente c`, so the filter is a single WHERE clause per
method.

- `legacy-php/Distribuidor/Clases/DAO/LocalClienteDAO.php`:
  - `listarPorRut`: add `AND c.bloquear_venta = 0` to the WHERE.
  - `listarPorRazonSocialONombre`: add `AND c.bloquear_venta = 0` to the WHERE.
- `legacy-php/Coproad/Clases/DAO/LocalClienteDAO.php`: same two edits.

These DAO methods are called **only** by the two search endpoints, so no other flow
(e.g. loading locales for an existing pedido) is affected.

**Deploy:** PHP is not built in CI. Rebuild the legacy PHP Fargate images manually
per `legacy-php/README.md` after these edits.

## Testing

- **Lambda:** extend `lambdas/clientes/tests/service.test.ts` and
  `tests/app.test.ts` fixtures with `bloquearVenta`; assert it round-trips through
  create → get and update → get. (Column additions have historically rippled into
  hardcoded fixtures — check for other cliente fixtures.)
- **Frontend:** add coverage in `clientes-logic.spec.ts` if the badge/stat is
  derived from a logic helper.
- **Legacy DAO:** no PHP test harness; verify via smoke test — a client with
  `bloquear_venta = 1` must not appear in either search, and `= 0` must appear.

## Out of scope

- No Coproad UI for editing the flag.
- No block indicator in the legacy pedidos UI (blocked = absent).
- No change to the legacy Serfel cliente maintainer (Serfel clients are edited in
  Serfel 2.0).
