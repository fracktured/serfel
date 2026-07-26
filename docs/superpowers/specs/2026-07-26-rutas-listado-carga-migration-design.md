# Rutas / Listado Carga migration — design

**Date:** 2026-07-26
**Status:** Approved (design), pending implementation plan

## Goal

Migrate the last legacy Node (Express + Sequelize) service — the **route
service** (`lambdas/node-app-3/_legacy`) — to the modern Drizzle + Hono Lambda
pattern established by `lambdas/products`, and build the matching
**Listado Carga** frontend module in the new standalone Angular app
(`apps/frontend`), using the legacy `rutas/listado-carga` component as the
functional reference.

The legacy service exposes exactly two endpoints (Basic auth, no in-code role
check):

1. `GET /routes/` → all active routes (`id_estado = 1`).
2. `POST /routes/cargoList` (body = selected routes) → streams a "Listado
   Carga" PDF built with pdfkit.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Backend wiring | **Separate `RutasFn` lambda** (`lambdas/rutas/`); each lambda registers explicit API Gateway routes (the products `/api/{proxy+}` catch-all is replaced with explicit product routes) |
| Module access | **Admin only** — `MODULE_ROLES.rutas = [1]` |
| PDF fidelity | **Keep exact legacy pdfkit layout** (same columns, page-per-tipo, header/footer) |
| Frontend UI | **Native to the new frontend** — lightweight checkbox list + "Imprimir", no `ng-multiselect-dropdown` dependency |

Role reference (`10_p_tipo_usuario`): `0 Sin Info, 1 Administrador,
2 Vendedor, 3 Secretaria`.

## Non-goals (YAGNI)

- Route CRUD / route-local management (the legacy `listRutas` PHP screens) — out
  of scope; only list + cargo-list PDF are being ported.
- The `routeByDay` / pedidos-oriented `RutaREST` PHP endpoints.
- Any change to the products lambda's application code. (Its API Gateway routes
  change from the `/api/{proxy+}` catch-all to explicit routes, but `app.ts`,
  the service, and the frontend `productos-api.service.ts` paths are untouched —
  `/api/me`, `/api/lookups`, `/api/products*` keep their existing URLs.)
- Shared extraction of `authz.ts` / `errors.ts` across lambdas (deliberately
  duplicated for now; revisit if a third consumer appears).

## Architecture

### Backend: `lambdas/rutas/` (new `RutasFn`)

Mirrors the products lambda's split, plus a dedicated PDF module so the report
layout is isolated and independently testable.

| File | Responsibility |
|------|----------------|
| `index.ts` | Lambda handler: DB secret bootstrap + JWT `custom:id_usuario` → `idUsuario` (copied from `lambdas/products/index.ts`) |
| `app.ts` | Hono app: routes `GET /api/routes`, `POST /api/routes/cargoList`; `onError` mapping; `requireModule("rutas")` gate; JSON-body validation via `RutaSelectionSchema` |
| `service.ts` | Drizzle queries returning **pure data** (`listActiveRutas`, `getCargoListData`); `getUserTipo` |
| `pdf.ts` | `renderCargoListPdf(data: CargoListData): Promise<Buffer>` — pdfkit, exact legacy layout, no DB access |
| `authz.ts` | `requireModule(module, deps)` — mirror of `lambdas/products/authz.ts` |
| `errors.ts` | `AppError` + `isDbUnreachable` — mirror of products |
| `types.ts` | `AppDeps`, `AppEnv` — mirror of products |
| `tests/service.test.ts` | Query-shape / data-mapping tests |
| `tests/app.test.ts` | Hono app with injected deps (pattern from `lambdas/products/tests`) |
| `tests/pdf.test.ts` | `renderCargoListPdf(sample)` returns a `Buffer` beginning with `%PDF` |

**Key structural change vs legacy:** the legacy `ListadoCargaService`
interleaves SQL and pdfkit and streams via `doc.pipe(res)`. Lambda cannot stream
to a socket, so:

- `service.ts` returns a plain `CargoListData` object (no pdfkit import).
- `pdf.ts` buffers the whole document: `const chunks: Buffer[] = []; doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.end();`
- `app.ts` returns it with `content-type: application/pdf`.

This makes the data query and the PDF rendering separately unit-testable.

### Data logic (`service.ts`)

**`listActiveRutas(db): Promise<RutaDto[]>`**

```sql
SELECT id_ruta, nom_ruta, id_usuario, num_dia, id_estado
FROM 40_m_ruta
WHERE id_estado = 1
ORDER BY nom_ruta
```

(Legacy returned unordered; `ORDER BY nom_ruta` added for a stable UI list.)

**`getCargoListData(db, idRutas: number[]): Promise<CargoListData>`** — three
queries joined in code.

1. **Detail** (one row per product):

