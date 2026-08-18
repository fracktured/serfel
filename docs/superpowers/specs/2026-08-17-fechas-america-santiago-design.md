# Mostrar fechas en America/Santiago — Design

Date: 2026-08-17
Status: Approved (pending spec review)

## Problem

Datetimes are stored in the database as **naive UTC strings** (e.g. `"2026-08-17 12:00:00"` — no `Z`, no offset; Drizzle `datetime(..., { mode: 'string' })`, and the legacy PHP DAOs return raw column strings). Writers produce UTC (`new Date().toISOString().slice(0,19)` in the Lambdas; `date_default_timezone_set('UTC')` in `FechaUtil`).

Every renderer then treats that string as **local** time and shows the UTC clock digits unchanged. Chile is UTC−3 / UTC−4 (with DST), so users see times 3–4 hours ahead of reality, and dates can land on the wrong day near midnight.

**Goal:** at every user-facing *display* (and SII document emission) site, interpret the stored string as **UTC** and format it in **America/Santiago**. This is display-only — storage, form inputs, filters, and query building are unchanged.

## Non-goals

- No change to how dates are stored, sent to the API, or used in filters/queries (display-only).
- No change to `FechaUtil::deFechaJQueryABD` or any input-parsing / round-trip helper.
- No change to **date-only** columns (see Date-only caveat).

## Root-cause detail

- DB `datetime` columns → returned as naive UTC strings by both the new Lambda API (raw passthrough, e.g. `lambdas/ventas/service.ts` `fecha: r.fecha`) and the legacy SerfelWeb CodeIgniter REST that feeds the Angular 14 app.
- Angular's built-in `date` pipe, given a string with no offset, parses it as the browser's local timezone. Its `timezone` parameter only reliably accepts a fixed numeric offset, which is wrong for Chile half the year (DST). So the built-in pipe cannot be the fix — we need explicit UTC→IANA-zone formatting via `Intl.DateTimeFormat` with `timeZone: 'America/Santiago'`.
- PHP `FechaUtil::aFecha*` uses `strtotime` under `date_default_timezone_set('UTC')`, formatting the stored UTC as UTC. Needs an explicit UTC→Santiago conversion.

## Approach

