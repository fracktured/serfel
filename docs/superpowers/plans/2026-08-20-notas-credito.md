# Notas de Crédito Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Gestión → Notas de Crédito" module so a user can search an emitted electronic invoice, issue a Nota de Crédito (partial correction or full void), emit it to facturación.cl over REST with a flat file, and list/reprint issued NCs.

**Architecture:** A VPC `notas-credito` Hono lambda owns all DB work (search ventas read-only, insert `40_m_nota_credito`/`40_m_prod_nota_credito`, reserve folio, restitute stock). It delegates the outbound HTTPS call to facturación.cl to a separate **non-VPC** `facturacion-emisor` lambda (invoked via the Lambda SDK) because the private subnet has no internet egress. Shared Zod schemas + two pure functions (`computeNcTotales`, `buildFlatFile`) are the single source of truth reused by lambda and Angular.

**Tech Stack:** TypeScript, Hono, Drizzle ORM (MariaDB), Zod, `@aws-sdk/client-lambda` + `@aws-sdk/client-secrets-manager`, Vitest, Angular 20 (standalone + signals), SST v3 (Pulumi).

## Global Constraints

- Node `>=22`; run all commands from repo root unless noted.
- Lambda/DB tests need local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` first.
- `40_m_venta` and `40_m_producto_venta` are **never** modified by this module.
- Never hand-assign primary keys — schema uses AUTO_INCREMENT; reads use `ResultSetHeader.insertId` (drizzle `insertId`).
- DB schema changes: edit `packages/db/src/schema.ts`, then `pnpm --filter @serfel/db generate` to produce a versioned migration; never edit generated SQL by hand except for data-seed migrations.
- A new Hono route MUST also be added to the `infra/api.ts` explicit route array, or the browser gets a CORS 404.
- Adding a `MODULE_ROLES` module ripples into hardcoded module-list fixtures — update them in the same task (`lambdas/products/tests/app.test.ts`, `lambdas/products/tests/service.test.ts`, `apps/frontend/src/app/core/nav.spec.ts`).
- Internal `10_p_tipo_docto` codes: `9` = Factura Electrónica, `11` = Nota Crédito Electrónica. facturación.cl/SII DTE types: `33` = Factura Electrónica, `61` = Nota Crédito Electrónica. Do not conflate.
- Correction codes (`CodRef`): `1` = anula, `3` = corrige montos. `2` (corrige texto) is out of scope.
- Money columns are integers (CLP, no decimals); `cantidad` is `decimal(18,3)` stored as string in drizzle.
- Secrets never enter source or logs. facturación.cl credentials live only in Secrets Manager, resolved at runtime by the emisor.
- Single quotes for module strings, 2-space indent, existing file conventions (`t40M…` table names, `AppError` codes) — match surrounding code.

## File Structure

**Create:**
- `packages/shared/src/notas-credito.ts` — constants, Zod schemas, DTOs, `computeNcTotales`, `buildFlatFile`.
- `packages/shared/src/notas-credito.spec.ts` — pure-function tests.
- `lambdas/facturacion-emisor/index.ts` — non-VPC emisor handler (login/procesar/obtenerlink).
- `lambdas/facturacion-emisor/facturacion-client.ts` — pure-ish HTTP client (injectable `fetch`).
- `lambdas/facturacion-emisor/tests/facturacion-client.test.ts`
- `lambdas/notas-credito/{index,app,service,authz,errors,types}.ts` — Hono lambda (mirror `lambdas/ventas/`).
- `lambdas/notas-credito/tests/{service.test.ts,app.test.ts,helpers.ts}`
- `apps/frontend/src/app/features/notas-credito/{notas-credito-page.component.ts,notas-credito-api.service.ts,notas-credito-store.ts,notas-credito-logic.ts,notas-credito-logic.spec.ts}`

**Modify:**
- `packages/db/src/schema.ts` — `40_m_folios_electronicos` table; AUTO_INCREMENT on `40_m_nota_credito.id_nota_credito`.
- `packages/shared/src/index.ts` — export `./notas-credito`.
- `packages/shared/src/authz.ts` — add `notas_credito` to `MODULE_ROLES`.
- `infra/api.ts` — new lambdas + routes + IAM.
- `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/core/nav.ts` — route + nav leaf.
- Fixtures: `lambdas/products/tests/app.test.ts`, `lambdas/products/tests/service.test.ts`, `apps/frontend/src/app/core/nav.spec.ts`.

---

### Task 1: DB migrations — folios table + NC autoincrement

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create (generated): `packages/db/migrations/00NN_*.sql`

**Interfaces:**
- Produces: drizzle table `t40MFoliosElectronicos` with columns `{ id, fechaCreacion, rutEmpresa, idTipoDocto, folioDesde, folioHasta, ultFolio }`; `t40MNotaCredito.idNotaCredito` becomes `.autoincrement()`.

- [ ] **Step 1: Add the folios table to the schema**

In `packages/db/src/schema.ts`, after `t40MNotaCredito`, add:

```ts
export const t40MFoliosElectronicos = mysqlTable("40_m_folios_electronicos", {
	id: int("id").autoincrement().notNull(),
	fechaCreacion: datetime("fecha_creacion", { mode: 'string' }).notNull(),
	rutEmpresa: int("rut_empresa").notNull(),
	idTipoDocto: int("id_tipo_docto").notNull(),
	folioDesde: int("folio_desde").notNull(),
	folioHasta: int("folio_hasta").notNull(),
	ultFolio: int("ult_folio").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "PRIMARY" }),
	index("folios_emp_tipo").on(table.rutEmpresa, table.idTipoDocto),
]);
```

- [ ] **Step 2: Make id_nota_credito AUTO_INCREMENT**

In `t40MNotaCredito`, change the PK column line:

```ts
	idNotaCredito: int("id_nota_credito").autoincrement().notNull(),
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm --filter @serfel/db generate`
Expected: a new `packages/db/migrations/00NN_*.sql` creating `40_m_folios_electronicos` and altering `40_m_nota_credito`. Note the number NN.

- [ ] **Step 4: Verify it applies on a clean DB**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm --filter @serfel/db test
```
Expected: PASS (the schema-only migrate path builds the new table without error).

> **Note for prod/dev apply (not this task):** the live `40_m_nota_credito` is populated, so the AUTO_INCREMENT ALTER hits the FK-parent (1834/1452) and id=0 (1062) traps documented in prior migrations (`0008_usuario_id_autoincrement.sql`, `0012_marca_autoincrement_estado.sql`). Follow that same drop/re-add-FK + `NO_AUTO_VALUE_ON_ZERO` recipe when running `db:migrate` against dev/prod.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/migrations
git commit -m "feat(db): add 40_m_folios_electronicos + autoincrement nota_credito PK"
```

---

### Task 2: Shared — constants, Zod schemas, DTOs

**Files:**
- Create: `packages/shared/src/notas-credito.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/notas-credito.spec.ts`

**Interfaces:**
- Produces: constants `TIPO_DOCTO_FACTURA_ELECTRONICA=9`, `TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA=11`, `DTE_FACTURA_ELECTRONICA=33`, `DTE_NOTA_CREDITO_ELECTRONICA=61`, `COD_REF_ANULA=1`, `COD_REF_CORRIGE_MONTOS=3`. Schema `EmitirNcInputSchema` → type `EmitirNcInput = { idVenta: number; idMotivo: number; codRef: 1 | 3; lineas: { idProducto: number; cantidad: number; precio: number; porcenDesc: number }[] }`. DTOs `VentaCreditableDto`, `NcLineaDto`, `NotaCreditoListItemDto`, `EmitirNcResultDto`.

- [ ] **Step 1: Write failing tests for the input schema**

Create `packages/shared/src/notas-credito.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EmitirNcInputSchema, COD_REF_ANULA, COD_REF_CORRIGE_MONTOS } from "./notas-credito";

