# Gestión → Notas de Crédito — Design

**Date:** 2026-08-20
**Status:** Approved (design)
**Module:** `notas_credito` (Serfel 2.0)

## Purpose

New "Gestión → Notas de Crédito" module. A user searches an emitted electronic
invoice (`40_m_venta` with `id_tipo_docto_emitido = 9`, Factura Electrónica) and
issues a Nota de Crédito to correct, reduce, or fully void it — by editing the
quantities and/or values of the invoiced products, or via a one-click "anular
factura completa" button.

The process is made legally valid by emitting the NC to **facturación.cl over its
REST API** (replacing the legacy SOAP `wsplano.asmx`), sending a **flat file
(archivo plano, `formato=1`)**.

Issuing an NC **creates** one `40_m_nota_credito` row and one or more
`40_m_prod_nota_credito` rows. It **never modifies** `40_m_venta` or
`40_m_producto_venta`.

## Background / current state

- Legacy flow (`legacy-php/.../NotaCreditoNEG.php` + `NotaCreditoElectronicaCTRL.php`)
  is two-phase: (1) `ingNotaCredito` inserts the NC + product rows, computes
  IVA/espec/iaba/totals from the selected products only, restitutes stock;
  (2) `crearNotaCreditoElectronica` gets a folio, builds a full XML DTE, calls
  `procesarDocumento` over SOAP, and on success marks it electronic.
- Legacy always hardcodes `CodRef = 3` (corrige montos), even for full voids.
- Serfel 2.0 `prefacturarBatch` creates ventas with `id_tipo_docto_emitido = 1`
  and `id_folio = 0` — it does **not** emit electronically. The tipo=9 ventas this
  module targets are **legacy-migrated** and already carry folios; the module
  reads them read-only.
- facturación.cl credentials are hardcoded in `FacturacionClWSCredenciales.php`
  (real PRD passwords) — must move to Secrets Manager and be rotated.

### Two numbering systems (do not conflate)

- Internal `10_p_tipo_docto`: `1` = Factura, `9` = Factura Electrónica,
  `10` = Nota Crédito, `11` = Nota Crédito Electrónica.
- facturación.cl / SII DTE types: `33` = Factura Electrónica, `61` = Nota Crédito
  Electrónica.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Folio source | tipo=9 ventas are legacy-migrated with folios; module reads them read-only |
| File format | Flat file (`formato=1`) |
| Stock restitution | Restitute only when **quantity** is credited or invoice fully anulada; **no** stock change on a value-only (price) correction |
| Emit flow | Single action, atomic-ish: insert NC *pendiente* + reserve folio (commit) → build flat file → invoke emisor → on success mark electrónica + store folio/PDF; on failure leave retryable *pendiente* draft (same folio on retry) |
| Egress | Split: VPC `notas-credito` lambda invokes a **non-VPC** `facturacion-emisor` lambda for the outbound HTTPS call (no NAT). EIGW ruled out — facturación.cl is IPv4-only (no AAAA) |
| Correction codes | `CodRef 1` (anular total) and `CodRef 3` (corrige montos, partial qty/value). `CodRef 2` (corrige texto) out of scope |
| NC listing | Included, with a per-row button that fetches fresh PDF links from facturación.cl and opens them in a new tab |
| Over-credit | Hard-block: no new NC once a venta is fully credited |
| NC PK | Migrate `40_m_nota_credito.id_nota_credito` to AUTO_INCREMENT (no hand-assigned PKs) |
| Folio source | New `40_m_folios_electronicos` table holds authorized folio ranges per empresa per `id_tipo_docto` (rows set manually for now). Next NC folio comes from the active `id_tipo_docto = 11` range via its `ult_folio` high-water mark, not `MAX(id_folio)+1` |

## Architecture & components