```sql
SELECT pv.id_producto, p.cod_serfel, p.nom_producto, um.nom_um, tp.nom_tipo_producto,
       SUM(pv.cantidad)                                              AS sumCantidad,
       SUM(pv.cantidad * (pv.precio - pv.precio*pv.porcen_desc/100)) AS subtotal
FROM 40_m_producto_venta pv
JOIN 40_m_venta v               ON v.id_venta = pv.id_venta AND v.entregado = 0 AND v.id_estado = 3
JOIN 40_m_ruta_local_cliente rl ON rl.id_local_cliente = v.id_local_cliente AND rl.id_ruta IN (:idRutas)
JOIN 20_m_producto p            ON p.id_producto = pv.id_producto
JOIN 20_p_unidad_medida um      ON um.id_um = p.id_um
JOIN 20_p_tipo_producto tp      ON tp.id_tipo_producto = p.id_tipo_producto
GROUP BY pv.id_producto, p.cod_serfel, p.nom_producto, um.nom_um, tp.nom_tipo_producto
ORDER BY tp.nom_tipo_producto, p.nom_producto
```

Two deliberate simplifications over the legacy Sequelize version:
- Join `40_m_ruta_local_cliente` directly on `venta.id_local_cliente`; drop the
  intermediate `local` join (same key, added nothing).
- Group by all selected non-aggregate columns rather than `id_producto` alone,
  so the query is `ONLY_FULL_GROUP_BY`-safe instead of relying on MariaDB's
  permissive mode.

2. **Porciones / "Obs"** — reimplemented as its own deterministic query. (The
   legacy grouped-join-with-`include` produced ambiguous porciones rows; this is
   the one place we replicate *intent*, not mechanism.)

```sql
SELECT po.id_producto, po.numero
FROM 20_m_porcion po
JOIN 40_m_venta v               ON v.id_venta = po.id_venta AND v.entregado = 0 AND v.id_estado = 3
JOIN 40_m_ruta_local_cliente rl ON rl.id_local_cliente = v.id_local_cliente AND rl.id_ruta IN (:idRutas)
```

Grouped in code into `Map<idProducto, numero[]>` → rendered `N(1-2-3)`.

3. **Totals**:

```sql
SELECT COUNT(v.id_venta) AS numFacturas, SUM(v.precio_total) AS total
FROM 40_m_venta v
JOIN 40_m_ruta_local_cliente rl ON rl.id_local_cliente = v.id_local_cliente AND rl.id_ruta IN (:idRutas)
WHERE v.entregado = 0 AND v.id_estado = 3
```

Constants: `ESTADO_ACTIVO = 1`, `ESTADO_FINALIZADO = 3`, `entregado = 0`.

**`CargoListData` shape** (consumed by `pdf.ts`):

```ts
interface CargoListRow {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  nomUm: string;
  nomTipoProducto: string;
  sumCantidad: string;   // truncated to 2 decimals — see Open Questions
  subtotal: number;
  obs: number[];         // porcion numeros, [] when none
}
interface CargoListData {
  nomRutas: string;      // "Ruta Sur, Ruta Centro"
  rows: CargoListRow[];  // already ordered by tipo, nombre
  totals: { numFacturas: number; total: number };
}
```

### PDF (`pdf.ts`)

Port the legacy pdfkit code verbatim in layout: Letter, margins 20/20/10/10;
header `LISTADO CARGA` + `Rutas:` + `Fecha Informe:` + page number; columns
`N | Nombre Producto | Precio Total | Cantidad | UM | Obs` with the same column
widths/offsets; a **new page per `tipo_producto`** with the tipo title repeated;
per-row underline; footer `Cantidad Facturas: N   Total: $X` (thousands with
`Intl.NumberFormat('de-DE')`). Replace the `dateformat` dependency with a small
inline `dd-mm-yyyy` formatter.

### Shared package (`@serfel/shared`)

New `packages/shared/src/rutas.ts` (re-exported from `index.ts`):

```ts
export interface RutaDto {
  idRuta: number; nomRuta: string; idUsuario: number; numDia: number; idEstado: number;
}
// cargoList body: only id + nom are needed (nom feeds the PDF "Rutas:" header)
export const RutaSelectionSchema = z
  .array(z.object({ idRuta: z.number().int().positive(), nomRuta: z.string().min(1) }))
  .min(1);
export type RutaSelection = z.infer<typeof RutaSelectionSchema>;
```

`authz.ts`: `MODULE_ROLES` gains `rutas: [1]`. This is the only authz edit —
`/me`, `modulesForTipo`, and `moduleGuard('rutas')` all derive from it. Empty
selection reuses the existing `VALIDACION` error code (legacy threw
"Debe enviar rutas").

### Infra (`infra/api.ts`)

