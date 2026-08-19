# Porciones Management — Serfel 2.0

**Date:** 2026-08-19
**Status:** Approved design, pending implementation plan

## Summary

Add porciones ("portions") management to the Serfel 2.0 productos maintainer.
A product stocked by weight (e.g. cheese in kg) is physically cut and sold as
individually numbered pieces. Each `20_m_porcion` row is one physical piece.
Users need a per-product modal to list, create, and delete these pieces.

Ported from the legacy `docs/legacy/porcion.service.ts` (Node/Sequelize).

## Domain model

Table `20_m_porcion` (already in `packages/db/src/schema.ts`):

| Column | Meaning |
|---|---|
| `id_porcion` | PK, autoincrement |
| `id_producto` | FK to product |
| `fecha` | creation timestamp |
| `grupo` | group counter; bumps when a `numero` collides with an active piece |
| `numero` | physical label 1..100 (wraps) |
| `cantidad` | weight of this piece, decimal(18,3) |
| `id_venta` | nullable; set when the piece is sold |
| `id_usuario` | creator (from ID-token `custom:id_usuario`) |
| ~~`id_estado`~~ | **being dropped** — redundant under hard-delete (see DB migration) |

**Estado / disponibilidad** is derived from `id_venta`, not a stored status:
`id_venta` is `0` or `NULL` → **Disponible**; otherwise → **Asignado**.
This derived Disponible/Asignado is the status filter shown to users.

## Scope decisions

- **Fold into the existing `products` Lambda** — porciones share product data and
  the `productos` authz module. No new Lambda, no new MODULE_ROLES module (avoids
  rippling into hardcoded module-list test fixtures).
- **Button on every product row**, colored by the `usaPorciones` flag:
  red when `usaPorciones === 0`, green when `=== 1`.
- **New table filter** `usa_porciones` (Todos / Porcionados / No porcionados),
  client-side, alongside the existing productos filters.
- **Creating a porción never touches `usaPorciones`** — the flag stays edited only
  via the existing "Es porcionado" checkbox in the product modal.
- **Hard delete** (matches legacy `remove()`), blocked when `id_venta` is set.
  No soft-delete / Restaurar for porciones.
- **Drop the `id_estado` column** from `20_m_porcion` — it is redundant under
  hard-delete (rows are always effectively active). The user-facing status filter
  becomes **Disponible / Asignado**, derived from `id_venta`.

## DB migration

Drop the redundant `id_estado` column from `20_m_porcion`:

1. Edit `packages/db/src/schema.ts`: remove `idEstado` from `t20MPorcion` and the
   `fk_porcion_estado` foreign key.
2. `pnpm --filter @serfel/db generate` to produce a versioned migration
   (`ALTER TABLE 20_m_porcion DROP FOREIGN KEY fk_porcion_estado; DROP COLUMN id_estado`).
3. Deploy (SST) **before** `db:migrate` so the migrate Lambda bundles the new
   migration.

Verified safe: no application code (only drizzle meta snapshots) references
`fk_porcion_estado` / the porción `id_estado`. Legacy Node still writes the
column but is being retired; the drop does not affect Serfel 2.0 reads.

## Backend

### Structure

Porcion logic lives in a dedicated module inside the products Lambda
(`lambdas/products/porciones.ts`) to keep `service.ts` focused; routes are added
to `lambdas/products/app.ts`. Pure numbering helpers are separated for unit
testing.

### Endpoints (mounted at `/api`, gated by `requireModule('productos')`)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/products/:id/porciones` | List a product's porciones + `nextNumero`. Optional query filters: `numero`, `factura`, `disponibilidad`. |
| `POST` | `/products/:id/porciones` | Create a porción from `{ numero, cantidad }`. |
| `DELETE` | `/porciones/:idPorcion` | Hard-delete; blocked if `id_venta` is set. |

Each new route MUST also be added to the explicit route array in `infra/api.ts`,
or the browser receives a CORS 404 (the gateway uses explicit routes, not a
catch-all).

### Query filters (fold legacy findBy* into the GET)

- `numero=<int>` — exact `numero` match.
- `factura=<int>` — join `20_m_porcion → 40_m_venta` on `num_docto_emitido`.
- `disponibilidad=disponible|asignado` — `disponible`: `id_venta IS NULL OR id_venta = 0`; `asignado`: otherwise.