describe("EmitirNcInputSchema", () => {
  it("accepts a valid corrige-montos NC", () => {
    const r = EmitirNcInputSchema.safeParse({
      idVenta: 5, idMotivo: 1, codRef: COD_REF_CORRIGE_MONTOS,
      lineas: [{ idProducto: 2, cantidad: 1, precio: 1000, porcenDesc: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty lineas array", () => {
    const r = EmitirNcInputSchema.safeParse({ idVenta: 5, idMotivo: 1, codRef: COD_REF_ANULA, lineas: [] });
    expect(r.success).toBe(false);
  });

  it("rejects codRef 2 (corrige texto, out of scope)", () => {
    const r = EmitirNcInputSchema.safeParse({
      idVenta: 5, idMotivo: 1, codRef: 2,
      lineas: [{ idProducto: 2, cantidad: 1, precio: 1000, porcenDesc: 0 }],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/shared exec vitest run src/notas-credito.spec.ts`
Expected: FAIL — cannot find module `./notas-credito`.

- [ ] **Step 3: Implement constants, schema, and DTOs**

Create `packages/shared/src/notas-credito.ts`:

```ts
import { z } from "zod";

/** Internal 10_p_tipo_docto codes. */
export const TIPO_DOCTO_FACTURA_ELECTRONICA = 9;
export const TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA = 11;

/** facturación.cl / SII DTE types. */
export const DTE_FACTURA_ELECTRONICA = 33;
export const DTE_NOTA_CREDITO_ELECTRONICA = 61;

/** CodRef in the flat-file ->Referencia<- section. */
export const COD_REF_ANULA = 1;
export const COD_REF_CORRIGE_MONTOS = 3;

export const NcLineaInputSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  precio: z.number().int().nonnegative(),
  porcenDesc: z.number().int().min(0).max(100),
});
export type NcLineaInput = z.infer<typeof NcLineaInputSchema>;

export const EmitirNcInputSchema = z.object({
  idVenta: z.number().int().positive(),
  idMotivo: z.number().int().positive(),
  codRef: z.union([z.literal(COD_REF_ANULA), z.literal(COD_REF_CORRIGE_MONTOS)]),
  lineas: z.array(NcLineaInputSchema).nonempty(),
});
export type EmitirNcInput = z.infer<typeof EmitirNcInputSchema>;

export interface NcLineaDto {
  idProducto: number;
  codSerfel: number; // 20_m_producto.cod_serfel is an int
  descripcion: string;
  cantidad: number;
  precio: number;
  porcenDesc: number;
  impuesto: number; // 99_p_impuesto id on the producto
}

export interface VentaCreditableDto {
  idVenta: number;
  idFolio: number;
  numDoctoEmitido: number;
  fechaVenta: string;
  rutEmpresa: number;
  rutCliente: number;
  nomCliente: string;
  precioTotal: number;
  montoYaCreditado: number; // sum of existing NC precio_total against this venta
  lineas: NcLineaDto[];
}

export interface NotaCreditoListItemDto {
  idNotaCredito: number;
  idVenta: number;
  idFolio: number;
  numNotaCredito: number;
  rutCliente: number;
  nomCliente: string;
  fechaNotaCredito: string;
  precioTotal: number;
  esElectronica: boolean;
}

export interface EmitirNcResultDto {
  idNotaCredito: number;
  idFolio: number;
  esElectronica: boolean;
  urlPdfOriginal: string;
  urlPdfCedible: string;
}
```

- [ ] **Step 4: Export from the shared barrel**

In `packages/shared/src/index.ts`, add after the `precios` line:

```ts
export * from "./notas-credito";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @serfel/shared exec vitest run src/notas-credito.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/notas-credito.ts packages/shared/src/notas-credito.spec.ts packages/shared/src/index.ts
git commit -m "feat(shared): notas-credito constants, schema, DTOs"
```

---

### Task 3: Shared — `computeNcTotales` pure function

**Files:**
- Modify: `packages/shared/src/notas-credito.ts`
- Test: `packages/shared/src/notas-credito.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `computeNcTotales(lineas, opts) → NcTotales` where
  `lineas: { cantidad: number; precio: number; porcenDesc: number; impuesto: number }[]`,
  `opts: { ivaValor: number; especValor: number; rateOf: (impuesto: number) => number | null }`,
  `NcTotales = { subTotal: number; iva: number; espec: number; iaba: number; precioTotal: number }`.
  Constants `IMPUESTO_ESPEC=2` already exist in `@serfel/shared` (ventas.ts) — import from the barrel is circular within the package, so re-declare locally: `const IMPUESTO_ESPEC = 2`.

- [ ] **Step 1: Write failing tests**

Append to `packages/shared/src/notas-credito.spec.ts`:

```ts
import { computeNcTotales } from "./notas-credito";

describe("computeNcTotales", () => {
  const opts = { ivaValor: 19, especValor: 0, rateOf: () => null };

  it("sums neto with discount and applies IVA", () => {
    // 2 * 1000 = 2000, 10% desc -> 1800, IVA 19% -> 342
    const t = computeNcTotales([{ cantidad: 2, precio: 1000, porcenDesc: 10, impuesto: 3 }], opts);
    expect(t.subTotal).toBe(1800);
    expect(t.iva).toBe(342);
    expect(t.precioTotal).toBe(2142);
  });

  it("applies the ESPEC rate to espec-taxed products", () => {
    const t = computeNcTotales(
      [{ cantidad: 1, precio: 1000, porcenDesc: 0, impuesto: 2 }],
      { ivaValor: 19, especValor: 12, rateOf: () => null },
    );
    expect(t.espec).toBe(120);
    expect(t.precioTotal).toBe(1000 + 120 + 0 + 190);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/shared exec vitest run src/notas-credito.spec.ts -t computeNcTotales`
Expected: FAIL — `computeNcTotales` is not exported.

- [ ] **Step 3: Implement the function**

Append to `packages/shared/src/notas-credito.ts`:

```ts
const IMPUESTO_ESPEC = 2;

export interface NcTotales {
  subTotal: number;
  iva: number;
  espec: number;
  iaba: number;
  precioTotal: number;
}

export function computeNcTotales(
  lineas: { cantidad: number; precio: number; porcenDesc: number; impuesto: number }[],
  opts: { ivaValor: number; especValor: number; rateOf: (impuesto: number) => number | null },
): NcTotales {
  let subTotal = 0;
  let espec = 0;
  let iaba = 0;
  for (const l of lineas) {
    const bruto = Math.round(l.cantidad * l.precio);
    const conDesc = bruto - Math.round((bruto * l.porcenDesc) / 100);
    subTotal += conDesc;
    if (l.impuesto === IMPUESTO_ESPEC) {
      espec += Math.round((conDesc * opts.especValor) / 100);
    } else if (l.impuesto > 0) {
      const rate = opts.rateOf(l.impuesto);
      if (rate !== null) iaba += Math.round((conDesc * rate) / 100);
    }
  }
  const iva = Math.round((subTotal * opts.ivaValor) / 100);
  return { subTotal, iva, espec, iaba, precioTotal: subTotal + espec + iaba + iva };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/shared exec vitest run src/notas-credito.spec.ts -t computeNcTotales`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/notas-credito.ts packages/shared/src/notas-credito.spec.ts
git commit -m "feat(shared): computeNcTotales"
```

---

### Task 4: Shared — `buildFlatFile` pure function

**Files:**
- Modify: `packages/shared/src/notas-credito.ts`
- Test: `packages/shared/src/notas-credito.spec.ts`

**Interfaces:**
- Consumes: constants from Task 2, `NcTotales` from Task 3.
- Produces: `buildFlatFile(doc: FlatFileDoc) → string` where
  `FlatFileDoc = { folio: number; fecha: string; rutReceptor: string; rsReceptor: string; giroReceptor: string; dirReceptor: string; comReceptor: string; ciuReceptor: string; emailReceptor: string; totales: NcTotales; lineas: FlatLinea[]; referencia: { folioRef: number; fchRef: string; codRef: number; razonRef: string } }`,
  `FlatLinea = { codigo: string; descripcion: string; cantidad: number; precio: number; porcenDesc: number; valor: number }`.

- [ ] **Step 1: Write failing tests**

Append to `packages/shared/src/notas-credito.spec.ts`:

```ts
import { buildFlatFile, DTE_NOTA_CREDITO_ELECTRONICA, DTE_FACTURA_ELECTRONICA, COD_REF_ANULA } from "./notas-credito";

describe("buildFlatFile", () => {
  const doc = {
    folio: 501, fecha: "2026-08-20",
    rutReceptor: "76543210-9", rsReceptor: "Cliente SA", giroReceptor: "Comercio",
    dirReceptor: "Calle 1", comReceptor: "Santiago", ciuReceptor: "Santiago", emailReceptor: "a@b.cl",
    totales: { subTotal: 1000, iva: 190, espec: 0, iaba: 0, precioTotal: 1190 },
    lineas: [{ codigo: "P1", descripcion: "Prod 1", cantidad: 1, precio: 1000, porcenDesc: 0, valor: 1000 }],
    referencia: { folioRef: 123, fchRef: "2026-08-01", codRef: COD_REF_ANULA, razonRef: "OTROS" },
  };

  it("emits the credit-note DTE type 61 in the header", () => {
    expect(buildFlatFile(doc)).toContain(`${DTE_NOTA_CREDITO_ELECTRONICA};501;`);
  });

  it("references the original factura electrónica (33) with its folio and CodRef", () => {
    const out = buildFlatFile(doc);
    expect(out).toContain("->Referencia<-");
    expect(out).toContain(`${DTE_FACTURA_ELECTRONICA};123;2026-08-01;${COD_REF_ANULA};OTROS`);
  });

  it("emits one detail line per producto", () => {
    expect(buildFlatFile(doc)).toMatch(/->Detalle<-[\s\S]*P1;Prod 1;1;1000/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/shared exec vitest run src/notas-credito.spec.ts -t buildFlatFile`
Expected: FAIL — `buildFlatFile` not exported.

- [ ] **Step 3: Implement the builder**

Append to `packages/shared/src/notas-credito.ts`. The flat file uses labeled sections with semicolon-delimited fields (per facturación.cl archivoplano spec). Header TipoDTE is 61 (NC electrónica); the reference points at the original DTE 33.

```ts
export interface FlatLinea {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  porcenDesc: number;
  valor: number;
}

export interface FlatFileDoc {
  folio: number;
  fecha: string; // Y-m-d
  rutReceptor: string;
  rsReceptor: string;
  giroReceptor: string;
  dirReceptor: string;
  comReceptor: string;
  ciuReceptor: string;
  emailReceptor: string;
  totales: NcTotales;
  lineas: FlatLinea[];
  referencia: { folioRef: number; fchRef: string; codRef: number; razonRef: string };
}

export function buildFlatFile(doc: FlatFileDoc): string {
  const L: string[] = [];
  L.push("->Encabezado<-");
  // TipoDTE;Folio;FechaEmision;RUTReceptor;RSReceptor;GiroReceptor;DirReceptor;ComReceptor;CiuReceptor;Email;
  L.push(
    `${DTE_NOTA_CREDITO_ELECTRONICA};${doc.folio};${doc.fecha};${doc.rutReceptor};${doc.rsReceptor};` +
      `${doc.giroReceptor};${doc.dirReceptor};${doc.comReceptor};${doc.ciuReceptor};${doc.emailReceptor};`,
  );
  L.push("->Totales<-");
  L.push(`${doc.totales.subTotal};${doc.totales.iva};${doc.totales.espec};${doc.totales.iaba};${doc.totales.precioTotal};`);
  L.push("->Detalle<-");
  doc.lineas.forEach((l, i) => {
    // NroLinea;Codigo;Descripcion;Cantidad;Precio;PorcDescto;Valor;
    L.push(`${i + 1};${l.codigo};${l.descripcion};${l.cantidad};${l.precio};${l.porcenDesc};${l.valor};`);
  });
  L.push("->Referencia<-");
  // NroLineaRef;TipoDTERef;FolioRef;FechaRef;CodigoRef;RazonRef;
  L.push(
    `1;${DTE_FACTURA_ELECTRONICA};${doc.referencia.folioRef};${doc.referencia.fchRef};` +
      `${doc.referencia.codRef};${doc.referencia.razonRef};`,
  );
  return L.join("\n") + "\n";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/shared exec vitest run src/notas-credito.spec.ts -t buildFlatFile`
Expected: PASS (3 tests).

- [ ] **Step 5: Full shared suite + typecheck**

Run: `pnpm --filter @serfel/shared test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/notas-credito.ts packages/shared/src/notas-credito.spec.ts
git commit -m "feat(shared): buildFlatFile flat-file builder"
```

> **Field-layout caveat for execution:** the exact column order/count of the flat file must match the facturación.cl `archivoplano.php` spec for the account in use. Before deploying, validate one real payload against `formato=1` in the facturación.cl test environment and adjust the field lists in `buildFlatFile` if the vendor rejects them. The section labels and DTE/CodRef codes above are correct; only column padding/order may need tuning.

---

### Task 5: `facturacion-emisor` lambda (non-VPC HTTP client)

**Files:**
- Create: `lambdas/facturacion-emisor/facturacion-client.ts`
- Create: `lambdas/facturacion-emisor/index.ts`
- Test: `lambdas/facturacion-emisor/tests/facturacion-client.test.ts`

**Interfaces:**
- Produces: `createFacturacionClient(fetchFn, baseUrl) → { login(creds), procesar(token, fileB64), obtenerLink(token, args) }`; handler event `EmisorEvent = { op: "procesar"; rutEmpresa: string; flatFileBase64: string } | { op: "obtenerlink"; rutEmpresa: string; folio: number; tipoDte: number; cedible: boolean }`; result `EmisorResult = { ok: boolean; folio?: number; urlPdfOriginal?: string; urlPdfCedible?: string; url?: string; resultado?: string; error?: string }`.

- [ ] **Step 1: Create the lambda workspace package**

Create `lambdas/facturacion-emisor/package.json`:

```json
{
  "name": "@serfel/facturacion-emisor",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-secrets-manager": "catalog:",
    "@serfel/shared": "workspace:*"
  },
  "devDependencies": { "vitest": "catalog:" }
}
```

Run: `pnpm install`
Expected: workspace linked. (If `catalog:` versions differ, copy the exact versions used by `lambdas/ventas/package.json`.)

- [ ] **Step 2: Write failing tests for the client**

Create `lambdas/facturacion-emisor/tests/facturacion-client.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createFacturacionClient } from "../facturacion-client";

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

describe("facturacion-client", () => {
  it("login posts credentials and returns the token", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ token: "JWT123" }));
    const c = createFacturacionClient(fetchFn, "https://api.test");
    const token = await c.login({ usuario: "U", rut: "1-9", clave: "P" });
    expect(token).toBe("JWT123");
    expect(fetchFn).toHaveBeenCalledWith("https://api.test/login", expect.objectContaining({ method: "POST" }));
  });

  it("procesar sends the base64 file with formato=1 and returns folio", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ Resultado: "OK", Folio: 501 }));
    const c = createFacturacionClient(fetchFn, "https://api.test");
    const r = await c.procesar("JWT123", "BASE64FILE");
    expect(r.ok).toBe(true);
    expect(r.folio).toBe(501);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("/wsds/procesar");
    expect(url).toContain("formato=1");
    expect(url).toContain("file=BASE64FILE");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @serfel/facturacion-emisor exec vitest run`
Expected: FAIL — cannot find `../facturacion-client`.

- [ ] **Step 4: Implement the client**

Create `lambdas/facturacion-emisor/facturacion-client.ts`:

```ts
export interface Credenciales { usuario: string; rut: string; clave: string; }
export interface ProcesarResult { ok: boolean; folio?: number; resultado?: string; error?: string; }

type FetchFn = typeof fetch;

export function createFacturacionClient(fetchFn: FetchFn, baseUrl: string) {
  async function login(creds: Credenciales): Promise<string> {
    const res = await fetchFn(`${baseUrl}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuario: creds.usuario, rut: creds.rut, clave: creds.clave }),
    });
    if (!res.ok) throw new Error(`login failed: ${res.status}`);
    const body = (await res.json()) as { token?: string };
    if (!body.token) throw new Error("login returned no token");
    return body.token;
  }

  async function procesar(token: string, fileB64: string): Promise<ProcesarResult> {
    const qs = new URLSearchParams({ file: fileB64, formato: "1", incluyelink: "1" });
    const res = await fetchFn(`${baseUrl}/wsds/procesar?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: token },
    });
    if (!res.ok) return { ok: false, error: `procesar HTTP ${res.status}` };
    const body = (await res.json()) as { Resultado?: string; Folio?: number; Error?: string };
    const ok = (body.Resultado ?? "").toUpperCase() === "OK";
    return { ok, folio: body.Folio, resultado: body.Resultado, error: ok ? undefined : (body.Error ?? body.Resultado) };
  }

  async function obtenerLink(
    token: string,
    args: { folio: number; tipoDte: number; cedible: boolean },
  ): Promise<string> {
    const qs = new URLSearchParams({
      tpomov: "V",
      folio: String(args.folio),
      tipo: String(args.tipoDte),
      cedible: args.cedible ? "True" : "False",
    });
    const res = await fetchFn(`${baseUrl}/wsds/obtenerlink?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: token },
    });
    if (!res.ok) throw new Error(`obtenerlink HTTP ${res.status}`);
    const body = (await res.json()) as { Mensaje?: string; url?: string };
    return body.url ?? body.Mensaje ?? "";
  }

  return { login, procesar, obtenerLink };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @serfel/facturacion-emisor exec vitest run`
Expected: PASS (2 tests).

- [ ] **Step 6: Implement the handler**

Create `lambdas/facturacion-emisor/index.ts`. Resolves the per-rut credential blob from Secrets Manager (JSON keyed by rut), then runs the requested op. The DTE type for NC obtenerlink is 61.

```ts
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DTE_NOTA_CREDITO_ELECTRONICA } from "@serfel/shared";
import { createFacturacionClient, type Credenciales } from "./facturacion-client";

const sm = new SecretsManagerClient({});
const BASE_URL = process.env.FACT_BASE_URL ?? "https://www.facturacion.cl";
let credsByRut: Record<string, Credenciales> | null = null;

async function loadCreds(): Promise<Record<string, Credenciales>> {
  if (credsByRut) return credsByRut;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.FACT_SECRET_ARN }));
  if (!secret.SecretString) throw new Error("FACT secret has no SecretString");
  credsByRut = JSON.parse(secret.SecretString) as Record<string, Credenciales>;
  return credsByRut;
}

export type EmisorEvent =
  | { op: "procesar"; rutEmpresa: string; flatFileBase64: string }
  | { op: "obtenerlink"; rutEmpresa: string; folio: number; tipoDte: number; cedible: boolean };

export interface EmisorResult {
  ok: boolean;
  folio?: number;
  urlPdfOriginal?: string;
  urlPdfCedible?: string;
  url?: string;
  resultado?: string;
  error?: string;
}

export async function handler(event: EmisorEvent): Promise<EmisorResult> {
  try {
    const creds = (await loadCreds())[event.rutEmpresa];
    if (!creds) return { ok: false, error: `Sin credenciales para rut ${event.rutEmpresa}` };
    const client = createFacturacionClient(fetch, BASE_URL);
    const token = await client.login(creds);

    if (event.op === "procesar") {
      const r = await client.procesar(token, event.flatFileBase64);
      if (!r.ok || r.folio === undefined) return { ok: false, resultado: r.resultado, error: r.error };
      const [orig, ced] = await Promise.all([
        client.obtenerLink(token, { folio: r.folio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: false }),
        client.obtenerLink(token, { folio: r.folio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: true }),
      ]);
      return { ok: true, folio: r.folio, urlPdfOriginal: orig, urlPdfCedible: ced, resultado: r.resultado };
    }

    const url = await client.obtenerLink(token, { folio: event.folio, tipoDte: event.tipoDte, cedible: event.cedible });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm typecheck`
Expected: PASS.

```bash
git add lambdas/facturacion-emisor
git commit -m "feat(facturacion-emisor): non-VPC REST client + handler"
```

---

### Task 6: `notas-credito` lambda scaffold + search + over-credit guard

**Files:**
- Create: `lambdas/notas-credito/{index,app,service,authz,errors,types}.ts`, `lambdas/notas-credito/package.json`
- Test: `lambdas/notas-credito/tests/{service.test.ts,helpers.ts}`

**Interfaces:**
- Consumes: `@serfel/db` tables, `@serfel/shared` DTOs, `EmisorEvent`/`EmisorResult` (Task 5).
- Produces: `AppDeps = { getDb: () => Promise<Db>; getIdUsuario: (c) => number | null; invokeEmisor: (e: EmisorEvent) => Promise<EmisorResult> }`; `getUserTipo(db, idUsuario)`; `searchVentasCreditables(db, q: string) → VentaCreditableDto[]`; `getVentaCreditable(db, idVenta) → VentaCreditableDto | null`.

- [ ] **Step 1: Scaffold package.json + errors + types + authz**

Copy `lambdas/ventas/package.json` to `lambdas/notas-credito/package.json`, rename to `@serfel/notas-credito`, and add `"@aws-sdk/client-lambda": "catalog:"` to dependencies. Then copy `lambdas/ventas/errors.ts` and `lambdas/ventas/authz.ts` verbatim into `lambdas/notas-credito/` (they are module-agnostic; `authz.ts` takes the module name as a parameter). Create `lambdas/notas-credito/types.ts`:

```ts
import type { Context } from "hono";
import type { Db } from "@serfel/db";
import type { EmisorEvent, EmisorResult } from "@serfel/facturacion-emisor";

export interface AppDeps {
  getDb: () => Promise<Db>;
  getIdUsuario: (c: Context) => number | null;
  invokeEmisor: (event: EmisorEvent) => Promise<EmisorResult>;
}

export type AppEnv = { Variables: { idUsuario: number; idTipoUsuario: number } };
```

Add `"@serfel/facturacion-emisor": "workspace:*"` to `lambdas/notas-credito/package.json` dependencies, then run `pnpm install`.

- [ ] **Step 2: Write failing test for the over-credit guard + search**

Create `lambdas/notas-credito/tests/helpers.ts` by copying `lambdas/ventas/tests/helpers.ts` (test DB bootstrap). Then create `lambdas/notas-credito/tests/service.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { makeTestDb, seedVenta } from "./helpers";
import { getVentaCreditable } from "../service";

let db: Awaited<ReturnType<typeof makeTestDb>>;
beforeAll(async () => { db = await makeTestDb(); });

describe("getVentaCreditable", () => {
  it("returns the venta with its lineas and montoYaCreditado = 0 when no NC exists", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 123, precioTotal: 1190 });
    const v = await getVentaCreditable(db, idVenta);
    expect(v).not.toBeNull();
    expect(v!.idFolio).toBe(123);
    expect(v!.montoYaCreditado).toBe(0);
    expect(v!.lineas.length).toBeGreaterThan(0);
  });

  it("returns null for a non-tipo-9 venta", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 1, idFolio: 0, precioTotal: 1000 });
    expect(await getVentaCreditable(db, idVenta)).toBeNull();
  });
});
```

`seedVenta` is a helper you add to `helpers.ts` that inserts an empresa/cliente/local/producto graph + a `40_m_venta` + one `40_m_producto_venta` line and returns the idVenta. Model it on the fixtures already in `lambdas/ventas/tests/helpers.ts` (reuse its insert helpers; only add the venta + line inserts).

- [ ] **Step 3: Run test to verify it fails**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts
```
Expected: FAIL — `../service` has no `getVentaCreditable`.

- [ ] **Step 4: Implement search + getVentaCreditable + guard**

Create `lambdas/notas-credito/service.ts`:

```ts
import { and, eq, like, sql } from "drizzle-orm";
import {
  t10MUsuario, t10MCliente, t20MProducto, t40MVenta, t40MProductoVenta, t40MNotaCredito, type Db,
} from "@serfel/db";
import { TIPO_DOCTO_FACTURA_ELECTRONICA, type VentaCreditableDto, type NcLineaDto } from "@serfel/shared";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db.select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario).where(eq(t10MUsuario.idUsuario, idUsuario)).limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

async function montoYaCreditado(db: DbOrTx, idVenta: number): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${t40MNotaCredito.precioTotal}), 0)` })
    .from(t40MNotaCredito)
    .where(eq(t40MNotaCredito.idVenta, idVenta));
  return Number(rows[0]?.total ?? 0);
}

async function lineasDeVenta(db: DbOrTx, idVenta: number): Promise<NcLineaDto[]> {
  const rows = await db
    .select({
      idProducto: t40MProductoVenta.idProducto,
      codSerfel: t20MProducto.codSerfel,
      descripcion: t20MProducto.nomProducto,
      cantidad: t40MProductoVenta.cantidad,
      precio: t40MProductoVenta.precio,
      porcenDesc: t40MProductoVenta.porcenDesc,
      impuesto: t20MProducto.impuesto,
    })
    .from(t40MProductoVenta)
    .innerJoin(t20MProducto, eq(t40MProductoVenta.idProducto, t20MProducto.idProducto))
    .where(eq(t40MProductoVenta.idVenta, idVenta));
  return rows.map((r) => ({
    idProducto: r.idProducto, codSerfel: r.codSerfel, descripcion: r.descripcion,
    cantidad: Number(r.cantidad), precio: r.precio, porcenDesc: r.porcenDesc, impuesto: r.impuesto,
  }));
}

async function ventaHeader(db: DbOrTx, idVenta: number) {
  const rows = await db
    .select({
      idVenta: t40MVenta.idVenta, idFolio: t40MVenta.idFolio, numDoctoEmitido: t40MVenta.numDoctoEmitido,
      fechaVenta: t40MVenta.fechaVenta, rutEmpresa: t40MVenta.rutEmpresa, rutCliente: t40MVenta.rutCliente,
      precioTotal: t40MVenta.precioTotal, idTipoDoctoEmitido: t40MVenta.idTipoDoctoEmitido,
      nomCliente: t10MCliente.nomFantasia,
    })
    .from(t40MVenta)
    .innerJoin(t10MCliente, eq(t40MVenta.rutCliente, t10MCliente.rutCliente))
    .where(eq(t40MVenta.idVenta, idVenta))
    .limit(1);
  return rows[0] ?? null;
}

export async function getVentaCreditable(db: Db, idVenta: number): Promise<VentaCreditableDto | null> {
  const h = await ventaHeader(db, idVenta);
  if (!h || h.idTipoDoctoEmitido !== TIPO_DOCTO_FACTURA_ELECTRONICA) return null;
  const [lineas, creditado] = await Promise.all([lineasDeVenta(db, idVenta), montoYaCreditado(db, idVenta)]);
  return {
    idVenta: h.idVenta, idFolio: h.idFolio, numDoctoEmitido: h.numDoctoEmitido, fechaVenta: h.fechaVenta,
    rutEmpresa: h.rutEmpresa, rutCliente: h.rutCliente, nomCliente: h.nomCliente,
    precioTotal: h.precioTotal, montoYaCreditado: creditado, lineas,
  };
}

export async function searchVentasCreditables(db: Db, q: string): Promise<VentaCreditableDto[]> {
  const trimmed = q.trim();
  const rows = await db
    .select({ idVenta: t40MVenta.idVenta })
    .from(t40MVenta)
    .where(and(
      eq(t40MVenta.idTipoDoctoEmitido, TIPO_DOCTO_FACTURA_ELECTRONICA),
      like(sql`CAST(${t40MVenta.idFolio} AS CHAR)`, `%${trimmed}%`),
    ))
    .limit(50);
  const out: VentaCreditableDto[] = [];
  for (const r of rows) {
    const v = await getVentaCreditable(db, r.idVenta);
    if (v) out.push(v);
  }
  return out;
}
```

> If `t20MProducto` lacks `nomProducto`/`codSerfel`/`impuesto` under those exact names, open `packages/db/src/schema.ts` and use the actual property names — do not guess.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lambdas/notas-credito
git commit -m "feat(notas-credito): search ventas creditables + over-credit read"
```

---

### Task 7: Folio resolution from `40_m_folios_electronicos`

**Files:**
- Modify: `lambdas/notas-credito/service.ts`
- Test: `lambdas/notas-credito/tests/service.test.ts`

**Interfaces:**
- Consumes: `t40MFoliosElectronicos` (Task 1).
- Produces: `resolveNextFolio(tx, rutEmpresa) → Promise<number>` (throws `AppError("VALIDACION", 409, …)` when the range is exhausted or missing).

- [ ] **Step 1: Write failing tests**

Append to `lambdas/notas-credito/tests/service.test.ts`:

```ts
import { resolveNextFolio } from "../service";
import { seedFolioRange } from "./helpers";

describe("resolveNextFolio", () => {
  it("returns folio_desde when ult_folio is 0 and no NC used a folio yet", async () => {
    await seedFolioRange(db, { rutEmpresa: 8030856, idTipoDocto: 11, folioDesde: 500, folioHasta: 600, ultFolio: 0 });
    const folio = await db.transaction((tx) => resolveNextFolio(tx, 8030856));
    expect(folio).toBe(500);
  });

  it("returns ult_folio + 1 once folios have been processed", async () => {
    await seedFolioRange(db, { rutEmpresa: 8367020, idTipoDocto: 11, folioDesde: 1, folioHasta: 10, ultFolio: 4 });
    const folio = await db.transaction((tx) => resolveNextFolio(tx, 8367020));
    expect(folio).toBe(5);
  });

  it("throws when the range is exhausted", async () => {
    await seedFolioRange(db, { rutEmpresa: 76770842, idTipoDocto: 11, folioDesde: 1, folioHasta: 2, ultFolio: 2 });
    await expect(db.transaction((tx) => resolveNextFolio(tx, 76770842))).rejects.toThrow();
  });
});
```

Add `seedFolioRange` to `helpers.ts` (a single insert into `t40MFoliosElectronicos`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts -t resolveNextFolio`
Expected: FAIL — `resolveNextFolio` not exported.

- [ ] **Step 3: Implement folio resolution**

Add to `lambdas/notas-credito/service.ts` (import `t40MFoliosElectronicos` and `TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA`, `desc`, `gte`, `lte`, `AppError`):

```ts
export async function resolveNextFolio(tx: Tx, rutEmpresa: number): Promise<number> {
  const ranges = await tx
    .select()
    .from(t40MFoliosElectronicos)
    .where(and(
      eq(t40MFoliosElectronicos.rutEmpresa, rutEmpresa),
      eq(t40MFoliosElectronicos.idTipoDocto, TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA),
    ))
    .orderBy(desc(t40MFoliosElectronicos.id))
    .limit(1);
  if (ranges.length === 0) {
    throw new AppError("VALIDACION", 409, `No hay rango de folios de nota de crédito para la empresa ${rutEmpresa}`);
  }
  const r = ranges[0];

  // Highest folio already reserved by a pendiente/emitida NC within this range.
  const usados = await tx
    .select({ maxFolio: sql<number>`COALESCE(MAX(${t40MNotaCredito.idFolio}), 0)` })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .where(and(
      eq(t40MVenta.rutEmpresa, rutEmpresa),
      gte(t40MNotaCredito.idFolio, r.folioDesde),
      lte(t40MNotaCredito.idFolio, r.folioHasta),
    ));
  const maxUsado = Number(usados[0]?.maxFolio ?? 0);
  const next = Math.max(r.folioDesde, r.ultFolio + 1, maxUsado + 1);
  if (next > r.folioHasta) {
    throw new AppError("VALIDACION", 409, `Rango de folios agotado para la empresa ${rutEmpresa}`);
  }
  return next;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts -t resolveNextFolio`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lambdas/notas-credito/service.ts lambdas/notas-credito/tests
git commit -m "feat(notas-credito): resolveNextFolio from folios_electronicos"
```

---

### Task 8: Emit NC — insert, invoke emisor, mark electrónica, restitute stock

**Files:**
- Modify: `lambdas/notas-credito/service.ts`
- Test: `lambdas/notas-credito/tests/service.test.ts`

**Interfaces:**
- Consumes: `resolveNextFolio`, `getVentaCreditable`, `computeNcTotales`, `buildFlatFile`, `EmisorResult`.
- Produces: `emitirNotaCredito(db, invokeEmisor, input: EmitirNcInput, idUsuario) → Promise<EmitirNcResultDto>`.

- [ ] **Step 1: Write failing test (happy path + over-credit block + stock rule)**

Append to `lambdas/notas-credito/tests/service.test.ts`:

```ts
import { emitirNotaCredito } from "../service";
import { COD_REF_ANULA, COD_REF_CORRIGE_MONTOS } from "@serfel/shared";

const emisorOk = async () => ({ ok: true, folio: 500, urlPdfOriginal: "http://o", urlPdfCedible: "http://c" });

describe("emitirNotaCredito", () => {
  it("anula: inserts NC + prod rows, marks electrónica, restitutes stock, bumps ult_folio", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 123, precioTotal: 1190 });
    await seedFolioRange(db, { rutEmpresa: 8030856, idTipoDocto: 11, folioDesde: 500, folioHasta: 600, ultFolio: 0 });
    const venta = (await getVentaCreditable(db, idVenta))!;
    const before = await stockOf(db, venta.lineas[0].idProducto);

    const res = await emitirNotaCredito(db, emisorOk, {
      idVenta, idMotivo: 5, codRef: COD_REF_ANULA,
      lineas: venta.lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc })),
    }, 1);

    expect(res.esElectronica).toBe(true);
    expect(res.idFolio).toBe(500);
    expect(await stockOf(db, venta.lineas[0].idProducto)).toBe(before + venta.lineas[0].cantidad);
    expect(await ultFolioOf(db, 8030856)).toBe(500);
  });

  it("blocks a second NC once the venta is fully credited", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 200, precioTotal: 1190 });
    await seedNota(db, { idVenta, precioTotal: 1190 }); // already fully credited
    await seedFolioRange(db, { rutEmpresa: 8030856, idTipoDocto: 11, folioDesde: 700, folioHasta: 800, ultFolio: 0 });
    const venta = (await getVentaCreditable(db, idVenta))!;
    await expect(emitirNotaCredito(db, emisorOk, {
      idVenta, idMotivo: 5, codRef: COD_REF_ANULA,
      lineas: venta.lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc })),
    }, 1)).rejects.toThrow();
  });

  it("leaves a retryable pendiente NC (no stock change) when the emisor fails", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 300, precioTotal: 1190 });
    await seedFolioRange(db, { rutEmpresa: 8030856, idTipoDocto: 11, folioDesde: 900, folioHasta: 999, ultFolio: 0 });
    const venta = (await getVentaCreditable(db, idVenta))!;
    const before = await stockOf(db, venta.lineas[0].idProducto);
    const emisorFail = async () => ({ ok: false, error: "SII rechazó" });
    await expect(emitirNotaCredito(db, emisorFail, {
      idVenta, idMotivo: 5, codRef: COD_REF_CORRIGE_MONTOS,
      lineas: [{ idProducto: venta.lineas[0].idProducto, cantidad: venta.lineas[0].cantidad, precio: 1, porcenDesc: 0 }],
    }, 1)).rejects.toThrow();
    expect(await stockOf(db, venta.lineas[0].idProducto)).toBe(before); // unchanged
    expect(await ultFolioOf(db, 8030856)).toBe(0); // not bumped
  });
});
```

Add helpers `stockOf`, `ultFolioOf`, `seedNota` to `helpers.ts`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts -t emitirNotaCredito`
Expected: FAIL — `emitirNotaCredito` not exported.

