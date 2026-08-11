# Work Log

Time log for the Serfel AWS project. Entries are Claude-maintained: at the end of
a working session Claude appends a dated entry, estimating hours from git activity
(commit timestamps + stats) plus the session conversation (planning, debugging,
deploys, and other work that leaves no commit trail). Hours are informed estimates,
not stopwatch-precise. Newest entries on top.

---

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
