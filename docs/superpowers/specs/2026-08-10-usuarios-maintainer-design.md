# Usuarios maintainer — design

**Date:** 2026-08-10
**Phase:** Fase 4 — módulos restantes (cortes verticales). Line 268 of `plan-trabajo-app-ventas-aws.md` lists "Usuarios y mantenedores de lookups".
**Pattern source:** the Productos maintainer (`apps/frontend/src/app/features/productos/`, `lambdas/products/`, `packages/shared/src/productos.ts`).

## Goal

A new vertical slice to manage `10_m_usuario` records from the new Angular frontend, mirroring the Productos maintainer design exactly (hero + stat cards + filter row + sortable/paginated table + modal). It manages the master user record used by the still-live rehosted legacy PHP app **and** enables per-user, on-demand enrollment into Cognito (which owns authentication for the new app).

The key wrinkle: in the legacy world a "user" is a login credential in `10_m_usuario.password`; in the new world Cognito owns authentication. So user creation writes the legacy record only, and Cognito enrollment is a separate explicit action per user.

## Non-goals

- No change to the Productos maintainer design or code.
- Creating a user does **not** create a Cognito user (explicit rule).
- No migration of existing legacy passwords into Cognito.

## Decisions (resolved during brainstorming)

| Question | Decision |
|---|---|
| Password storage | Store `md5(hex)` of the password. Legacy computes `hex_md5(password)` client-side (`legacy-php/Distribuidor/js/md5-min.js`); the new lambda hashes server-side to the same format so the rehosted PHP login keeps working. The MD5 is one-way, so it is never reused for Cognito. |
| Cognito presence detection | Live: one `ListUsers` (paginated) on list load; build a `Set<id_usuario>` from each Cognito user's `custom:id_usuario`; each row gets `tieneCognito`. No schema column. Accurate, cheap at ~30 users. |
| `id_usuario` PK assignment | Make `id_usuario` `AUTO_INCREMENT` via a Drizzle migration; read `ResultSetHeader.insertId`. Matches CLAUDE.md "never hand-assign PKs". Also update legacy `Clases/Usuario.php` (Distribuidor + Coproad) to drop the `MAX(id)+1` logic. |
| Existing RUT with `id_estado=0` | On confirm, reactivate (`id_estado=1`) **and** apply the submitted form data (re-enroll + update in one step). |
| Cognito enrollment flow | `AdminCreateUser` with `DesiredDeliveryMediums=[EMAIL]` — Cognito emails a temp-password invite; the user sets their own password. Sets `email` + `custom:id_usuario`. |
| Deactivate guard | Replicate legacy `elimUsuario`: block when the user has `40_m_venta` rows with `id_estado=2` (pending payment); otherwise soft-delete (`id_estado=0`). |
| Email / num_usuario requiredness | **email required** (every user is Cognito-ready), **num_usuario optional**. |

## Architecture

New module `usuarios` added to `MODULE_ROLES` in `packages/shared/src/authz.ts` as `[1]` (Administrador). Guarded route `/usuarios` with `moduleGuard('usuarios')`, plus a navbar link. Backend is a Hono Lambda following the products structure (`index.ts` thin handler → `app.ts` router → `service.ts` logic → `authz.ts` gate), with an added `cognito.ts` helper.

### Files

**Shared (`packages/shared/src/usuarios.ts`)**
- `UsuarioInput` — create/update payload (Zod), reused by the Angular form and the lambda.
- `UsuarioDto` — list row; includes `tieneCognito: boolean`.
- `TipoUsuarioLookup` — `{ id, nombre }` from `10_p_tipo_usuario`.
- Add `usuarios: [1]` to `MODULE_ROLES` in `authz.ts`.

**Lambda (`lambdas/usuarios/`)**
- `index.ts` — opens DB pool (cached across warm invocations), extracts `custom:id_usuario` from the ID token.
- `app.ts` — Hono router mounted at `/api`:
  - `GET /usuarios?estado=activos|inactivos|todos` — list, merged with Cognito presence.
  - `GET /usuarios/lookups` — tipos de usuario.
  - `POST /usuarios` — create.
  - `PUT /usuarios/:id` — update.
  - `POST /usuarios/:id/deactivate` — soft-delete (with pending-payment guard).
  - `POST /usuarios/:id/activate` — reactivate + apply form data.
  - `POST /usuarios/:id/cognito` — enroll in Cognito.
- `service.ts` — business logic + SQL (Drizzle).
- `authz.ts` — reuse `requireModule('usuarios', deps)`.
- `cognito.ts` — `listEnrolledIds()` (ListUsers → Set of `custom:id_usuario`) and `enrollUser({ email, idUsuario })` (AdminCreateUser).

**Infra (`infra/api.ts`)**
- Register the `usuarios` lambda.
- Grant IAM `cognito-idp:ListUsers` and `cognito-idp:AdminCreateUser` on the user pool.
- Inject `userPoolId` (from `infra/auth.ts`) as an env var.