- [ ] **Step 3: Implement emit**

Add to `lambdas/notas-credito/service.ts`. Flow: guard over-credit → compute totales → resolve folio → insert NC (pendiente) + prod rows in a txn (commit) → build flat file → invoke emisor → on success mark electrónica + bump ult_folio + restitute stock (only for lines whose credited quantity > 0 or codRef=anula) → on failure throw (NC stays pendiente).

```ts
import {
  t40MProdNotaCredito, t50MStock, t99PImpuesto, t10MEmpresa, t10MLocalCliente,
} from "@serfel/db";
import {
  computeNcTotales, buildFlatFile, EmitirNcInput, EmitirNcResultDto,
  COD_REF_ANULA, ESTADO_FINALIZADO, IMPUESTO_IVA, IMPUESTO_ESPEC, BODEGA_CENTRAL,
  TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
} from "@serfel/shared";
import type { EmisorEvent, EmisorResult } from "@serfel/facturacion-emisor";

const ESTADO_PENDIENTE = 2; // 99_p_estado: 2 = "En Proceso" (NC awaiting electronic emission)

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function emitirNotaCredito(
  db: Db,
  invokeEmisor: (e: EmisorEvent) => Promise<EmisorResult>,
  input: EmitirNcInput,
  idUsuario: number,
): Promise<EmitirNcResultDto> {
  const venta = await getVentaCreditable(db, input.idVenta);
  if (!venta) throw new AppError("VALIDACION", 400, "La venta no existe o no es Factura Electrónica");
  if (venta.montoYaCreditado >= venta.precioTotal) {
    throw new AppError("VALIDACION", 409, "La factura ya fue acreditada en su totalidad");
  }

  // Impuesto rates.
  const impuestos = await db.select({ id: t99PImpuesto.idImpuesto, valor: t99PImpuesto.valor }).from(t99PImpuesto);
  const rateMap = new Map(impuestos.map((i) => [i.id, i.valor]));
  const ivaValor = rateMap.get(IMPUESTO_IVA) ?? 0;
  const especValor = rateMap.get(IMPUESTO_ESPEC) ?? 0;
  const rateOf = (id: number) => rateMap.get(id) ?? null;

  // Attach each input line's impuesto from the venta lines.
  const impuestoByProd = new Map(venta.lineas.map((l) => [l.idProducto, l.impuesto]));
  const calcLines = input.lineas.map((l) => ({
    cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc,
    impuesto: impuestoByProd.get(l.idProducto) ?? 0,
  }));
  const totales = computeNcTotales(calcLines, { ivaValor, especValor, rateOf });

  // Insert pendiente NC + folio reservation (committed before the external call).
  const idFolio = await db.transaction((tx) => resolveNextFolio(tx, venta.rutEmpresa));
  const now = nowDateTime();
  const idNotaCredito = await db.transaction(async (tx) => {
    const [header] = await tx.insert(t40MNotaCredito).values({
      idVenta: venta.idVenta,
      numNotaCredito: idFolio,
      idTipoDoctoEmitido: TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
      rutEmpresa: venta.rutEmpresa,
      iva: totales.iva, iaba: totales.iaba, espec: totales.espec, subTotal: totales.subTotal,
      idMotivo: input.idMotivo, idUsuario, fechaNotaCredito: now, precioTotal: totales.precioTotal,
      idEstado: ESTADO_PENDIENTE, esNotaCredElectronica: 0,
      idUsuarioMod: idUsuario, ultFechaMod: now, idFolio,
    });
    const idNc = header.insertId;
    for (const l of input.lineas) {
      await tx.insert(t40MProdNotaCredito).values({
        idNotaCredito: idNc, idProducto: l.idProducto,
        cantidad: l.cantidad.toString(), precio: l.precio, porcenDesc: l.porcenDesc,
      });
    }
    return idNc;
  });

  // Build flat file and emit.
  const empresa = (await db.select().from(t10MEmpresa)
    .where(eq(t10MEmpresa.rutEmpresa, venta.rutEmpresa)).limit(1))[0];
  const rutReceptor = `${venta.rutCliente}`; // format with DV in the frontend/helper as needed
  const flat = buildFlatFile({
    folio: idFolio, fecha: now.slice(0, 10),
    rutReceptor, rsReceptor: venta.nomCliente, giroReceptor: "", dirReceptor: "", comReceptor: "", ciuReceptor: "", emailReceptor: "",
    totales,
    lineas: input.lineas.map((l) => {
      const bruto = Math.round(l.cantidad * l.precio);
      return {
        codigo: impuestoByProd.has(l.idProducto) ? venta.lineas.find((x) => x.idProducto === l.idProducto)!.codSerfel : String(l.idProducto),
        descripcion: venta.lineas.find((x) => x.idProducto === l.idProducto)?.descripcion ?? "",
        cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc,
        valor: bruto - Math.round((bruto * l.porcenDesc) / 100),
      };
    }),
    referencia: { folioRef: venta.idFolio, fchRef: venta.fechaVenta.slice(0, 10), codRef: input.codRef, razonRef: String(input.idMotivo) },
  });

  const emitResult = await invokeEmisor({
    op: "procesar",
    rutEmpresa: String(venta.rutEmpresa),
    flatFileBase64: Buffer.from(flat, "utf8").toString("base64"),
  });
  if (!emitResult.ok) {
    // NC stays pendiente (retryable). Surface the vendor error.
    throw new AppError("VALIDACION", 502, `facturación.cl rechazó la NC: ${emitResult.error ?? "desconocido"}`);
  }

  // Mark electrónica, bump ult_folio, restitute stock — all in one txn.
  await db.transaction(async (tx) => {
    await tx.update(t40MNotaCredito).set({
      esNotaCredElectronica: 1, idEstado: ESTADO_FINALIZADO,
      urlPdfOriginal: emitResult.urlPdfOriginal ?? "", urlPdfCedible: emitResult.urlPdfCedible ?? "",
      idUsuarioMod: idUsuario, ultFechaMod: nowDateTime(),
    }).where(eq(t40MNotaCredito.idNotaCredito, idNotaCredito));

    await tx.update(t40MFoliosElectronicos)
      .set({ ultFolio: idFolio })
      .where(and(
        eq(t40MFoliosElectronicos.rutEmpresa, venta.rutEmpresa),
        eq(t40MFoliosElectronicos.idTipoDocto, TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA),
        sql`${t40MFoliosElectronicos.ultFolio} < ${idFolio}`,
      ));

    // Stock restitution: only when quantity is credited (anula = all lines).
    for (const l of input.lineas) {
      if (input.codRef === COD_REF_ANULA || l.cantidad > 0) {
        await tx.update(t50MStock)
          .set({ cantidad: sql`${t50MStock.cantidad} + ${l.cantidad}` })
          .where(and(eq(t50MStock.idBodega, BODEGA_CENTRAL), eq(t50MStock.idProducto, l.idProducto)));
      }
    }
  });

  return {
    idNotaCredito, idFolio, esElectronica: true,
    urlPdfOriginal: emitResult.urlPdfOriginal ?? "", urlPdfCedible: emitResult.urlPdfCedible ?? "",
  };
}
```

