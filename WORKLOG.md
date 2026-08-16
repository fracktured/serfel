# Work Log

Time log for the Serfel AWS project. Entries are Claude-maintained: at the end of
a working session Claude appends a dated entry, estimating hours from git activity
(commit timestamps + stats) plus the session conversation (planning, debugging,
deploys, and other work that leaves no commit trail). Hours are informed estimates,
not stopwatch-precise. Newest entries on top.

---

## 2026-08-15 (Sat) — ~2h
**Topbar mega-menu navigation (new frontend, every page)**
- Brainstormed → spec → plan → subagent-driven execution to implement the `option-2-topbar-mega` prototype as the real navigation, replacing the flat shared navbar. Since every feature page already renders the shared `<app-navbar>`, rewrote that one component — all 5 pages inherit the mega-menu with no per-page edits; projected search slot + logout avatar preserved
- `core/nav.ts`: flat `NAV_ITEMS` record → grouped model (`NavLeaf`/`NavGroup`/`NAV_GROUPS`) + pure `visibleGroups(modulos)` access filter (drops leaves the user can't access, then empty groups). Groups: **Mantenedores** (Usuarios·Clientes·Productos), **Logística** (Listado Carga), **Ventas** (Prefacturación) — only real, accessible items; unbuilt prototype leaves (Marcas, Reportes, Configuración…) omitted, one-line to add later
- `core/navbar.component.ts`: click-to-toggle mega dropdowns (desktop) + hamburger accordion (mobile); active-leaf highlight + parent-group tint via `toSignal(NavigationEnd)`; document-click closes; group icons injected via memoized `bypassSecurityTrustHtml` + `::ng-deep`
- Executed subagent-driven: fresh implementer + spec/quality review per task (2 tasks), model-tiered (haiku transcription, sonnet component/reviews, opus final whole-branch review). Fix loops: mobile menu not closing on outside click; final review caught a CSS specificity bug where the component's `.header-nav .nav-item{background:transparent}` reset out-specified the global `.active`/`:hover` rules and killed the required active-group tint — fix wave restored the tint, memoized the icon `SafeHtml`, and pinned the exact leaf→route map in tests
- Full frontend suite green (46 tests incl. new `nav.spec.ts`); typecheck + build clean. Merged to `main` and pushed
- Interactive browser smoke of the live menu still pending (needs a logged-in Cognito dev session)
- Commits: 4 feature/fix (+ design spec + plan)

## 2026-08-13 (Thu) — ~4h
**Clientes maintainer (new `clientes` domain, `10_m_cliente`) — full vertical slice**
- Brainstormed → spec → plan → subagent-driven execution for a Clientes maintainer in the new frontend, mirroring the `usuarios` slice. Chilean **RUT** (módulo 11) + **email** validation reused; **razón social** unique; entity's PK is `rut_cliente` itself (RUT = identity, immutable on edit), so routes are keyed by the rut int
- List redesigned around derived read-columns per the user's ask: **L·M·M·J·V** route-day icons (client has an active route that weekday, via `40_m_ruta → ruta_local_cliente → local_cliente`) + **Últ. Factura** / **Últ. Nota Crédito** (MAX doc numbers; NC reached via `nc.id_venta → venta.rut_cliente` since `40_m_nota_credito` has no rut). Replaced the per-weekday correlated subqueries with 4 index-friendly queries merged in JS, then (final-review follow-up) pushed the aggregation into SQL `GROUP BY`/`MAX()` to avoid an O(all-ventas) transfer on every page load
- New reusable UX convention: a **Restaurar** button on inactive rows (one-click reactivate as-is) for any maintainer with an Inactivos/Todos filter — saved as a project memory for future maintainers
- Shared: extracted the RUT helpers into `rut.ts` (now used by usuarios + clientes); new `clientes` Zod contract (`ClienteCreate/UpdateSchema`, `ClienteDto` with `dias`/`ultFactura`/`ultNotaCredito`, lookups), 3 error codes, `clientes` authz module + nav entry (single source feeds lambda gate + guard)
- Backend `clientes` lambda (Hono): service (list 4-query merge, create/update/activate/deactivate, razón-social + RUT uniqueness, deactivate blocked only by a venta `id_estado=2`), HTTP layer + module gate, `ClientesFn` + 6 explicit routes in `infra/api.ts`
- Frontend `clientes` feature: pure logic (+spec), api service, signals store, full-field modal (RUT disabled on edit, lista-precio dropdown, permite-venta-deuda checkbox), list page (stats, filters, weekday/document table, Restaurar), guarded route + nav
- Executed subagent-driven: fresh implementer + spec/quality review per task (9 tasks), model-tiered (haiku for transcription, sonnet for logic/integration, opus for the final whole-branch review). Caught in review a `ciudad`→`cidade` key typo that silently blanked the city on every save (data loss, invisible to `tsc`); two fix loops (razón-social self-exclusion test, the ciudad typo) + a final fix wave (SQL aggregation, reactivation-decline message). Also fixed stale admin module-list assertions the new module broke (shared authz/rutas + products tests)
- Full suite green: shared 45, db 3, frontend 40, lambdas 131; typecheck + frontend build clean. Merged to `main` (--no-ff `e3f157d`) and pushed (`74bb8b7..e3f157d`, incl. the 2 unpushed docs commits)
- Infra verified by typecheck only — a real `sst deploy --stage dev` smoke test of `/clientes` in the browser is still pending
- Commits: 15 (design + plan + 13 feature/test/fix), merge on 2026-08-15

## 2026-08-12 (Wed) — ~4h
**Productos "$" detalle modal + stock editing with audit log**
- Brainstormed → spec → plan → subagent-driven execution for a new per-row **"$"** action in the productos maintainer: a modal replicating the legacy `consultaProductos` read model (Costo, Costo c/IVA, stock, Costo Total Stock, Precio Neto, Precio Venta Cliente, margen, impuesto adicional IABA/HARINA, proveedor última compra) in the new UI, **excluding** IVA Costo / IVA Precio Venta per request. Absolute-set stock edit ported from the legacy `btnModCantidad` flow, admin-only (free — the `productos` module is already tipo-1 gated)
- New **`50_m_stock_log`** audit table (migration `0010`): `id_stock_log`, `id_bodega`, `id_producto`, nullable `cantidad_antes` (NULL = no prior stock row), `cantidad_nueva`, stored `diferencia`, `fecha`, `id_usuario` + 3 FKs
- Backend (`products` lambda): `getProductoDetalle` (self-join for tipo padre, all-bodega stock sum, lista-1 price, iva/impuesto rates, max-recepción proveedor; money math ported from `PrecioProducto`/`obtInfoProducto`, single-source additional-tax rate) and `setStock` (transactional 404-check → UPSERT `50_m_stock` central → one audit row, atomic). Two routes under the existing `requireModule('productos')` gate
- Shared `ProductoDetalleDto` + `StockInputSchema`; frontend `formatMoney`/`formatQty` helpers, api methods, standalone `product-detail-modal` (read-only grid + inline stock editor), `$` button wired into the page
- Executed subagent-driven: fresh implementer + spec/quality review per task (11 tasks), model-tiered (haiku for transcription, sonnet for logic, opus for the final whole-branch review). Final review APPROVE; one fix wave (simplified a redundant Zod refine clause, documented the single-central-bodega read/write assumption, added non-admin 403 route tests). Full suite green: shared 39, db 3, frontend 33, lambdas 107; typecheck clean
- Caught in `pnpm -r test` a cross-task regression the per-task typecheck missed: `client.test.ts` table-count assertion 42→43 after the new table
- **Post-merge CORS bug (systematic-debug):** browser hit `No 'Access-Control-Allow-Origin'` on `/products/{id}/detalle`. Root cause — API Gateway (`infra/api.ts`) uses **explicit** route registration, not a catch-all; the Hono routes existed (and lambda tests bypass the gateway) but the two paths were never added to `productsRoutes`, so the gateway returned a header-less 404. Fixed by registering both, deployed to dev; verified preflight `204 + ACAO` and both routes `401` (was 404). Saved a memory so new lambda routes always get registered in `infra/api.ts`
- Merged the feature to `main` (user) + committed the API fix (`91ec0f8`); deployed to dev (admin-christian) `✓ Complete`. Migration `0010` still needs `db:migrate` before the stock-save path works
- Commits: ~15 (spec + plan + 12 feature/test + API fix)
- Added a case-insensitive text filter over the route list in `listado-carga-page.component.ts`, reusing the productos maintainer filter UI (global `.filter-dropdowns` / `.fd-field` / `.btn-clear` classes) with a "Nombre de la Ruta" input + "Limpiar" button
- Store: new `nameFilter` signal + `filteredRutas` computed; `allChecked` / `toggleAll` now operate on the filtered set so "Seleccionar todas" applies to visible rows; added a "no coincidencias" empty state
- Frontend typecheck clean; merged to `main` (ff, pushed 87 local commits to GitHub) and deployed to dev (admin-christian) — full stack `✓ Complete`, Frontend rebuilt + CloudFront invalidated
- Commits: 1

## 2026-08-11 (Tue) — ~3.5h
**Prefacturación vertical slice (new `ventas` domain) + dev deploy**
- Analyzed the legacy Angular 14 `prefacturacion` component + its `POST /preinvoice` Sequelize backend (`node-app-1`); brainstormed the migration and wrote a design spec + step-by-step implementation plan
- Key redesign: replaced the legacy N-parallel-single-pedido requests with one **batch** `POST /api/prefacturacion` — each pedido in its own transaction, process-all-and-report per row (fits the `connectionLimit:1` Lambda pool; adds per-pedido atomicity + idempotency the legacy lacked)
- Shared `@serfel/shared` Zod contract (`PrefacturaBatchInput`/`Result`, `PedidoPendienteDto`, `EmpresaDto`) + `ventas` authz module
- New `ventas` Hono lambda: `GET /prefacturacion/pendientes` (active pedidos w/o non-anulada venta), `GET /prefacturacion/empresas` (DB lookup, latest-row-per-rut over the composite PK), `POST /prefacturacion` (`prefacturarBatch`) — money math (IVA/ESPEC/ILA rounding) ported byte-for-byte from legacy; deterministic central-bodega stock read (fixes legacy last-row-wins), skip/clamp warnings, internal-company stock-skip; rates preloaded once per batch
- Frontend `prefacturacion` feature: api service, pure logic (+spec), signals store, page (empresa dropdown, search, sortable multi-select table, inline per-row facturado/error/warning status + summary counts), guarded `/prefacturacion` route + nav
- No DB migration (all tables pre-existed). Executed subagent-driven (fresh implementer + task review per task, clean final whole-branch review); 164 tests green, typecheck clean
- Fixed a regression the `ventas` module surfaced: 4 pre-existing admin module-list assertions (shared + products tests) now include `"ventas"`
- Merged to `main` (ff), deployed to dev: `VentasFn` + 3 routes created, frontend rebuilt/invalidated; smoke-checked all 3 routes 401 (authorizer-gated, live)
- Commits: 16 · Span: 15:17–21:30 (incl. ~2.8h idle on a session-limit pause)

## 2026-08-11 (Tue) — ~0.5h
**Rehost — uncategorized stock in bodega listing**
- `Lista.php` (Distribuidor + Coproad) inner-joined `20_p_tipo_producto` twice; the second join onto `tp.nivel_1` (parent category) silently dropped stock whose tipo has no `nivel_1` parent. Switched that join to `LEFT OUTER JOIN` so uncategorized/top-level stock appears in `getListaExistenciasPorBodega`
- Built the ARM64 `php-app-1` combined image, pushed to ECR `:v1`, forced a new ECS deployment on `serfel-dev-rehost`; verified running digest matches, ALB target healthy, service stable
- Commit: 1

## 2026-08-11 (Tue) — ~1h
**Listado Carga PDF — legacy JRXML layout**
- Reworked `lambdas/rutas/pdf.ts` product rows to match the legacy JasperReport (`ListadoCarga.jrxml`): airier row spacing (`lineGap`), legacy column proportions (numeric block pulled left of centre), roomy product-name column, full "Observaciones" header, wide underline; kept the new "$"-money format and current margins
- Fixed a row-desync bug: long names wrapped to two lines (pdfkit `lineBreak:false` still wraps) and broke the `moveUp`/`moveDown` per-cell alignment — added `fitName` single-line ellipsis clip
- Verified visually via qlmanage PDF→PNG renders (single-tipo + multi-tipo/overflow); `pdf.test.ts` 3/3, typecheck clean; deployed to dev (RutasFn updated)
- Commits: 1

## 2026-08-11 (Tue) — ~1h
**Producto categoría backfill (migration 0009)**
- Parsed `Productos Serfel.xls` (2744 rows); confirmed the `C`-strip belongs to the `CÓD ALT` match key (`C33331`→33331 vs `cod_serfel`), while `CATEGORÍA` (1–6) is the `id_tipo_producto` value
- New `scripts/gen-update-producto-categoria.py` + migration `0009_update_producto_categoria.sql`: 6 grouped `UPDATE ... WHERE cod_serfel IN (...)`, one per category, plus audit-field bumps; registered in `meta/_journal.json`
- Backfilled `id_tipo_producto` on 2558 matched products (186 blank-`CÓD ALT` rows skipped, no cod collisions, all cats FK-valid)
- Deployed to dev (re-bundles Migrate Lambda) then `db:migrate` → journal 9→10, verified in the products UI
- Commits: 0 (uncommitted)

## 2026-08-11 (Tue) — ~0.5h
**Usuarios num_usuario fix**
- `assertUnique` scoped the num_usuario clash to active users only; a number freed by a deactivated user (`id_estado=0`) is now reusable on create and update
- Added regression test + de-fragilized the activateUsuario test (target by RUT, not `rows[0]`)
- Deployed to dev
- Commits: 1

## 2026-08-10 (Mon) → 2026-08-11 (Tue) — ~6.5h
**Usuarios maintainer (Fase 4)**
- Design spec + step-by-step implementation plan
- Shared Zod schemas + RUT módulo-11 helpers (fixed check-digit bug)
- Usuarios lambda: CRUD, reactivate, deactivate guard, cognito enroll + tests
- Frontend: usuarios page, create/edit modal (RUT + confirm-password), signals store, nav entry
- DB: `10_m_usuario.id_usuario` → AUTO_INCREMENT (migration 0008), then FK-parent copy + `id_usuario=0` resequencing fixes; wrapped ALTER in `FOREIGN_KEY_CHECKS=0`
- Legacy PHP: AUTO_INCREMENT for id_usuario in ingUsuario (Distribuidor + Coproad)
- Deployed to dev; added cognito-idp VPC interface endpoint
- Commits: 24 · Span: 19:01–01:04

## 2026-08-10 (Mon) — ~1h
**Rehost factura fixes**
- Parallelized factura PDF downloads; raised timeout/size limits
- Set legacy-php timezone to America/Santiago
- Commits: 2 · Span: 13:21–13:42

## 2026-08-09 (Sun) — ~1.5h
**Coproad rehost build & deploy**
- Built and deployed the PHP rehost with Coproad
- Commits: 1 · ~22:11

## 2026-08-05 (Wed) — ~5.5h
**Fase 3.5b — Coproad second-business rehost**
- Design spec + implementation plan
- `stripCoproadPrefix` tenant path helper; node adapters honor `DB_SCHEMA_OVERRIDE`
- Coproad + CoproadWeb PHP dirs (schema coproad) added to shared image
- Coproad legacy Angular build + RehostCoproadFrontend StaticSite
- Infra: route `/coproad/*` to SPA, PHP, and node Functions (ordered behaviors)
- Smoke tests for Coproad SPA, node, PHP routes
- Commits: 23 · Span: 18:14–23:06

## 2026-08-04 (Tue) → 2026-08-05 (Wed) — ~2h
**Fase 5 — CloudFront WAF**
- WAF web ACL (IpReputation + KnownBadInputs + rate limit), CLOUDFRONT scope
- Attached ACL to new-app Frontend, rehost Router, and rehost legacy frontend distributions
- Documented dev deploy verification (403→404 StaticSite masking, rollback)
- Commits: 6 · Span: 23:33–00:24