**DB (`packages/db`)**
- Migration: `ALTER TABLE 10_m_usuario MODIFY COLUMN id_usuario int AUTO_INCREMENT` (must not renumber existing rows; `id_usuario` is referenced by many FKs — this only affects new-insert behavior).
- `schema.ts`: add `.autoincrement()` to `t10MUsuario.idUsuario`.

**Frontend (`apps/frontend/src/app/features/usuarios/`)**
- `usuarios-page.component.ts` — hero, stat cards, filter row, sortable/paginated table (mirrors `productos-page.component.ts`).
- `usuarios-store.ts` — signals store (mirrors `productos-store.ts`).
- `usuarios-api.service.ts` — HTTP client.
- `usuarios-logic.ts` (+ `.spec.ts`) — pure functions: RUT módulo-11, filters, sort, CSV export.
- `usuario-modal.component.ts` — create/edit form with the password + confirm-password fields.
- `app.routes.ts` + navbar: add the guarded `/usuarios` route and link.

## Validation (Zod, shared by Angular form + lambda)

- **RUT**: single field `12345678-9`; split into `rut_usuario` (int) + `dv_usuario` (1 char). **Módulo-11**: computed DV must match the entered DV (`K`/`0` handled). **Unique** on `rut_usuario`.
- **num_usuario**: optional; if present, numeric and **unique among rows where `num_usuario != 0`**.
- **email**: **required**, valid email, **unique**.
- **Required fields**: nombres, ap_paterno, ap_materno, fono_usu, dire_usu, password, id_tipo_usuario.
- **Password**: sent as plaintext over HTTPS; the lambda stores `md5(hex)`. A "confirmar contraseña" field is **frontend-only** (must equal password; never transmitted).

## Create flow & reactivation

`POST /usuarios`:
1. Look up the RUT.
2. Exists & **active** (`id_estado=1`) → `409 RUT_EN_USO`.
3. Exists & **inactive** (`id_estado=0`) → `409 RUT_INACTIVO { idUsuario }`.
4. Otherwise validate num_usuario/email uniqueness → INSERT (AUTO_INCREMENT id, `md5(hex)` password, `id_usuario_mod` = acting admin's `custom:id_usuario`) → return `insertId`.

Frontend: on `RUT_INACTIVO`, show a confirm dialog ("este RUT existe pero está inactivo, ¿reactivar?"). On OK, call `POST /usuarios/:id/activate` with the entered form data → sets `id_estado=1` and applies the form (re-enroll + update).

## Cognito presence & enrollment

- **Presence** (`cognito.ts` `listEnrolledIds`): paginate `ListUsers`, read `custom:id_usuario` per user, build a `Set<number>`. `custom:` attributes are not server-filterable, so matching happens in code over ~30 users. The list endpoint merges `tieneCognito = set.has(row.idUsuario)`.
- **Enrollment** (`POST /usuarios/:id/cognito`): only offered when `!tieneCognito`. Loads the user, requires a valid email, calls `AdminCreateUser({ Username: email, UserAttributes: [email, custom:id_usuario], DesiredDeliveryMediums: [EMAIL] })`. Cognito emails a temp-password invite; the user sets their own password on first login. Independent of the legacy MD5 password.

## Deactivate (delete)

Replicates legacy `elimUsuario`: query `40_m_venta v JOIN 30_m_pedido p ON v.id_pedido = p.id_pedido WHERE p.id_usuario = :id AND v.id_estado = 2`. If any rows → `409 USUARIO_CON_VENTAS_PENDIENTES`. Otherwise `UPDATE ... SET id_estado=0, ult_fecha_mod=NOW(), id_usuario_mod=:admin`. Restore is the "Inactivos" filter + activate, same as Productos.

## Legacy PHP changes (AUTO_INCREMENT alignment)

In both `legacy-php/Distribuidor/Clases/Usuario.php` and `legacy-php/Coproad/Clases/Usuario.php`:
- Remove `obtNuevoIdUsuario()`.
- In `ingUsuario`, drop `id_usuario` from the INSERT column list and its value, letting AUTO_INCREMENT assign it.
- Return the auto-assigned id (`mysql_insert_id`) instead of the pre-computed one.

## Testing

- `usuarios-logic.spec.ts` — RUT módulo-11 (including `K`/`0`), filters, sort, CSV.
- Service tests against local MariaDB (`docker compose -f packages/db/docker-compose.yml up -d --wait`): RUT/num/email uniqueness, `RUT_EN_USO` vs `RUT_INACTIVO`, activation applies form data, deactivate guard blocks on pending payment.
- Cognito helper: unit-test the ListUsers→Set mapping with a mocked client; the AdminCreateUser call is integration-verified in `dev`.

## Open follow-ups (not blocking)

- Confirm the Cognito invite email template/verification is acceptable in `dev` before prod.
- Manual browser smoke (login → create → activate → enroll in Cognito) on the CloudFront URL, as with Productos.