> **Stock rule clarification for the reviewer:** every NC line carries a positive `cantidad`, so the `l.cantidad > 0` branch restitutes for quantity corrections. A *value-only* correction is modeled by the frontend sending the corrected `precio` with the **original** cantidad only when goods are returned; when only price changes and no goods move, the frontend sends `cantidad: 0` for that line (allowed by making the schema `nonnegative` for value-only mode — see Task 12 note). Confirm this matches the UX before shipping; if value-only lines must keep their cantidad for the DTE amount math, split the restitution flag out as an explicit `restituirStock: boolean` per line instead.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts -t emitirNotaCredito`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lambdas/notas-credito/service.ts lambdas/notas-credito/tests
git commit -m "feat(notas-credito): emitirNotaCredito with idempotent folio + stock rules"
```

---

### Task 9: List NCs + PDF-links endpoint + Hono app wiring

**Files:**
- Modify: `lambdas/notas-credito/service.ts`, create `lambdas/notas-credito/app.ts`, `lambdas/notas-credito/index.ts`
- Test: `lambdas/notas-credito/tests/{service.test.ts,app.test.ts}`

**Interfaces:**
- Produces: `listNotasCredito(db) → NotaCreditoListItemDto[]`; `getPdfLinks(db, invokeEmisor, idNotaCredito) → { urlPdfOriginal: string; urlPdfCedible: string }`; Hono app with routes `GET /api/notas-credito/ventas?q=`, `GET /api/notas-credito`, `POST /api/notas-credito`, `GET /api/notas-credito/{id}/pdf`.