Default order: `grupo DESC, numero DESC`, limit 100 (legacy parity).

### Numbering & grupo logic (adapted from legacy; `id_estado` ACTIVO → `id_venta`-derived Disponible)

`grupo` is a **batch/age marker**: products routinely exceed 100 pieces, so `numero`
wraps at 100 and each wrap starts a newer grupo ("that piece is from last week's
batch"). The physical label of a piece is the `(grupo, numero)` pair.

- `nextNumero(porciones)`: take the top piece ordered by `grupo DESC, numero DESC`,
  add `1`; wrap to `1` if it would exceed `100`; `1` when there are none. Suggests
  the next physical label, continuing within the current batch.
- **Collision (`NUMERO_OCUPADO`)**: the requested `numero` must be free among the
  product's **Disponible** pieces (`id_venta` NULL or `0`). A **sold** (Asignado)
  piece keeps its `numero` in the table but does NOT block a new available piece —
  it instead drives the grupo bump below. (This replaces legacy's "free among
  ACTIVE" check, since selling a piece used to flip it out of active.)
- **grupo selection**: default `1`; `maxGrupo = MAX(grupo)` for the product. If a
  piece with `(numero, grupo = maxGrupo)` already exists (Disponible **or**
  Asignado), assign `grupo = maxGrupo + 1`. Each wrap-around thus becomes a new,
  younger batch. **Deliberate deviation:** legacy did `grupo++` from a hardcoded
  `1`, capping grupo at 1 or 2 (a bug); we use `maxGrupo + 1` so grupo is a true
  monotonic batch/age counter, matching its intended meaning.
- On create: `fecha = now()`, `id_usuario` from JWT claim. (No `id_estado` — column
  dropped.)

### Errors (existing `AppError` shape)

- `NUMERO_OCUPADO` (400) — numero taken by another active porción.
- `PORCION_VENDIDA` (400) — delete attempted on a porción with `id_venta` set.
- `NO_ENCONTRADO` (404) — product or porción does not exist.
- `VALIDACION` (400) — bad input (via Zod).
- DB unreachable → 503 (existing handler).

## Shared contract (`packages/shared`)

Single source of truth, reused by Lambda and Angular form:

- `PorcionInputSchema` — `{ numero: int >= 1, cantidad: decimal string > 0 }`.
- `PorcionDto` — porción row plus derived `disponibilidad` and, when Asignado,
  read-only venta info (`idVenta`, `numDoctoEmitido`).
- `PorcionesListDto` — `{ porciones: PorcionDto[], nextNumero: number }`.

## Frontend (`apps/frontend`)

### Productos maintainer table

- New per-row **Porciones** button on every row; class/color bound to
  `p.usaPorciones` (red `0`, green `1`).
- New `usa_porciones` filter dropdown wired into the productos store filter state
  (client-side, mirrors existing `idMarca` filter).

### New `porciones-modal.component.ts`

- Opened with a `idProducto` input (mirrors `product-detail-modal`).
- Lists porciones: `numero`, `grupo`, `cantidad`, disponibilidad badge, and
  factura/doc when Asignado.
- Add-form: `numero` (defaults to `nextNumero`, editable), `cantidad`.
- Delete button per row: hidden/disabled on Asignado rows.
- Filter controls inside the modal: `numero`, `factura`, `disponibilidad`.
- `porciones-api.service.ts` + store slice, mirroring the products feature layout.

## Testing

- **Unit (fast):** pure numbering helpers — wrap-at-100, collision detection,
  grupo-bump.
- **Service (local MariaDB):** create/list/delete happy paths, `NUMERO_OCUPADO`,
  `PORCION_VENDIDA`, disponibilidad + factura filters. Requires
  `docker compose -f packages/db/docker-compose.yml up -d --wait`.
- **Frontend logic spec:** `usa_porciones` filter and button-color mapping.

## Out of scope

- Assigning a porción to a venta (happens in the sales flow, not this maintainer).
- Editing the `usaPorciones` flag (already handled in the product modal).
- Any porción "restore"/soft-delete workflow.
