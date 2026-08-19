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
| `id_estado` | always set to activo on create (not used as a filter) |

**Disponibilidad** is derived, not a stored status:
`id_venta` is `0` or `NULL` → **Disponible**; otherwise → **Asignado**.

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
- **Estado filter dropped.** Replaced by a **Disponibilidad** filter
  (Disponible / Asignado) derived from `id_venta`.

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

### Numbering logic (preserved exactly, pure helpers)

- `nextNumero(porciones)`: `max(numero) + 1`, wrapping to `1` after `100`
  (i.e. if it would become `101`, reset to `1`). `1` when there are none.
- `POST` validation: requested `numero` must be **free among active porciones**
  for that product → else error `NUMERO_OCUPADO`.
- `grupo` selection: default `1`; if the requested `numero` already exists in the
  current `max(grupo)` for that product, use `maxGrupo + 1`.
- On create: `id_estado = activo`, `fecha = now()`, `id_usuario` from JWT claim.

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