- [ ] **Step 1: Write failing test for listNotasCredito**

Append to `service.test.ts`:

```ts
import { listNotasCredito } from "../service";

describe("listNotasCredito", () => {
  it("lists issued NCs with cliente name and electronic flag", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 400, precioTotal: 1190 });
    await seedNota(db, { idVenta, precioTotal: 1190, esElectronica: 1, idFolio: 501 });
    const list = await listNotasCredito(db);
    expect(list.some((n) => n.idFolio === 501 && n.esElectronica)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail, then implement listNotasCredito + getPdfLinks**

Run: `pnpm --filter @serfel/notas-credito exec vitest run tests/service.test.ts -t listNotasCredito` → FAIL.

Add to `service.ts`:

```ts
export async function listNotasCredito(db: Db): Promise<NotaCreditoListItemDto[]> {
  const rows = await db
    .select({
      idNotaCredito: t40MNotaCredito.idNotaCredito, idVenta: t40MNotaCredito.idVenta,
      idFolio: t40MNotaCredito.idFolio, numNotaCredito: t40MNotaCredito.numNotaCredito,
      fechaNotaCredito: t40MNotaCredito.fechaNotaCredito, precioTotal: t40MNotaCredito.precioTotal,
      esElectronica: t40MNotaCredito.esNotaCredElectronica,
      rutCliente: t40MVenta.rutCliente, nomCliente: t10MCliente.nomFantasia,
    })
    .from(t40MNotaCredito)
    .innerJoin(t40MVenta, eq(t40MNotaCredito.idVenta, t40MVenta.idVenta))
    .innerJoin(t10MCliente, eq(t40MVenta.rutCliente, t10MCliente.rutCliente))
    .orderBy(desc(t40MNotaCredito.idNotaCredito))
    .limit(200);
  return rows.map((r) => ({
    idNotaCredito: r.idNotaCredito, idVenta: r.idVenta, idFolio: r.idFolio, numNotaCredito: r.numNotaCredito,
    rutCliente: r.rutCliente, nomCliente: r.nomCliente, fechaNotaCredito: r.fechaNotaCredito,
    precioTotal: r.precioTotal, esElectronica: r.esElectronica === 1,
  }));
}