```
Frontend (Angular 20)   apps/frontend/src/app/features/notas-credito/
  notas-credito-page.component.ts   search venta → compose NC → emit; NC listing
  notas-credito-api.service.ts
  notas-credito-store.ts / -logic.ts  pure preview calc (mirrors shared)

Shared (@serfel/shared)  packages/shared/src/notas-credito.ts
  Zod schemas + DTOs (one schema, two uses: lambda validation + Angular forms)
  buildFlatFile()      pure, unit-tested flat-file builder
  computeNcTotales()   pure IVA/espec/iaba/subtotal/total from NC lines

Lambda: notas-credito  (IN VPC)   lambdas/notas-credito/
  index.ts / app.ts / service.ts / authz.ts / errors.ts
  - search tipo=9 ventas + lines (read-only on 40_m_venta / 40_m_producto_venta)
  - over-credit guard (sum existing NCs vs venta)
  - insert 40_m_nota_credito (pendiente) + 40_m_prod_nota_credito, reserve folio
  - build flat file, invoke emisor, mark electrónica, restitute stock per rules
  - GET pdf-links endpoint → invoke emisor obtenerlink

Lambda: facturacion-emisor  (NON-VPC)   lambdas/facturacion-emisor/
  - NO DB access. Only touches facturación.cl + Secrets Manager.
  - ops: "procesar" { rutEmpresa, flatFileBase64 } → { resultado, folio, urlPdfOriginal, urlPdfCedible, error }
          "obtenerlink" { rutEmpresa, folio, tipoDte, cedible } → { url }
  - resolve creds from Secrets Manager by rut → POST /login (JWT) → GET /wsds/procesar | /wsds/obtenerlink
```

The `notas-credito` lambda invokes `facturacion-emisor` via the Lambda SDK
(`lambda:InvokeFunction`). The emisor is the only internet-facing component.

## Data flow — emit

1. **Search** — by folio / nº documento / cliente. Lambda filters
   `id_tipo_docto_emitido = 9`, returns venta + `40_m_producto_venta` lines and the
   sum of existing NCs against it. If fully credited → block.
2. **Compose** — either **Anular factura completa** (all lines, full qty & price,
   `CodRef 1`) or **corregir montos** (edit per-line qty and/or price, `CodRef 3`).
   Frontend previews totals via the shared calc.
3. **Emit** (single request):
   - Re-validate server-side; recompute totals from NC lines only.
   - Resolve the next folio from `40_m_folios_electronicos` (see below).
   - `INSERT 40_m_nota_credito` (`id_estado = pendiente`, `es_nota_cred_electronica = 0`,
     `id_folio = <next folio>`) + `40_m_prod_nota_credito` rows.
     **Commit** — folio reserved, NC durable.
   - Build flat file → invoke emisor `procesar`.
   - **Success:** update NC → `es_nota_cred_electronica = 1`,
     `id_tipo_docto_emitido = 11`, store folio + PDF URLs, estado finalizado;
     bump `40_m_folios_electronicos.ult_folio` to the used folio; restitute stock
     per rules.
   - **Failure/timeout:** NC stays *pendiente* (retryable). Retry re-sends the
     **same** folio (never re-inserts) → no double-emit, no folio gaps.
4. `40_m_venta` / `40_m_producto_venta` never modified.

## Correction types

| Action | `CodRef` | NC lines | Stock |
|---|---|---|---|
| Anular factura completa | 1 | all lines, full qty & price | restitute all |
| Corregir cantidades | 3 | edited quantities | restitute credited qty |
| Corregir valores (price only) | 3 | edited price, qty unchanged | no stock change |

Stock rule keys off whether a line's **quantity** is credited.

## Flat file (`formato=1`)

`buildFlatFile()` (pure, in shared). Sections:
- `->Encabezado<-` — TipoDTE **61**, folio, fecha, receptor = cliente of the venta.
- `->Detalle<-` — one line per NC product (código, descripción, cantidad, precio,
  descuento, valor).
- `->Totales<-` — computed (neto, IVA, impuestos adicionales, total).
- `->Referencia<-` — one per line: `TpoDocRef = 33` (Factura Electrónica),
  `FolioRef` = venta folio, `FchRef` = venta date, `CodRef` = 1 or 3,
  `RazonRef` = motivo (`40_m_motivo_nota_credito`).

Emisor base64-encodes and sends via `GET /wsds/procesar?file=<b64>&formato=1&incluyelink=…`.

## NC listing

- Table of issued NCs (folio, venta ref, cliente, fecha, total, estado).
- Per-row **PDF** button → `notas-credito` GET pdf-links endpoint → invokes emisor
  `obtenerlink` (login → `/wsds/obtenerlink` or `/wsds/obtenerpdf`) → returns fresh
  URL(s); frontend opens in a new tab.

