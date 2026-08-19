# Work Log

Time log for the Serfel AWS project. Entries are Claude-maintained: at the end of
a working session Claude appends a dated entry, estimating hours from git activity
(commit timestamps + stats) plus the session conversation (planning, debugging,
deploys, and other work that leaves no commit trail). Hours are informed estimates,
not stopwatch-precise. Newest entries on top.

---

## 2026-08-19 (Tue) — ~1h
**Testing: tramo discount tiers in the order-detail modal**
- Manual + suite testing of the `feature/tramos-descuento-modal-pedido` work (the pre-merge checks that couldn't run in the build env)
- No commits (verification only)

## 2026-08-18 (Mon) — ~1.5h
**Pedidos legacy: discount tramos in the crear/modificar order-detail modal (PHP → Angular 14)**
- Brainstormed → design spec (`docs/superpowers/specs/2026-08-18-tramos-descuento-modal-pedido-design.md`) + step-by-step plan (`docs/superpowers/plans/…`); executed subagent-driven (fresh implementer + per-task review + final whole-branch review, all clean)
- **Data-flow gap found & closed**: the tramo columns were already SELECTed by `PrecioProductoDAO` and held on the POJO, but `PrecioProductoMapper::fromEntityToDTO` dropped them. Backend order-creation does **no** discount validation, so it was left untouched per design (cap lives in the client modal)
- **Backend PHP** (Serfel `Distribuidor` + Coproad `Coproad`, byte-identical): Mapper now emits `cantTramoN`/`maxPorcenTramoN`; `RegListProductoPedido` POJO + `ProductoPedidoDAO.listProductoPedidoComoRegListProductoPedido` SELECT gained the six tramo columns so the **modify** flow carries them too
- **Frontend** (`apps/legacy-frontend`): optional tramo fields on `PrecioProductoModel`; new pure, unit-tested `tramos.ts` (`getTechoEfectivo`/`getTramosActivos`/`getTramoActivoCant`) — ceiling = base `maxPorcenDesc` + highest reached ascending active tramo (`cant_tramoN > 0`)
- **Modal** (`modal-detalle-producto`, shared by crear + modificar): shows active tiers with the quantity-matched tier bold + a "% Desc máx (aplica)" label; on qty change recomputes the ceiling both directions and auto-clamps the typed % **down** only when it drops; Agregar validates against the effective ceiling
- Verified: `tsc --noEmit` clean for changed files; reviewer hand-traced all 13 tramo assertions. **Pre-merge TODO** (env can't run here): execute Karma `tramos.spec.ts` + manual UI pass on a Node 16 + Chrome host. 3 Minor findings parked (ascending-tramo assumption etc., all outside spec's guaranteed inputs)
- Commits: 3 on branch `feature/tramos-descuento-modal-pedido` (not merged) · Span: 19:55–20:02 (+ spec/plan docs)

## 2026-08-18 (Mon) — ~0.75h
**Precios grid: wider table, tramo % display, tramo bulk edits (shared → lambda → frontend)**
- Brainstormed → design spec (`docs/superpowers/specs/2026-08-18-precios-component-enhancements-design.md`); implemented TDD
- **Table**: widened the precios page to `1560px` (component-scoped `.page-body` override; other pages stay 1280px) for its 12-column grid
- **Tramo display**: each populated tramo cell now shows its `cantidad` pill **plus** the tier's `max_porcen_tramoN` as a muted `%` to the right (empty tiers keep `—`)
- **Bulk edits (new)**: added per-tramo bulk editing alongside the existing Nuevo Precio / Máx % Desc / Borrar Máx %. Legacy `listPrecioProducto` never had tramo bulk (or even showed tramos), so this is net-new
  - **Shared** (`precios.ts`): `setTramo` added to `BulkActionSchema`; optional `tramo`/`cantidad`/`maxPorcen` on `BulkInputSchema` with a refine requiring all three (and no `valor`) for `setTramo`
  - **Lambda** (`precios/service.ts`): `writeRow` gained a `tramoPatch` that writes **only that tramo's two columns** in both INSERT and `onDuplicateKeyUpdate` (other two tiers preserved); `bulkApply` `setTramo` branch. No API Gateway change — reuses the existing `/bulk` route
  - **Frontend** (`precios-page.component.ts`): bulk-bar gained Tramo 1/2/3; picking one swaps the single value input for two (cant. desde + máx %); `onBulk()` maps `setTramoN → { action:'setTramo', tramo:N, … }`. Renamed first option to **Nuevo Precio**
- Verified (TDD, tests-first watched-fail): shared spec 10/10 (new `setTramo` validation), lambda vs real MariaDB 14/14 (setTramo preserves other tramos + fresh-row upsert), lambda suite 20/20, typecheck clean, frontend build ok (pre-existing bundle-budget warning only). No live browser drive of the UI bits
- Commits: 1 on `main` (+ spec doc)

## 2026-08-18 (Mon) — ~0.25h
**Precios grid: expose tramos as columns, drop redundant Margen, remove navbar search (frontend-only)**
- Follow-up tweak to the precios page (`precios-page.component.ts`); no store/API/DB/shared changes
- Removed the **Margen** column (the value already shows per price inside the Precio Venta cell) and its now-unused `margenBase` sort key
- Added **3 tramo columns** (Tramo 1/2/3) rendering each tier's `cantidad` in the same `pv-badge` pill (muted `—` when the tier is unused); promoted `.pv-badge` from an `ul.pv`-scoped selector to a standalone class so it styles outside the list
- Removed the navbar `header-search` (the "Buscar Producto" filter under the stats row still covers search)
- Verified: `tsc --noEmit` clean. No live drive (needs Cognito auth + seeded price data)
- Commits: 1 on `main`

## 2026-08-18 (Mon) — ~0.75h
**Precios UI restyle to match the productos maintainer design system (frontend-only)**
- Reskinned the `precios` page + drawer to the shared maintainer look so it's consistent with productos; no store/API/DB changes, pricing logic untouched
- **Page** (`precios-page.component.ts`): navbar `header-search`; hero restyled with `hero-btn` list-management + themed `.hero-select` picker; 4 `stat-card`s (Productos / Con Descuento / Bajo Costo / Filtrados); `filter-dropdowns` bar (search + client-side "Mostrar" view filter [Todos/Con descuento/Bajo costo] + Limpiar); shared `table-wrap` table with **sortable headers**, `t-num`/`t-name`/`t-muted` cells, an Acciones **Editar** button, preserved below-cost row highlight + margin coloring; shared `pagination` (per-page + windowed pages); `empty-state`. Sorting/paging/view-filter added as component-local signals (`sort`/`page`/`perPage`/`viewFilter`) — no store changes
- **Drawer** (`precio-producto-drawer.component.ts`): converted the right-side `<aside class="drawer">` into a centered shared `.modal` (`max-height:90vh` scroll for tramos); preview/readout badges retinted to theme vars
- Kept the bulk-edit bar (restyled as a toolbar pill group)
- Verified: `tsc --noEmit` clean, frontend build ok (pre-existing bundle-budget warning only), `@serfel/frontend` vitest 58/58. No live drive (needs Cognito auth + seeded price data)
- Commits: 1 on `main`

## 2026-08-18 (Mon) — ~4.5h
**Precio Producto → "Precios y Descuentos": new `precios` vertical slice (shared → lambda → infra → frontend)**
- Migrated the legacy `listPrecioProducto` module to the new stack and surfaced the volume-discount **tramo** tiers the legacy UI never showed or edited. No `legacy-php` changes; no DB migration (tramo columns already existed on `40_m_precio_producto`)
- Brainstormed → design spec (+2 revisions on list delete: dropped then restored the inactivate button) → bite-sized plan; executed as 8 subagent SDD tasks with per-task spec+quality reviews and a final whole-branch review (opus, ready-to-merge, no Critical/Important)
- **Key design decisions**: `40_m_precio_producto.porcen_desc` is a **dead column — never read/written** (discounts derive from `max_porcen_desc` + tramos); pricing math single-sourced in `@serfel/shared` and imported by both the Lambda and the Angular drawer; **Precio Venta as a multi-value cell** (base@max% + one value per set tramo), each with its margin; per-product drawer + preserved legacy bulk actions; under-cost rows flagged red
- **Shared**: `precios.ts` Zod schemas + DTOs + pure pricing (`computePrecioBase`/`computeMargen`/`computePreciosVenta`/`buildPrecioProductoRow`) + `precios` module in `MODULE_ROLES`
- **Lambda** `lambdas/precios/`: Lista CRUD (`MAX(id)+1` — `id_lista_precio` is not AUTO_INCREMENT — with reactivate-on-name-reuse), grid (all active products LEFT JOIN precio_producto), per-product upsert (`onDuplicateKeyUpdate`, never touches `porcen_desc`), bulk apply
- **Infra**: `PreciosFn` + 7 API Gateway routes
- **Frontend**: api service + signal store; pricing grid with the multi-value Precio Venta cell + red under-cost rows; per-product drawer with live shared-pricing preview + a soft (non-blocking) tramo-% warning; `/precios` route + nav leaf **"Precios y Descuentos"** in Mantenedores → Productos
- Side-fixes: the new `precios` module rippled to hardcoded admin module-list fixtures — shared `authz`/`rutas`, frontend `nav.spec`, products `getMe`/`/api/me` (3 fixup commits; grep-swept to confirm the full set). Brief-bugs caught in-flight: test-helper seed missing not-null columns; drawer missing `DecimalPipe`
- Verified: `pnpm -r test` full green (shared 67, db 4, frontend 58, lambdas 184 incl. 18 precios + 9 shared pricing), typecheck clean, frontend build ok
- Commits: 12 on branch `worktree-precio-producto-migration` (+ spec/plan docs) · merged to `main`

## 2026-08-17 (Sun) — ~2h
**Fechas shown in America/Santiago (new frontend + legacy Angular 14 + legacy-php)**
- Root cause: datetimes are stored as naive UTC strings and passed through verbatim, so every renderer showed the UTC clock digits as local time (3–4h off, DST-dependent). Fix is display-only — storage, form inputs, filters, and the API contract are untouched.
- Brainstormed → design spec + bite-sized plan (`docs/superpowers/specs` + `plans`); executed as 4 subagent tasks with per-task spec+quality reviews and a final whole-branch review (approve-with-nits, no Critical/Important)
- **New frontend**: standalone `FechaLocalPipe` (`Intl.DateTimeFormat` + `America/Santiago`, DST-aware — not the `date` pipe's fixed-offset param); prefacturación template
- **Legacy Angular 14**: module-declared `fechaLocal` pipe registered in SharedModule; 4 templates (porciones ×2, modal-porción, prefacturación)
- **legacy-php** (Distribuidor + Coproad mirror): new `FechaUtil::aLocal()` UTC→Santiago helper applied at 7 datetime sites/app (cobranzas, informe cobranza, DTE `FchEmis`, NC/ND `FchRef`, 2× LibroCV `FchDoc`); the date-only `FchResol` (`fecha_aprobacion_SII`) deliberately left unconverted to avoid a day shift
- Hardening: pinned `hourCycle:"h23"` in both pipes so Santiago midnight renders `00:00`, not `24:00`
- Verified: new-frontend vitest 58/58 (incl. summer −3 / winter −4 DST + midnight cases); PHP via authentic `php:5.6-cli` docker (assertions + `php -l` on 13 files)
- Commits: 5 (+ spec/plan docs) · branch `feat/fechas-america-santiago` merged to `main` (no-ff)

## 2026-08-17 (Sun) — ~0.5h
**Rehost legacy PHP: rebuild + manual redeploy of the combined image to dev (temp prod)**
- Ran the Fase 3.5 manual deploy (per `legacy-php/README.md`) for `serfel-dev-rehost-php-app-1:v1` — the combined PHP 5.6 / arm64 image serving Distribuidor, SerfelWeb, and both Coproad tenants (`/coproad/Coproad`, `/coproad/CoproadWeb`) from one Apache doc root
- Gotcha: `docker login` hung on macOS `credsStore: "desktop"` (GUI/keychain helper) in the non-interactive shell. Worked around it with a throwaway `DOCKER_CONFIG` dir (empty `config.json`, no helper) so the ECR token writes straight into that config, reused for the `buildx --push`
- `buildx build --platform linux/arm64 --push` (~10 min PHP-from-source) → new digest `sha256:4f2dafd0…`; `ecs update-service --force-new-deployment` (mutable `:v1` needs the nudge) + `wait services-stable`
- Verified: running task on the new digest, ALB target `healthy` / old `draining` (clean rollover); CloudFront front door (`d3hrkbcu7lsg3m`) smoke → Distribuidor/SerfelWeb/both Coproad apps all 200 (`/health.php` 403 through the CDN is expected — internal ALB probe path, not publicly routed)
- No code changes; deploy-only. Account `146476548567` via `AWS_PROFILE=admin-christian`
- Commits: 0

## 2026-08-17 (Sun) — ~4h
**Marcas maintainer — full vertical slice (DB → shared → lambda → infra → nav → frontend), deployed to dev**
- Brainstormed + wrote design spec and a bite-sized implementation plan (`docs/superpowers/specs` + `plans`); decided: soft-delete model (add `id_estado`), dedicated `marcas` lambda + authz module, 3-level Mantenedores nav with "(no disponible)" placeholders per the `option-2-topbar-mega` prototype
- Executed as 10 subagent tasks with per-task spec+quality reviews and a final whole-branch review (approved for merge, no Critical/Important)
- **DB**: migration `0012` — `id_marca` AUTO_INCREMENT (FK-parent 1834/1452/1062-safe) + `id_estado` soft-delete column; applied to populated dev DB cleanly
- **Shared**: `MarcaInputSchema`/`MarcaDto`/`MARCA_NO_ENCONTRADA` + `marcas` module in `MODULE_ROLES`
- **Lambda** `lambdas/marcas/`: Hono CRUD, soft-delete, uniqueness-among-active (`NOMBRE_EN_USO`)
- **Infra**: `MarcasFn` + 5 API Gateway routes (`serfel-dev-marcas` Active)
- **Frontend**: generalized nav model (sections + disabled placeholders), marcas logic/store/api/modal/page + `/marcas` route; no header-search (parameter maintainer)
- Side-fixes: stale `modulesForTipo(admin)` fixtures in products **and** shared test suites (caused by the new `marcas` module)
- Verified: `pnpm -r test` 281 passed, typecheck clean; `sst deploy --stage dev` + `db:migrate` OK (13 migrations journaled); merged to `main` (triggers CI deploy-dev)
- Commits: 14 · Span: 00:13–14:14 (design/plan late night, build + deploy + merge morning)

## 2026-08-16 (Sun) — ~0.5h
**Clientes maintainer: locales tab/modal layout polish**
- Added `margin-bottom` below the Datos/Locales tab strip so both the client form and the locales content get breathing room under the tabs
- Locales list now shows the useful columns: **Nombre Local, Teléfono, Contacto, Fono Contacto, Giro, Vendedor** (was Nombre / Comuna / Forma de pago), with `—` fallbacks
- Fixed the new/edit local form overflowing the modal: root cause was the base `.modal { width: 500px }` winning over the cliente-modal's inline `max-width:920px`, so it only ever rendered 500px wide. Set `width:960px; max-width:95vw` and switched the local form grid to **3 data columns** (component-scoped; the client Datos grid stays 2-col, full-width fields still span all columns)
- Frontend typecheck green
- Commits: 1

## 2026-08-16 (Sun) — ~0.5h
**Clientes search: full-RUT (with DV) query never matched**
- Systematic-debugging: a search like `/api/clientes?rut=12452724-4` returned nothing for an existing client. Root cause in the shared `optDigits` transform (`ClienteSearchSchema`): it stripped **all** non-digits, so `12452724-4` became `124527244` — the DV digit glued onto the body. The lambda then ran `CAST(rut_cliente AS CHAR) LIKE '%124527244%'`, but `rut_cliente` stores only the **body** (DV lives in `dv_cliente`), so the LIKE never matched
- Fix: split on `-` and keep only the body before stripping non-digits (`12.452.724-4` → `12452724`, `11.704.324-K` → `11704324`); partial/no-DV searches unchanged. Query needed no change once the param feeds it the body only. Fix lives in the shared Zod schema, so the Angular clientes search inherits it too
- Added 2 regression tests (numeric DV + `K`); corrected the pre-existing test's name (it never actually exercised a DV). Shared suite (54) + root typecheck green
- Commits: 1

## 2026-08-16 (Sun) — ~2.5h
**Clientes maintainer: client-side filtering → server-side search (RUT / Razón Social / Dirección)**
- Brainstormed → spec → plan → subagent-driven execution to stop the clientes list from loading all ~6k rows up front. Filtering moves **server-side**, keyed on **RUT**, **Razón Social**, **Dirección**, scoped by the existing **Estado** selector. Nothing loads until the user explicitly searches (**Buscar** button + Enter); the only path that returns everything is an all-empty search, which prompts a `confirm()` first. Key brainstorm decisions: Dirección matches the client's own `direccion_cliente` **OR any of its locales'** address; dropped the Lista de Precio filter; removed the redundant navbar quick-search; **sort/pagination/CSV stay client-side** over the returned result set (YAGNI — a normal search returns few rows, and the "all" case is what the page already paginates in-browser)
- **Shared**: `ClienteSearchSchema` (rut→digits-only, razonSocial/direccion trimmed, empty→undefined, reuses `EstadoFilterSchema`), reused by the lambda query parser + Angular api service. Caught a **Zod inference gotcha** mid-execution: `.optional().transform()` makes object keys *required* (`rut: string | undefined`) not optional — fixed to trailing `.optional()` so callers can pass `{ estado }` alone
- **Backend** (`clientes` lambda): `listClientes(db, estado)` → `searchClientes(db, params)`. `buildClienteWhere` ANDs the filters — rut via bound `CAST(rut_cliente AS CHAR) LIKE ?`, razonSocial per-token `LIKE` over razon_social OR nom_fantasia, direccion `LIKE` OR a correlated drizzle `exists()` subquery on the client's locales. The three derived-column aggregates (días / últ. factura / últ. NC) are **scoped to matched ruts** (`inArray`) only when a text filter is present; the empty "all" path runs unbounded exactly as before (no regression on the heavy path). `GET /clientes` parses the new params via the schema (no new API Gateway route — reused the existing one)
- **Frontend**: reshaped `Filters` to `{ rut, razonSocial, direccion }`, deleted client-side `applyFilters`/`normalizeSearch`/`matchesAllTokens`; store gained `hasSearched` + `search()` (lookups-only `load()` on page open; `setEstado` and all four write ops re-search only after a first search); page rebuilt with the 3 filter inputs + Buscar, two empty states (pre-search "Busca clientes" vs no-hits "No se encontraron clientes"), navbar search removed. Final-review fix wave removed the now-**dead "Filtrados" stat card** (client-side filter gone → always "—")
- Executed subagent-driven: fresh implementer + spec/quality review per task (7 tasks), model-tiered (haiku transcription/small-diff reviews, sonnet logic/integration, opus final whole-branch review). Final review verified the three named risks clean: **LIKE input is bound not interpolated** (no SQL injection), the empty-"all" path avoids a degenerate `inArray([])`, and sort/paginate/CSV still operate over the result set. Parked (intentional, ledgered): direccion `exists()` doesn't scope local `id_estado` (consistent w/ existing joins); per-mutation full re-search after an all-load
- Full suite green: db 3, lambdas 156 (clientes 27 service + 22 app), frontend 46; typecheck + frontend build clean. Documented that accent/case-insensitivity is now delegated to the MariaDB column collation (was client-side diacritic-normalized). Merged to `main` and pushed
- A real `sst deploy --stage dev` + browser smoke of the search flow is still pending
- Commits: 7 feature/fix (design spec + plan committed earlier)

## 2026-08-16 (Sun) — ~2.5h
**Debug: migration 0011 fails on dev RDS (`id_local_cliente` AUTO_INCREMENT)**
- The `db:migrate` for the Locales feature failed on dev RDS at `ALTER TABLE 10_m_local_cliente MODIFY id_local_cliente int AUTO_INCREMENT` (the Lambda error truncates errno/sqlMessage). Systematic-debugging across several reproduction cycles
- **First robustness pass (committed, still failed):** ruled out a stale deploy by downloading the deployed Lambda bundle and diffing the bundled `0011.sql` (CI had already shipped my fix). Reproduced a real errno **1452** on the `loc_clie_forma_pago` FK-add (orphan `id_forma_pago`) via drizzle's *real* `migrate()` — `migrateSchemaOnly` hides it by running statements untransactioned. Rewrote 0011: drop child FK `ped_loc_clie` → MODIFY → re-add (kills the `FOREIGN_KEY_CHECKS` fragility), remap orphan forma_pago→7, `DROP FK IF EXISTS` guards for idempotent re-runs. Also caught + fixed the ventas/usuarios/rutas test helpers the new FK broke (`pnpm -r` at the finishing gate)
- **Real root cause (needed RDS ground truth):** since secret-safety forbids pulling the DB password for a tunnel, added a temporary `{diagnose:true}` branch to the migrate Lambda (reads creds itself, returns read-only `information_schema`/state + probes the failing ALTER), deployed, invoked, reverted. It revealed `min_id: 0, zero_ids: 1` — a legacy **`id_local_cliente = 0`** row. Converting a PK to AUTO_INCREMENT resequences the 0 and collides → **errno 1062 ER_DUP_ENTRY**. Invisible locally until a 0-id row exists
- **Fix:** `SET NO_AUTO_VALUE_ON_ZERO` for the MODIFY so the 0 is preserved, then RESTORE the prior `sql_mode` via a session `@user_var` — a leaked `NO_AUTO_VALUE_ON_ZERO` makes drizzle's `INSERT VALUES(default)` write 0 (it regressed the producto autoincrement test through the shared test connection). Verified via real `migrate()` against a replica of dev's exact partial state (0-row, `ped_loc_clie` already dropped by the prior failed run): 0 preserved, both FKs restored, a fresh insert auto-increments to MAX+1 (7375)
- Deployed to dev (admin-christian) + `db:migrate` → `{ok:true, migrationsInJournalTable:12}` (0011 finally recorded). Full suite stayed green (shared 49, db 3, frontend 49, lambdas 145). Updated the `autoincrement-alter-fk-parent` memory with both traps (1452 drop/re-add, 1062 NO_AUTO_VALUE_ON_ZERO) + the diagnose-Lambda technique
- Commits: 3 (2 migration fixes + 1 test-helper fix)

## 2026-08-16 (Sun) — ~5h
**Locales de Clientes maintainer (`10_m_local_cliente`, child of `clientes`) + forma_pago normalization**
- Brainstormed → spec → plan → subagent-driven execution for managing a cliente's **locales** in the new frontend, plus normalizing "forma de pago" out of the overloaded `10_p_tipo_docto` param table. Key UX decision (from brainstorm): locales live in a **Locales tab inside the existing cliente modal** with a full-width **in-place view-swap editor** (no dialog-in-dialog), Inactivos toggle + Restaurar, and forma-de-pago/vendedor dropdowns
- **forma_pago normalization** — migration `0011` seeds the existing-but-empty `40_p_forma_pago` with ids 3–8 **copied verbatim** from `10_p_tipo_docto` (same ids, `INSERT…SELECT` idempotent), adds FK `loc_clie_forma_pago`, and makes `id_local_cliente` **AUTO_INCREMENT**. Deliberately left `10_p_tipo_docto` and `60_m_pago`'s `ON DELETE CASCADE` FK untouched — deleting from tipo_docto would cascade-wipe payments (the "business rule" landmine the user flagged). The AUTO_INCREMENT `MODIFY` on this FK-parent table is wrapped in `SET FOREIGN_KEY_CHECKS=0/1` to dodge errno 1834; single-connection migrate pool makes the session var persist across statements
- **Legacy PHP** — dropped the `SELECT MAX(id_local_cliente)+1` id assignment from both Distribuidor + Coproad `LocalCliente.php` (id-less INSERT + `mysql_insert_id()`), now that the DB auto-assigns. Deploy-order note recorded: migration must land before the rehost images rebuild
- **comuna** consolidation — new stack surfaces only `comuna`; the lambda writes `comuna_local_cliente` in sync on every create/update so the live legacy rehost (which still reads it) keeps working; no column drop
- Shared `locales` Zod contract (`LocalCreate/UpdateSchema`, `LocalDto` with derived `nomVendedor`/`nomFormaPago`, lookups). Backend on the existing **clientes** lambda (locales are a child): `getLocalLookups` (vendedores = `id_estado=1 AND id_tipo_usuario=2`), `listLocales`, `createLocal` (insertId + comuna dual-write), update/deactivate/activate; 6 routes behind a new `/locales/*` module gate; POST create injects `rutCliente` from the URL (not the body). Routes registered in `infra/api.ts`
- Frontend `locales` feature: pure logic (+spec), api service, signals store (scoped per open cliente), standalone full-width `local-form` editor, and the Locales tab wired into `cliente-modal` — existing Datos flow left provably intact
- Executed subagent-driven: fresh implementer + spec/quality review per task (14 tasks), model-tiered (haiku transcription, sonnet logic/integration/reviews, opus final whole-branch review). Notable process saves: a Task-9 parked finding (`idVendedor`/`idFormaPago` could fail Zod silently) was fixed in Task 11 (default-select + visible errors); final review APPROVE with one **operational** pre-deploy gate (verify no `id_forma_pago` outside 3–8 before migrating prod, else the FK-add aborts errno 1452); two fix waves (coerce nullable `direccion` + reset locales store on modal open)
- Two incidents caught + recovered: a subagent ran `git commit` from the **main checkout** (moved `main` off `0f02bf7`) — cherry-picked onto the worktree + reset main (user-approved); and `pnpm -r` at the finishing gate caught a real regression — the new FK broke the **ventas/usuarios/rutas** test helpers (they seed locals w/ `id_forma_pago=7` but no `40_p_forma_pago` row) — fixed by seeding forma_pago in all three
- Full suite green: shared 49, db 3, frontend 49, lambdas 145; typecheck + frontend build clean. Merged to `main` and pushed
- `sst deploy --stage dev` + `db:migrate` (incl. the prod pre-flight query) and a browser smoke of the Locales tab still pending
- Commits: 15 (13 feature/test + 2 fix waves; design spec + plan committed earlier)

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