export async function getPdfLinks(
  db: Db, invokeEmisor: (e: EmisorEvent) => Promise<EmisorResult>, idNotaCredito: number,
): Promise<{ urlPdfOriginal: string; urlPdfCedible: string }> {
  const rows = await db
    .select({ idFolio: t40MNotaCredito.idFolio, rutEmpresa: t40MNotaCredito.rutEmpresa })
    .from(t40MNotaCredito).where(eq(t40MNotaCredito.idNotaCredito, idNotaCredito)).limit(1);
  if (rows.length === 0) throw new AppError("VALIDACION", 404, "Nota de crédito no encontrada");
  const { idFolio, rutEmpresa } = rows[0];
  const [orig, ced] = await Promise.all([
    invokeEmisor({ op: "obtenerlink", rutEmpresa: String(rutEmpresa), folio: idFolio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: false }),
    invokeEmisor({ op: "obtenerlink", rutEmpresa: String(rutEmpresa), folio: idFolio, tipoDte: DTE_NOTA_CREDITO_ELECTRONICA, cedible: true }),
  ]);
  return { urlPdfOriginal: orig.url ?? "", urlPdfCedible: ced.url ?? "" };
}
```

(Import `DTE_NOTA_CREDITO_ELECTRONICA` from `@serfel/shared`.) Run the test again → PASS.

- [ ] **Step 3: Create the Hono app**

Create `lambdas/notas-credito/app.ts`, modeled on `lambdas/ventas/app.ts`:

```ts
import { Hono, type Context } from "hono";
import { EmitirNcInputSchema, type ApiErrorBody } from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { searchVentasCreditables, listNotasCredito, emitirNotaCredito, getPdfLinks } from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json(errorBody(err.code, err.message), err.status);
    if (isDbUnreachable(err)) return c.json(errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible."), 503);
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) throw new AppError("NO_AUTORIZADO", 403, "Usuario sin mapeo interno");
    c.set("idUsuario", idUsuario);
    await next();
  });

  const gate = requireModule("notas_credito", deps);
  app.use("/notas-credito", gate);
  app.use("/notas-credito/*", gate);

  app.get("/notas-credito/ventas", async (c) =>
    c.json(await searchVentasCreditables(await deps.getDb(), c.req.query("q") ?? "")));
  app.get("/notas-credito", async (c) => c.json(await listNotasCredito(await deps.getDb())));
  app.post("/notas-credito", async (c) => {
    const raw = await c.req.json().catch(() => { throw new AppError("VALIDACION", 400, "JSON inválido"); });
    const parsed = EmitirNcInputSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new AppError("VALIDACION", 400, detail);
    }
    return c.json(await emitirNotaCredito(await deps.getDb(), deps.invokeEmisor, parsed.data, c.get("idUsuario")));
  });
  app.get("/notas-credito/:id/pdf", async (c) =>
    c.json(await getPdfLinks(await deps.getDb(), deps.invokeEmisor, Number(c.req.param("id")))));

  return app;
}
```

- [ ] **Step 4: Create index.ts with the Lambda-SDK emisor invoker**

Create `lambdas/notas-credito/index.ts`, copying the DB bootstrap from `lambdas/ventas/index.ts` and adding the emisor invoke:

```ts
import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import type { EmisorEvent, EmisorResult } from "@serfel/facturacion-emisor";
import { createApp } from "./app";