**Fix at each render site with one small reusable formatter per app.** Rejected alternatives: a global `date_default_timezone_set('America/Santiago')` + repurposing `FechaUtil` (would wrongly shift date-only SII fields and can't fix Angular); converting in the API/DB layer (mutates the data contract and breaks round-trips).

### The universal conversion

Given a naive UTC string `"YYYY-MM-DD HH:MM:SS"`:
1. Interpret it as an instant in UTC.
2. Format that instant in `America/Santiago` (DST handled automatically by the platform's IANA tz database).

### Date-only caveat (critical)

Columns declared `date` (not `datetime`) — notably `t10_m_empresa.fecha_aprobacion_SII` (rendered as `FchResol` in `XMLLibroCVNEG`) — carry no time component. Converting a bare date across a timezone shifts it back a day (`2020-05-01` UTC midnight → `2020-04-30` in Santiago). **Date-only fields must be emitted as literal strings, never timezone-converted.**

## Per-app design

### 1. New frontend — Angular 20 (`apps/frontend`)

Add a standalone pipe `FechaLocalPipe` (`name: 'fechaLocal'`), e.g. under `apps/frontend/src/app/shared/`.

- Input: naive UTC string (also tolerate a `Date` / ISO-with-`Z`).
- Normalize a naive string to a UTC instant: `new Date(value.replace(' ', 'T') + 'Z')`.
- Format with `Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', ... })`.
- Accept a format arg supporting at least the two shapes in use:
  - `'dd/MM/yyyy HH:mm'` (date + time)
  - `'dd/MM/yyyy'` (date only)
- Return `''` for null/empty/unparseable input.

Replace usage:
- `apps/frontend/src/app/features/prefacturacion/prefacturacion-page.component.ts:127` — `{{ p.fecha | date: 'dd/MM/yyyy HH:mm' }}` → `{{ p.fecha | fechaLocal: 'dd/MM/yyyy HH:mm' }}`, add the pipe to the component `imports`.

### 2. Legacy frontend — Angular 14 (`apps/legacy-frontend`)

Add a module-declared pipe alongside `apps/legacy-frontend/src/app/pipes/moneda.pipe.ts` (mirror that pattern), declared + exported in `app.module.ts`. Same normalize + `Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' })` logic and the same two format shapes.

Replace usages:
- `pages/producto/porciones/porciones.component.html:67` — `porcion.fecha | date : 'dd/MM/yyyy HH:mm'`
- `pages/producto/porciones/porciones.component.html:72` — `porcion.venta?.fechaVenta | date : 'dd/MM/yyyy'`
- `pages/producto/modal-porcion/modal-porcion.component.html:15` — `porcion.fecha | date : 'dd/MM/yyyy HH:mm'`
- `pages/ventas/prefacturacion/prefacturacion.component.html:107` — `pedido.fecha | date: 'dd/MM/yyyy HH:mm'`

### 3. legacy-php (`Distribuidor` and `Coproad` mirror)

Add a new **display/emission-only** helper to `FechaUtil` (both `legacy-php/Distribuidor/Clases/Util/FechaUtil.php` and `legacy-php/Coproad/Clases/Util/FechaUtil.php`):

```php
/**
 * Convierte una fecha-hora almacenada en UTC a America/Santiago.
 * Solo para columnas datetime (con hora); NO usar en columnas date.
 */
public static function aLocal($fechaUtc, $formato = 'd/m/Y H:i') {
    if (empty($fechaUtc)) { return ''; }
    $dt = new DateTime($fechaUtc, new DateTimeZone('UTC'));
    $dt->setTimezone(new DateTimeZone('America/Santiago'));
    return $dt->format($formato);
}
```

Apply `aLocal` at these **datetime** sites (each in both Distribuidor and Coproad):

- `Cobranzas/cobranzas/cobranzas.php:87` — `fecha_venta` (informe display); format `Y-m-d`.
- `Clases/Controlador/InformeCobranzaCTRL.php:176` — `fecha_venta` (informe display); format `d/m/Y`.
- `Clases/Negocio/XMLDTEEcertChileNEG.php:48` — `FchEmis` from `$dFechaEmis` (sale datetime); SII DTE emission date. Format `Y-m-d`.
- `Clases/Negocio/XMLNotaCreditoElectronicaNEG.php:32` — `FchRef` from `fecha_venta`; format `Y-m-d`.
- `Clases/Negocio/XMLNotaDebitoElectronicaNEG.php:32` — `FchRef` from `fecha_nota_credito`; format `Y-m-d`.
- `Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php:170` — `FchDoc` from `fecha_emision_docto`; format `Y-m-d`.
- `Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php:241` — `FchDoc` from `fecha_venta`; format `Y-m-d`.

**Leave unchanged (date-only column):**
- `Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php:52` — `FchResol` from `fecha_aprobacion_SII` (a `date` column). Keep `FechaUtil::aFechaYMD` / literal; do not convert.

Also review `Vista/` for any raw `echo $row['fecha_*']` of datetime columns and wrap them in `aLocal`; the FacturacionElectronica `subirLibroCV.php` echoes are form filter values (`$cFechaDesde`/`$cFechaHasta`), not stored datetimes — leave them.

## SII / DTE correctness note

The DTE emission/reference dates (`FchEmis`, `FchRef`, `FchDoc`) are legal Chilean-local dates. Emitting the UTC date would place late-evening (Santiago) sales on the following calendar day. Converting to America/Santiago is the correct legal behavior, not a regression.

## Testing

- **New frontend pipe** (Vitest): naive UTC string → expected Santiago output for both format shapes; a summer (UTC−3) and a winter (UTC−4) instant to prove DST is applied; a near-midnight instant that changes calendar day; null/empty → `''`.
- **Legacy frontend pipe**: equivalent unit tests (Jasmine/Karma per that project's setup).
- **PHP `aLocal`**: DST boundary (summer vs winter offset), near-midnight day rollover, empty input. Assert `fecha_aprobacion_SII` path is not routed through `aLocal`.
- **Regression guard**: confirm no writer/query path was changed (grep that `aLocal` is only used in display/XML emission, and `deFechaJQueryABD` is untouched).

## Verification

Drive each surface and observe a known UTC value renders as its Santiago equivalent:
- New frontend: prefacturación table.
- Legacy frontend: porciones + prefacturación.
- PHP: informe de cobranza HTML; a generated DTE XML `FchEmis` for a late-evening sale shows the correct Chilean date.