## Folio management — `40_m_folios_electronicos`

New table, a manual registry of authorized folio ranges (CAF) per empresa per
document type. Rows are inserted **manually** by the operator for now.

| Column | Type | Notes |
|---|---|---|
| `id` | int AUTO_INCREMENT PK | |
| `fecha_creacion` | datetime | when the range was registered |
| `rut_empresa` | int | owning empresa |
| `id_tipo_docto` | int | internal `10_p_tipo_docto` code: `9` = Factura Electrónica, `11` = Nota Crédito Electrónica (only these two for now) |
| `folio_desde` | int | first authorized folio in the range |
| `folio_hasta` | int | last authorized folio in the range |
| `ult_folio` | int | last folio **successfully processed** by facturación.cl in this range (high-water mark) |

**Next-folio resolution (NC):** for the target `rut_empresa`, select the active
range row where `id_tipo_docto = 11`. Next folio =
`max(folio_desde, ult_folio + 1, (max id_folio among existing NC rows for this
empresa within [folio_desde, folio_hasta]) + 1)`. The third term covers folios
already reserved by *pendiente* NCs that have not yet bumped `ult_folio`. If the
result exceeds `folio_hasta` → range exhausted, return an actionable error
(operator registers a new range row).

**`ult_folio` is bumped only on successful `procesar`** (its definition), in the
same update that marks the NC electrónica. A failed emit leaves `ult_folio`
unchanged; the *pendiente* NC keeps its reserved folio on its own row, and a retry
re-uses that stored `id_folio` rather than recomputing — so no double-emit and no
folio gaps.

The `id_tipo_docto = 9` rows exist so the same table can serve Factura Electrónica
emission later; this module only reads `id_tipo_docto = 11` ranges.

## Secrets

One Secrets Manager secret, JSON keyed by empresa rut
(`8030856-6` SERFEL, `76770842-4` COPROAD, `8367020-7` serfel2). Emisor resolves by
`rutEmpresa` at runtime via SDK — secrets never enter the repo or logs. Provision
following the `aws-secrets-manager` skill. **Rotate** the leaked PRD passwords.

## Schema & infra changes

- **Migration:** `40_m_nota_credito.id_nota_credito` → AUTO_INCREMENT (drizzle
  generate). Watch the FK-parent (1834/1452) and id=0 (1062) traps documented for
  prior ALTER-to-autoincrement work.
- **Migration:** create `40_m_folios_electronicos` (see Folio management). Add to
  `packages/db/src/schema.ts` + drizzle generate. No seed data — rows added manually.
- **`infra/api.ts`:** register `notas-credito` routes in the explicit route array
  (else CORS 404); add the non-VPC `facturacion-emisor` lambda + InvokeFunction grant.
- **Module/authz:** add `notas_credito` to `MODULE_ROLES` + `moduleGuard`. Update the
  hardcoded module-list fixtures this ripples into (shared authz, rutas, frontend
  nav.spec, products getMe/api-me).

## Testing

- **Pure functions** (`buildFlatFile`, `computeNcTotales`) — unit tests, TDD.
- **Lambda service** (Vitest + local MariaDB): search filter, over-credit guard,
  folio sequencing, idempotent retry (emisor mocked), stock rules per correction type.
- **Emisor:** unit tests with mocked HTTP (login + procesar + obtenerlink),
  credential resolution by rut.

## Scope

**In:** search tipo=9 ventas, anular total, corregir montos/cantidades, emit +
store PDF links, NC listing with PDF button, over-credit block.

**Out:** notas de débito, compra NCs (`_compra` tables), corrige texto (`CodRef 2`),
emitting the original factura electrónica (targets remain legacy-migrated data).

## Follow-ups (separate from this module)

- **Rotate leaked facturación.cl PRD passwords.** The credentials for SERFEL
  (`8030856-6`), serfel2 (`8367020-7`), and COPROAD (`76770842-4`) are committed in
  plaintext in `legacy-php/Distribuidor/Clases/WS/FacturacionClWSCredenciales.php`.
  Rotate at facturación.cl, store the new values only in Secrets Manager, and scrub
  the legacy file. Track independently of the NC module rollout.