const sm = new SecretsManagerClient({});
const lambda = new LambdaClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  if (!secret.SecretString) throw new Error("DB secret has no SecretString");
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, { ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") } }).db;
  return cachedDb;
}

async function invokeEmisor(event: EmisorEvent): Promise<EmisorResult> {
  const out = await lambda.send(new InvokeCommand({
    FunctionName: process.env.EMISOR_FN_ARN,
    Payload: Buffer.from(JSON.stringify(event)),
  }));
  if (!out.Payload) return { ok: false, error: "emisor sin respuesta" };
  return JSON.parse(Buffer.from(out.Payload).toString("utf8")) as EmisorResult;
}

interface JwtEnv { event?: { requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } } }; }

const app = createApp({
  getDb, invokeEmisor,
  getIdUsuario: (c) => {
    const claims = (c.env as JwtEnv).event?.requestContext?.authorizer?.jwt?.claims;
    const parsed = Number(claims?.["custom:id_usuario"]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
});

export const handler = handle(app);
```

- [ ] **Step 5: Write an app-level test (auth gate + emit happy path with mocked deps)**

Create `lambdas/notas-credito/tests/app.test.ts`, modeled on `lambdas/ventas/tests/app.test.ts` — build the app with a fake `getDb` (or the test DB), a fake `getIdUsuario` returning 1, and a stub `invokeEmisor` returning `{ ok: true, folio: 500, urlPdfOriginal: "o", urlPdfCedible: "c" }`; assert `GET /api/notas-credito` returns 200 and `POST /api/notas-credito` with an invalid body returns 400.

- [ ] **Step 6: Run the whole lambda suite + typecheck**

Run: `pnpm --filter @serfel/notas-credito test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lambdas/notas-credito
git commit -m "feat(notas-credito): list, pdf links, Hono app + handler"
```

---

### Task 10: Register the `notas_credito` module (authz + fixtures + nav + route)

**Files:**
- Modify: `packages/shared/src/authz.ts`, `apps/frontend/src/app/core/nav.ts`, `apps/frontend/src/app/app.routes.ts`
- Modify fixtures: `lambdas/products/tests/app.test.ts`, `lambdas/products/tests/service.test.ts`, `apps/frontend/src/app/core/nav.spec.ts`

**Interfaces:**
- Produces: `MODULE_ROLES.notas_credito = [1]`; nav leaf `{ module: "notas_credito", label: "Notas de Crédito", path: "/notas-credito" }`.

- [ ] **Step 1: Add the module to MODULE_ROLES**

In `packages/shared/src/authz.ts`, add inside `MODULE_ROLES`:

```ts
  notas_credito: [1], // 1 = Administrador
```

- [ ] **Step 2: Run the fixture tests to watch them fail**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/products/tests/service.test.ts -t modulos` (and the app test).
Expected: FAIL — the `getMe` modulos array now includes `notas_credito`, mismatching the hardcoded fixtures.

- [ ] **Step 3: Update the two products fixtures**

In `lambdas/products/tests/app.test.ts:140` and `lambdas/products/tests/service.test.ts:233`, add `"notas_credito"` to the expected modulos arrays:

```ts
      modulos: ["productos", "rutas", "usuarios", "ventas", "clientes", "marcas", "precios", "notas_credito"],
```

- [ ] **Step 4: Add the nav leaf**

In `apps/frontend/src/app/core/nav.ts`, add to the `"Ventas"` group's section children (after the Prefacturación leaf):

```ts
          { module: "notas_credito", label: "Notas de Crédito", path: "/notas-credito", icon: DOC_ICON },
```

- [ ] **Step 5: Update nav.spec fixtures**

In `apps/frontend/src/app/core/nav.spec.ts`: add `"notas_credito"` to the `ALL` array, and add `notas_credito: "/notas-credito"` to the `paths` expectation object in the "pins each leaf to its exact mandated route" test.

- [ ] **Step 6: Add the route**

In `apps/frontend/src/app/app.routes.ts`, import `NotasCreditoPageComponent` (created in Task 12) and add — for now, add a placeholder import comment and the route pointing at the component to be created; if executing Task 12 later, this compiles once the component exists. Add:

```ts
  { path: 'notas-credito', component: NotasCreditoPageComponent, canActivate: [moduleGuard('notas_credito')] },
```

> If Task 12 is not yet done, temporarily point the route at any existing page component to keep the build green, then switch it in Task 12. Prefer ordering Task 12 before this step's route line.

- [ ] **Step 7: Run all affected suites**

Run:
```bash
pnpm --filter @serfel/shared test
pnpm --filter @serfel/lambdas exec vitest run lambdas/products/tests
pnpm --filter @serfel/frontend exec vitest run src/app/core/nav.spec.ts
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/authz.ts apps/frontend/src/app/core/nav.ts apps/frontend/src/app/core/nav.spec.ts apps/frontend/src/app/app.routes.ts lambdas/products/tests
git commit -m "feat(authz): register notas_credito module + nav + fixtures"
```

---

### Task 11: Infra — VPC lambda, non-VPC emisor, routes, IAM, secret

**Files:**
- Modify: `infra/api.ts`

**Interfaces:**
- Consumes: `dbSecretArn`, `privateSubnetIds`, `sgLambdaId`, `stackTags`.
- Produces: `NotasCreditoFn` (VPC) + `FacturacionEmisorFn` (non-VPC) + their routes.

- [ ] **Step 1: Add the non-VPC emisor function**

In `infra/api.ts`, after `preciosFn`, add. Note: **no `vpc` block** (needs internet). `FACT_SECRET_ARN` points at a Secrets Manager secret created out-of-band (see Step 4).

```ts
const facturacionEmisorFn = new sst.aws.Function("FacturacionEmisorFn", {
  handler: "lambdas/facturacion-emisor/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "30 seconds",
  memory: "256 MB",
  environment: {
    FACT_SECRET_ARN: process.env.FACT_SECRET_ARN ?? "",
    FACT_BASE_URL: "https://www.facturacion.cl",
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [process.env.FACT_SECRET_ARN ?? "*"] },
  ],
  transform: {
    function: { name: `serfel-${$app.stage}-facturacion-emisor`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```

- [ ] **Step 2: Add the VPC notas-credito function**

After the emisor function:

```ts
const notasCreditoFn = new sst.aws.Function("NotasCreditoFn", {
  handler: "lambdas/notas-credito/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "30 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: {
    DB_SECRET_ARN: dbSecretArn,
    EMISOR_FN_ARN: facturacionEmisorFn.arn,
  },
  permissions: [
    { actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] },
    { actions: ["lambda:InvokeFunction"], resources: [facturacionEmisorFn.arn] },
  ],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-notas-credito`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```

- [ ] **Step 3: Register the routes**

After the `preciosRoutes` loop:

```ts
const notasCreditoRoutes = [
  "GET /api/notas-credito/ventas",
  "GET /api/notas-credito",
  "POST /api/notas-credito",
  "GET /api/notas-credito/{id}/pdf",
] as const;
for (const route of notasCreditoRoutes) {
  api.route(route, notasCreditoFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}
```

- [ ] **Step 4: Provision the facturación.cl secret (operator, out-of-band)**

This is a secret task — **load the `aws-secrets-manager` skill first** and follow it. Create one secret whose JSON is keyed by empresa rut, e.g. `serfel/<stage>/facturacion-cl`, with shape:

```json
{ "8030856-6": { "usuario": "…", "rut": "8030856-6", "clave": "…" },
  "8367020-7": { "usuario": "…", "rut": "8367020-7", "clave": "…" },
  "76770842-4": { "usuario": "…", "rut": "76770842-4", "clave": "…" } }
```

Use the **rotated** credentials (see the separate rotation follow-up), never the plaintext ones from `legacy-php`. Export its ARN as `FACT_SECRET_ARN` in the deploy environment so Step 1 wires it. Do not commit the ARN or values.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. (Full `sst deploy` is done at release time with `AWS_PROFILE=admin-christian` + Node 22 per project deploy notes — not part of this task's gate.)

- [ ] **Step 6: Commit**

```bash
git add infra/api.ts
git commit -m "feat(infra): notas-credito VPC lambda + non-VPC emisor + routes"
```

---

### Task 12: Frontend — search/compose/emit page + listing

**Files:**
- Create: `apps/frontend/src/app/features/notas-credito/{notas-credito-api.service.ts,notas-credito-logic.ts,notas-credito-logic.spec.ts,notas-credito-store.ts,notas-credito-page.component.ts}`

**Interfaces:**
- Consumes: `@serfel/shared` DTOs/schema; API routes from Task 9.
- Produces: `NotasCreditoPageComponent` (used by the route in Task 10); pure `previewTotales(lineas, opts)` re-using `computeNcTotales`.

- [ ] **Step 1: Write failing test for the pure preview logic**

Create `apps/frontend/src/app/features/notas-credito/notas-credito-logic.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { anularLineas, previewTotal } from "./notas-credito-logic";
import type { VentaCreditableDto } from "@serfel/shared";

const venta: VentaCreditableDto = {
  idVenta: 1, idFolio: 10, numDoctoEmitido: 10, fechaVenta: "2026-08-01 00:00:00",
  rutEmpresa: 8030856, rutCliente: 76, nomCliente: "C", precioTotal: 1190, montoYaCreditado: 0,
  lineas: [{ idProducto: 2, codSerfel: "P2", descripcion: "d", cantidad: 2, precio: 500, porcenDesc: 0, impuesto: 3 }],
};

describe("notas-credito-logic", () => {
  it("anularLineas mirrors every venta line at full quantity", () => {
    const lines = anularLineas(venta);
    expect(lines).toEqual([{ idProducto: 2, cantidad: 2, precio: 500, porcenDesc: 0 }]);
  });

  it("previewTotal applies IVA to the selected lines", () => {
    expect(previewTotal(anularLineas(venta), venta, 19)).toBe(1190);
  });
});
```

- [ ] **Step 2: Run to verify fail, then implement the logic**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/notas-credito/notas-credito-logic.spec.ts` → FAIL.

Create `apps/frontend/src/app/features/notas-credito/notas-credito-logic.ts`:

```ts
import { computeNcTotales, type VentaCreditableDto, type NcLineaInput } from "@serfel/shared";

export function anularLineas(venta: VentaCreditableDto): NcLineaInput[] {
  return venta.lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc }));
}

export function previewTotal(lineas: NcLineaInput[], venta: VentaCreditableDto, ivaValor: number): number {
  const impuestoByProd = new Map(venta.lineas.map((l) => [l.idProducto, l.impuesto]));
  const calc = lineas.map((l) => ({ ...l, impuesto: impuestoByProd.get(l.idProducto) ?? 0 }));
  return computeNcTotales(calc, { ivaValor, especValor: 0, rateOf: () => null }).precioTotal;
}
```

Run the test again → PASS.

- [ ] **Step 3: Create the API service**

Create `apps/frontend/src/app/features/notas-credito/notas-credito-api.service.ts`, modeled on `marcas-api.service.ts`:

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { VentaCreditableDto, NotaCreditoListItemDto, EmitirNcInput, EmitirNcResultDto } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class NotasCreditoApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  buscarVentas(q: string) {
    return this.http.get<VentaCreditableDto[]>(`${this.base}/notas-credito/ventas`, { params: { q } });
  }
  list() {
    return this.http.get<NotaCreditoListItemDto[]>(`${this.base}/notas-credito`);
  }
  emitir(input: EmitirNcInput) {
    return this.http.post<EmitirNcResultDto>(`${this.base}/notas-credito`, input);
  }
  pdfLinks(id: number) {
    return this.http.get<{ urlPdfOriginal: string; urlPdfCedible: string }>(`${this.base}/notas-credito/${id}/pdf`);
  }
}
```

- [ ] **Step 4: Create the store + page component**

Create `notas-credito-store.ts` (signal store, following `marcas-store.ts`) and `notas-credito-page.component.ts` (standalone component). The page has: a search box → results list; select a venta → a table of its lines with editable cantidad/precio and an "Anular factura completa" button (fills lines via `anularLineas`); a live total via `previewTotal`; an "Emitir Nota de Crédito" button calling `NotasCreditoApi.emitir`; and below, a listing (`NotasCreditoApi.list`) with a **PDF** button per row calling `pdfLinks(id)` and opening `urlPdfOriginal`/`urlPdfCedible` via `window.open(url, "_blank")`. Follow the SCSS/signals conventions in `marcas-page.component.ts`. Fully-credited ventas (`montoYaCreditado >= precioTotal`) render the emit button disabled with a "Factura ya acreditada" note.

- [ ] **Step 5: Point the route at the real component**

Ensure `apps/frontend/src/app/app.routes.ts` imports `NotasCreditoPageComponent` from this feature and the `notas-credito` route (added in Task 10) uses it.

- [ ] **Step 6: Build + test the frontend**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/notas-credito && pnpm --filter @serfel/frontend build`
Expected: PASS + successful build.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/features/notas-credito apps/frontend/src/app/app.routes.ts
git commit -m "feat(frontend): notas de crédito page + listing + PDF links"
```

---

### Task 13: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full workspace typecheck + tests**

Run:
```bash
docker compose -f packages/db/docker-compose.yml up -d --wait
pnpm typecheck && pnpm -r test
```
Expected: PASS across shared, db, lambdas (notas-credito + products fixtures), frontend.

- [ ] **Step 2: Drive the real flow (per the `verify` skill)**

Deploy to dev (`AWS_PROFILE=admin-christian`, Node 22, `./scripts/sst-deploy.sh --stage dev`), seed one `40_m_folios_electronicos` row for a test empresa (`id_tipo_docto = 11`), then in the app: search a tipo=9 venta, issue a corrige-montos NC and an anular NC, confirm rows land in `40_m_nota_credito` + `40_m_prod_nota_credito`, `40_m_venta` is untouched, stock moved only where quantity was credited, `ult_folio` advanced, and the listing's PDF button opens the facturación.cl documents. Use the facturación.cl **test** account first.

- [ ] **Step 3: Commit any fixes, then finish the branch**

Use `superpowers:finishing-a-development-branch` to open the PR.

---

## Self-Review

**Spec coverage:**
- Search tipo=9 ventas read-only → Task 6. ✓
- Over-credit hard block → Task 8 (guard) + Task 12 (disabled button). ✓
- Anular total (CodRef 1) + corrige montos (CodRef 3) → Tasks 2/4/8/12. ✓
- Flat file formato=1 → Task 4 + Task 5 (send). ✓
- Split non-VPC emisor, no NAT → Tasks 5/9/11. ✓
- Insert pendiente → emit → mark electrónica / retryable draft → Task 8. ✓
- Folio from `40_m_folios_electronicos` via `ult_folio` + reserved-max → Tasks 1/7/8. ✓
- Stock only on quantity/anular → Task 8. ✓
- NC listing + PDF links button (new tab) → Tasks 9/12. ✓
- Secrets Manager by rut + rotation → Task 5/11 + separate follow-up. ✓
- `id_nota_credito` AUTO_INCREMENT → Task 1. ✓
- Module registration + fixture ripple → Task 10. ✓
- infra route registration → Task 11. ✓

**Placeholder scan:** the Task 12 page-component step (Step 4) describes UI without full code — this is intentional and acceptable per repo convention (components are hand-built against SCSS/signals patterns; only pure logic is unit-tested). All backend/logic steps carry real code.

**Type consistency:** `EmitirNcInput`, `VentaCreditableDto`, `NcLineaInput`, `NcTotales`, `EmisorEvent`/`EmisorResult`, `AppDeps` are defined once and referenced with matching shapes across tasks. `computeNcTotales`/`buildFlatFile` signatures match their call sites in Task 8.

**Open items flagged for execution (not blockers):**
- Exact flat-file column layout must be validated against the live facturación.cl `archivoplano` spec (Task 4 caveat).
- `ESTADO_PENDIENTE` = 2 ("En Proceso" in the `99_p_estado` seed); a successful emit flips it to `ESTADO_FINALIZADO` = 3.
- The value-only vs quantity stock semantics (Task 8 caveat) — confirm the UX contract; may become an explicit per-line `restituirStock` flag.
