# Fechas America/Santiago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display all stored-in-UTC datetimes in America/Santiago across the new Angular 20 frontend, the legacy Angular 14 frontend, and the legacy-php apps (Distribuidor + Coproad).

**Architecture:** Datetimes are stored as naive UTC strings (`"YYYY-MM-DD HH:MM:SS"`, no offset) and passed through verbatim by every API. At each *display* / SII-XML-emission site, interpret the string as UTC and format it in America/Santiago. Storage, inputs, filters, and date-only columns are untouched. Each frontend gets one small formatter pipe; PHP gets one new `FechaUtil::aLocal()` helper applied per site.

**Tech Stack:** Angular 20 (standalone, Vitest), Angular 14 (NgModule, Karma/Jasmine), PHP 5.6+ (`DateTime`/`DateTimeZone`).

## Global Constraints

- Target timezone is exactly `America/Santiago` (IANA name — DST-aware). Never a fixed numeric offset.
- Source values are **naive UTC** strings `"YYYY-MM-DD HH:MM:SS"`; normalize to a UTC instant before formatting.
- **Display-only.** Do NOT change any write path, query/filter construction, form-input parsing (`FechaUtil::deFechaJQueryABD`), or the API data contract.
- **Never convert date-only columns.** `t10_m_empresa.fecha_aprobacion_SII` (rendered as `FchResol` in `XMLLibroCVNEG`) stays a literal string.
- Two display format shapes only: `dd/MM/yyyy HH:mm` (date+time) and `dd/MM/yyyy` (date). PHP XML nodes use `Y-m-d`.
- Every change lands in **both** `Distribuidor` and `Coproad` PHP trees (mirrored).
- Chile offsets for test expectations: summer (e.g. January) = UTC−3, winter (e.g. July) = UTC−4.

---

### Task 1: New frontend `FechaLocalPipe` (Angular 20)

**Files:**
- Create: `apps/frontend/src/app/shared/fecha-local.pipe.ts`
- Create (test): `apps/frontend/src/app/shared/fecha-local.pipe.spec.ts`
- Modify: `apps/frontend/src/app/features/prefacturacion/prefacturacion-page.component.ts` (imports array + line 127 template)

**Interfaces:**
- Produces: `class FechaLocalPipe { transform(value: string | Date | null | undefined, format?: 'dd/MM/yyyy HH:mm' | 'dd/MM/yyyy'): string }` — standalone pipe, `name: 'fechaLocal'`, default format `'dd/MM/yyyy HH:mm'`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/frontend/src/app/shared/fecha-local.pipe.spec.ts
import { describe, it, expect } from "vitest";
import { FechaLocalPipe } from "./fecha-local.pipe";