The products catch-all is first replaced with explicit routes (done ahead of
this migration, at the user's request) so each lambda owns its own paths with no
route-precedence coupling:

```ts
const productsRoutes = [
  "GET /api/me",
  "GET /api/lookups",
  "GET /api/products",
  "POST /api/products",
  "PUT /api/products/{id}",
  "DELETE /api/products/{id}",
  "POST /api/products/{id}/restore",
] as const;
```

Add `RutasFn` as a clone of `ProductsFn`: same VPC/subnets/SG, `DB_SECRET_ARN`
env, `secretsmanager:GetSecretValue` permission, `rds-global-bundle.pem`
`copyFiles`, `transform.function.name = "serfel-dev-rutas"`, and
`nodejs: { install: ["pdfkit"] }` (see PDF gotcha). Then register its two
explicit routes:

```ts
api.route("GET /api/routes", rutasFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
api.route("POST /api/routes/cargoList", rutasFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
```

Every route is explicit, so there is no most-specific-wins dependency between
the two lambdas. OPTIONS remains unrouted (gateway answers preflight),
consistent with today.

**pdfkit-in-Lambda gotcha:** pdfkit loads `.afm` font-metric files at runtime,
which esbuild will not trace. Keep pdfkit unbundled via SST
`nodejs: { install: ["pdfkit"] }` so `data/*.afm` ships intact. Binary
response path: Hono's `hono/aws-lambda` adapter base64-encodes non-text bodies
and sets `isBase64Encoded`; HTTP API decodes it, so the browser receives a valid
PDF.

### Frontend: `apps/frontend/src/app/features/rutas/`

Follows the productos POC conventions (standalone components, signals store,
thin API service). No shared nav shell exists (`app.html` is just
`<router-outlet/>`), so wiring is limited to a route.

| File | Responsibility |
|------|----------------|
| `rutas-api.service.ts` | `list(): Observable<RutaDto[]>` → `GET {apiUrl}/api/routes`; `cargoList(sel: RutaSelection): Observable<Blob>` → `POST {apiUrl}/api/routes/cargoList` with `responseType: 'blob'` |
| `rutas-store.ts` | Signals: `rutas`, `selected` (Set of idRuta), `loading`, `errorMsg`, `generating`. Actions: `load()`, `toggle(idRuta)`, `selectAll()`, `clear()`, `generatePdf(): Promise<Blob>`. Reuses the `apiError()` helper pattern from `productos-store.ts`. |
| `rutas-page.component.ts` | Standalone page: checkbox list of routes + select-all + "Imprimir listado" button (disabled when none selected or while generating); loading + error UI consistent with productos; on success the component builds the object URL and `window.open`s it (browser side-effect stays out of the store). |

`app.routes.ts`: add
`{ path: 'rutas', component: RutasPageComponent, canActivate: [moduleGuard('rutas')] }`.

The `cargoList` body sends `[{ idRuta, nomRuta }]` for the selected routes
(`nomRuta` is required for the PDF header). The existing `auth.interceptor`
attaches the JWT; the existing `toast.service` surfaces errors.

**Frontend tests:** unit-test any pure store logic (selection toggling,
selectAll/clear); the PDF itself is asserted backend-side.

## Error handling

Reuse the products lambda's `onError` contract: `AppError` → mapped status +
`{ error: { code, message } }`; `isDbUnreachable` → 503 `DB_NO_DISPONIBLE`
(dev DB is stopped often); unknown → 500 `ERROR_INTERNO`. `403` for
unauthenticated (`NO_AUTORIZADO`) / unauthorized module (`PROHIBIDO`), same as
products. Empty route selection → `400 VALIDACION`.

## Testing strategy

- **`service.ts`**: verify query shape and the in-code joining of detail +
  porciones + totals into `CargoListData` (mock/inject `db`, as products does).
- **`pdf.ts`**: `renderCargoListPdf` on representative data returns a non-empty
  `Buffer` starting with `%PDF`; covers empty rows and the multi-tipo page break.
- **`app.ts`**: routes with injected deps — auth gate (missing `idUsuario` → 403,
  wrong tipo → 403), `GET /api/routes` happy path, `POST /api/routes/cargoList`
  validation (empty body → 400) and success (application/pdf).
- **frontend store**: selection logic.

## Open questions / risks (non-blocking)

1. **`sumCantidad` truncation quirk.** Legacy computes
   `String(sum).slice(0, -1)` on a `DECIMAL(18,3)` sum — i.e. truncate (not
   round) to 2 decimals (`12.000` → `12.00`). The spec reproduces this
   faithfully. Confirm during review whether to keep the quirk or format
   properly to 2 decimals with rounding.
2. **Porciones "Obs" semantics.** Reimplemented deterministically as distinct
   `porcion.numero` per product across the matching ventas. Confirm this matches
   operator expectations (the legacy grouped-join behavior was ambiguous).
3. **`GROUP BY` functional dependency.** Detail query groups by all selected
   columns (safe); confirm no reporting difference vs the legacy `id_producto`
   grouping.
4. **pdfkit bundling.** `nodejs: { install: ["pdfkit"] }` is the intended fix; a
   deploy smoke test of `POST /api/routes/cargoList` validates the `.afm` files
   ship correctly.