describe("FechaLocalPipe", () => {
  const pipe = new FechaLocalPipe();

  it("formats a summer (UTC-3) naive-UTC datetime in Santiago", () => {
    expect(pipe.transform("2026-01-15 12:00:00", "dd/MM/yyyy HH:mm")).toBe("15/01/2026 09:00");
  });

  it("applies DST: winter is UTC-4 (one hour less than summer)", () => {
    expect(pipe.transform("2026-07-15 12:00:00", "dd/MM/yyyy HH:mm")).toBe("15/07/2026 08:00");
  });

  it("rolls the calendar day back across midnight for date-only format", () => {
    expect(pipe.transform("2026-01-15 02:00:00", "dd/MM/yyyy")).toBe("14/01/2026");
  });

  it("returns '' for empty/null input", () => {
    expect(pipe.transform("", "dd/MM/yyyy HH:mm")).toBe("");
    expect(pipe.transform(null, "dd/MM/yyyy")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/shared/fecha-local.pipe.spec.ts`
Expected: FAIL — cannot find module `./fecha-local.pipe`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/app/shared/fecha-local.pipe.ts
import { Pipe, PipeTransform } from "@angular/core";

const TZ = "America/Santiago";

/** Parse a naive UTC string ("YYYY-MM-DD HH:MM:SS") or Date/ISO into a UTC instant. */
function toUtcDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = value.trim().replace(" ", "T");
  // Append 'Z' only if the string carries no timezone designator.
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s += "Z";
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

@Pipe({ name: "fechaLocal", standalone: true })
export class FechaLocalPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: "dd/MM/yyyy HH:mm" | "dd/MM/yyyy" = "dd/MM/yyyy HH:mm",
  ): string {
    const d = toUtcDate(value);
    if (!d) return "";
    const withTime = format.includes("HH");
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    }).formatToParts(d);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const date = `${g("day")}/${g("month")}/${g("year")}`;
    return withTime ? `${date} ${g("hour")}:${g("minute")}` : date;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/shared/fecha-local.pipe.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire the pipe into the prefacturación template**

In `apps/frontend/src/app/features/prefacturacion/prefacturacion-page.component.ts`:
- Add import at top: `import { FechaLocalPipe } from "../../shared/fecha-local.pipe";`
- Add `FechaLocalPipe` to the `imports: [...]` array of the `@Component`.
- Change line 127 from:
  `<td class="t-muted">{{ p.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>`
  to:
  `<td class="t-muted">{{ p.fecha | fechaLocal: 'dd/MM/yyyy HH:mm' }}</td>`

- [ ] **Step 6: Verify the frontend still typechecks/builds**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/shared/fecha-local.pipe.ts apps/frontend/src/app/shared/fecha-local.pipe.spec.ts apps/frontend/src/app/features/prefacturacion/prefacturacion-page.component.ts
git commit -m "feat(frontend): show fechas in America/Santiago via fechaLocal pipe"
```

---

### Task 2: Legacy frontend `fechaLocal` pipe (Angular 14)

**Files:**
- Create: `apps/legacy-frontend/src/app/pipes/fecha-local.pipe.ts`
- Create (test): `apps/legacy-frontend/src/app/pipes/fecha-local.pipe.spec.ts`
- Modify: `apps/legacy-frontend/src/app/pages/shared/shared.module.ts` (declarations + exports)
- Modify: `apps/legacy-frontend/src/app/pages/producto/porciones/porciones.component.html:67,72`
- Modify: `apps/legacy-frontend/src/app/pages/producto/modal-porcion/modal-porcion.component.html:15`
- Modify: `apps/legacy-frontend/src/app/pages/ventas/prefacturacion/prefacturacion.component.html:107`

**Interfaces:**
- Produces: `class FechaLocalPipe { transform(value, format?): string }`, `name: 'fechaLocal'`, module-declared (NOT standalone — Angular 14 project uses NgModule pipes). Same behavior as Task 1's pipe.

- [ ] **Step 1: Write the failing test**

```ts
// apps/legacy-frontend/src/app/pipes/fecha-local.pipe.spec.ts
import { FechaLocalPipe } from './fecha-local.pipe';

describe('FechaLocalPipe', () => {
  const pipe = new FechaLocalPipe();

  it('formats a summer (UTC-3) naive-UTC datetime in Santiago', () => {
    expect(pipe.transform('2026-01-15 12:00:00', 'dd/MM/yyyy HH:mm')).toBe('15/01/2026 09:00');
  });

  it('applies DST: winter is UTC-4', () => {
    expect(pipe.transform('2026-07-15 12:00:00', 'dd/MM/yyyy HH:mm')).toBe('15/07/2026 08:00');
  });

  it('rolls the calendar day back across midnight for date-only format', () => {
    expect(pipe.transform('2026-01-15 02:00:00', 'dd/MM/yyyy')).toBe('14/01/2026');
  });

  it("returns '' for empty input", () => {
    expect(pipe.transform('', 'dd/MM/yyyy HH:mm')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (the legacy app is `serfel-ang`, **excluded from the pnpm workspace** — run inside its dir with its own installed deps):
`cd apps/legacy-frontend && npx ng test --watch=false --include='**/fecha-local.pipe.spec.ts'; cd -`
Expected: FAIL — module `./fecha-local.pipe` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/legacy-frontend/src/app/pipes/fecha-local.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

const TZ = 'America/Santiago';

function toUtcDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = String(value).trim().replace(' ', 'T');
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

@Pipe({ name: 'fechaLocal' })
export class FechaLocalPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: 'dd/MM/yyyy HH:mm' | 'dd/MM/yyyy' = 'dd/MM/yyyy HH:mm',
  ): string {
    const d = toUtcDate(value);
    if (!d) return '';
    const withTime = format.indexOf('HH') !== -1;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    }).formatToParts(d);
    const g = (t: string) => (parts.find((p) => p.type === t) || ({} as any)).value || '';
    const date = `${g('day')}/${g('month')}/${g('year')}`;
    return withTime ? `${date} ${g('hour')}:${g('minute')}` : date;
  }
}
```

- [ ] **Step 4: Register the pipe in `SharedModule`**

In `apps/legacy-frontend/src/app/pages/shared/shared.module.ts`:
- Add import: `import { FechaLocalPipe } from 'src/app/pipes/fecha-local.pipe';`
- Add `FechaLocalPipe` to both the `declarations: [...]` and `exports: [...]` arrays (alongside `MonedaPipe`).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/legacy-frontend && npx ng test --watch=false --include='**/fecha-local.pipe.spec.ts'; cd -`
Expected: PASS (4 tests).

- [ ] **Step 6: Swap the four template usages**

- `pages/producto/porciones/porciones.component.html:67`
  `{{ porcion.fecha | date : 'dd/MM/yyyy HH:mm' }}` → `{{ porcion.fecha | fechaLocal : 'dd/MM/yyyy HH:mm' }}`
- `pages/producto/porciones/porciones.component.html:72`
  `{{ porcion.venta?.fechaVenta | date : 'dd/MM/yyyy' }}` → `{{ porcion.venta?.fechaVenta | fechaLocal : 'dd/MM/yyyy' }}`
- `pages/producto/modal-porcion/modal-porcion.component.html:15`
  `{{ porcion.fecha | date : 'dd/MM/yyyy HH:mm' }}` → `{{ porcion.fecha | fechaLocal : 'dd/MM/yyyy HH:mm' }}`
- `pages/ventas/prefacturacion/prefacturacion.component.html:107`
  `{{ pedido.fecha | date: 'dd/MM/yyyy HH:mm' }}` → `{{ pedido.fecha | fechaLocal: 'dd/MM/yyyy HH:mm' }}`

- [ ] **Step 7: Verify the legacy app builds**

Run: `cd apps/legacy-frontend && npx ng build; cd -` (legacy app builds with Node 16 — use its own toolchain).
Expected: build succeeds (pipe resolves in all four templates via SharedModule).

- [ ] **Step 8: Commit**

```bash
git add apps/legacy-frontend/src/app/pipes/fecha-local.pipe.ts apps/legacy-frontend/src/app/pipes/fecha-local.pipe.spec.ts apps/legacy-frontend/src/app/pages/shared/shared.module.ts apps/legacy-frontend/src/app/pages/producto/porciones/porciones.component.html apps/legacy-frontend/src/app/pages/producto/modal-porcion/modal-porcion.component.html apps/legacy-frontend/src/app/pages/ventas/prefacturacion/prefacturacion.component.html
git commit -m "feat(legacy-frontend): show fechas in America/Santiago via fechaLocal pipe"
```

---

### Task 3: PHP `FechaUtil::aLocal()` helper (Distribuidor + Coproad)

**Files:**
- Modify: `legacy-php/Distribuidor/Clases/Util/FechaUtil.php`
- Modify: `legacy-php/Coproad/Clases/Util/FechaUtil.php`

**Interfaces:**
- Produces: `FechaUtil::aLocal(string $fechaUtc, string $formato = 'd/m/Y H:i'): string` — converts a naive UTC datetime string to America/Santiago; returns `''` for empty input. For datetime columns only.

- [ ] **Step 1: Add the helper to the Distribuidor FechaUtil**

In `legacy-php/Distribuidor/Clases/Util/FechaUtil.php`, inside the `FechaUtil` class (e.g. right after `aFechaDMY`), add:

```php
    /**
     * Convierte una fecha-hora almacenada en UTC a America/Santiago.
     * Solo para columnas datetime (con hora); NO usar en columnas date.
     *
     * @param string $fechaUtc  Fecha naive en UTC, ej "2026-08-17 12:00:00"
     * @param string $formato   Formato de salida (default 'd/m/Y H:i')
     * @return string
     */
    public static function aLocal($fechaUtc, $formato = 'd/m/Y H:i') {
        if (empty($fechaUtc)) {
            return '';
        }
        $dt = new DateTime($fechaUtc, new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone('America/Santiago'));
        return $dt->format($formato);
    }
```

Do NOT change the existing `date_default_timezone_set('UTC')` line or any other method.

- [ ] **Step 2: Verify the Distribuidor helper (runnable assertion)**

Run:
```bash
php -r 'require "legacy-php/Distribuidor/Clases/Util/FechaUtil.php";
assert(FechaUtil::aLocal("2026-01-15 12:00:00","Y-m-d H:i") === "2026-01-15 09:00");   // summer UTC-3
assert(FechaUtil::aLocal("2026-07-15 12:00:00","Y-m-d H:i") === "2026-07-15 08:00");   // winter UTC-4 (DST)
assert(FechaUtil::aLocal("2026-01-15 02:00:00","Y-m-d") === "2026-01-14");             // day rollback
assert(FechaUtil::aLocal("","Y-m-d") === "");
echo "OK\n";'
```
Expected: prints `OK` (no assertion failure).

- [ ] **Step 3: Add the identical helper to the Coproad FechaUtil**

Apply the exact same method addition from Step 1 to `legacy-php/Coproad/Clases/Util/FechaUtil.php`.

- [ ] **Step 4: Verify the Coproad helper**

Run:
```bash
php -r 'require "legacy-php/Coproad/Clases/Util/FechaUtil.php";
assert(FechaUtil::aLocal("2026-01-15 12:00:00","Y-m-d H:i") === "2026-01-15 09:00");
assert(FechaUtil::aLocal("2026-07-15 12:00:00","Y-m-d H:i") === "2026-07-15 08:00");
echo "OK\n";'
```
Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add legacy-php/Distribuidor/Clases/Util/FechaUtil.php legacy-php/Coproad/Clases/Util/FechaUtil.php
git commit -m "feat(legacy-php): add FechaUtil::aLocal UTC->America/Santiago helper"
```

---

### Task 4: Apply `aLocal` at PHP datetime display + SII-XML sites (Distribuidor + Coproad)

**Files (each in BOTH `Distribuidor/` and the mirrored `Coproad/`):**
- Modify: `.../Cobranzas/cobranzas/cobranzas.php:87`
- Modify: `.../Clases/Controlador/InformeCobranzaCTRL.php:176`
- Modify: `.../Clases/Negocio/XMLDTEEcertChileNEG.php:48`
- Modify: `.../Clases/Negocio/XMLNotaCreditoElectronicaNEG.php:32`
- Modify: `.../Clases/Negocio/XMLNotaDebitoElectronicaNEG.php:32`
- Modify: `.../Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php:170,241`
- **Do NOT modify** `.../XMLLibroCVNEG.php:52` (`FchResol` ← `fecha_aprobacion_SII`, date-only).

**Interfaces:**
- Consumes: `FechaUtil::aLocal(...)` from Task 3. All these files already reference `FechaUtil` (they call `aFechaYMD`/`aFechaDMY`), so no new `require`/`use` is needed.

- [ ] **Step 1: Cobranzas display (both apps)**

In `Cobranzas/cobranzas/cobranzas.php` line 87, change:
`echo "<td align='center'>" . FechaUtil::aFechaYMD($oRegListVenta->fecha_venta) . "</td>";`
to:
`echo "<td align='center'>" . FechaUtil::aLocal($oRegListVenta->fecha_venta, 'Y-m-d') . "</td>";`
Apply in both `legacy-php/Distribuidor/...` and `legacy-php/Coproad/...`.

- [ ] **Step 2: Informe de cobranza (both apps)**

In `Clases/Controlador/InformeCobranzaCTRL.php` line 176, change:
`<td>'.FechaUtil::aFechaDMY($venta->fecha_venta).'</td>`
to:
`<td>'.FechaUtil::aLocal($venta->fecha_venta, 'd/m/Y').'</td>`
Apply in both apps.

- [ ] **Step 3: DTE FchEmis (both apps)**

In `Clases/Negocio/XMLDTEEcertChileNEG.php` line 48, change:
`$oNodoTXTFchEmis = $oXML->createTextNode(FechaUtil::aFechaYMD($dFechaEmis));`
to:
`$oNodoTXTFchEmis = $oXML->createTextNode(FechaUtil::aLocal($dFechaEmis, 'Y-m-d'));`
Apply in both apps.

- [ ] **Step 4: Nota de crédito FchRef (both apps)**

In `Clases/Negocio/XMLNotaCreditoElectronicaNEG.php` line 32, change:
`$oNodoTXTFchRef = $oXML->createTextNode(FechaUtil::aFechaYMD($oVenta->fecha_venta));`
to:
`$oNodoTXTFchRef = $oXML->createTextNode(FechaUtil::aLocal($oVenta->fecha_venta, 'Y-m-d'));`
Apply in both apps.

- [ ] **Step 5: Nota de débito FchRef (both apps)**

In `Clases/Negocio/XMLNotaDebitoElectronicaNEG.php` line 32, change:
`$oNodoTXTFchRef = $oXML->createTextNode(FechaUtil::aFechaYMD($oNotaCredito->fecha_nota_credito));`
to:
`$oNodoTXTFchRef = $oXML->createTextNode(FechaUtil::aLocal($oNotaCredito->fecha_nota_credito, 'Y-m-d'));`
Apply in both apps.

- [ ] **Step 6: Libro CV FchDoc — the two datetime nodes (both apps)**

In `Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php`:
- Line 170, change:
  `$oNodoTXTFchDoc = $oXML->createTextNode(FechaUtil::aFechaYMD($oRecepcion->fecha_emision_docto));`
  to:
  `$oNodoTXTFchDoc = $oXML->createTextNode(FechaUtil::aLocal($oRecepcion->fecha_emision_docto, 'Y-m-d'));`
- Line 241, change:
  `$oNodoTXTFchDoc = $oXML->createTextNode(FechaUtil::aFechaYMD($oVenta->fecha_venta));`
  to:
  `$oNodoTXTFchDoc = $oXML->createTextNode(FechaUtil::aLocal($oVenta->fecha_venta, 'Y-m-d'));`
- **Leave line 52 (`FchResol` ← `fecha_aprobacion_SII`) exactly as-is.**
Apply in both apps.

- [ ] **Step 7: Lint-check every edited PHP file for syntax errors**

Run:
```bash
for f in \
  legacy-php/Distribuidor/Cobranzas/cobranzas/cobranzas.php \
  legacy-php/Distribuidor/Clases/Controlador/InformeCobranzaCTRL.php \
  legacy-php/Distribuidor/Clases/Negocio/XMLDTEEcertChileNEG.php \
  legacy-php/Distribuidor/Clases/Negocio/XMLNotaCreditoElectronicaNEG.php \
  legacy-php/Distribuidor/Clases/Negocio/XMLNotaDebitoElectronicaNEG.php \
  legacy-php/Distribuidor/Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php \
  legacy-php/Coproad/Cobranzas/cobranzas/cobranzas.php \
  legacy-php/Coproad/Clases/Controlador/InformeCobranzaCTRL.php \
  legacy-php/Coproad/Clases/Negocio/XMLDTEEcertChileNEG.php \
  legacy-php/Coproad/Clases/Negocio/XMLNotaCreditoElectronicaNEG.php \
  legacy-php/Coproad/Clases/Negocio/XMLNotaDebitoElectronicaNEG.php \
  legacy-php/Coproad/Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php ; do
  php -l "$f" || exit 1
done
```
Expected: `No syntax errors detected` for each file.

- [ ] **Step 8: Confirm `FchResol` / date-only path was NOT changed**

Run: `grep -n "FchResol\|fecha_aprobacion_SII\|aLocal" legacy-php/Distribuidor/Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php legacy-php/Coproad/Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php`
Expected: the `FchResol` node still uses `aFechaYMD` (or original literal), NOT `aLocal`; the two `FchDoc` nodes use `aLocal`.

- [ ] **Step 9: Commit**

```bash
git add legacy-php/Distribuidor legacy-php/Coproad
git commit -m "feat(legacy-php): render datetime display + DTE dates in America/Santiago"
```

---

## Notes for the executor

- The Angular `date` pipe's `timezone` parameter is deliberately NOT used: it accepts only a fixed offset, which is wrong across Chile's DST boundary. The `Intl.DateTimeFormat` + IANA `America/Santiago` approach is required.
- If a legacy-frontend module that renders one of the four templates ever fails to resolve `fechaLocal`, confirm that module imports `SharedModule` (both `producto.module.ts` and `ventas.module.ts` already do).
- PHP `php -r` verification requires a local PHP CLI (5.6+ has `DateTime`/`DateTimeZone`) with the tz database available (bundled with PHP). Exact minute values assume an up-to-date tz database; the essential assertion is that summer (−3) and winter (−4) differ by one hour.
