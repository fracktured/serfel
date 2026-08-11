# Prefacturación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the legacy Angular 14 `prefacturacion` feature to the new stack as a `ventas` vertical slice: a batch endpoint that pre-invoices many pedidos in one request (each in its own transaction), plus an Angular page with multi-select and per-row result feedback.

**Architecture:** New `ventas` Hono Lambda (`lambdas/ventas/`) exposing `GET /api/prefacturacion/pendientes`, `GET /api/prefacturacion/empresas`, and `POST /api/prefacturacion`. Shared Zod contract in `@serfel/shared`. Drizzle against existing tables (no migration). Angular feature under `apps/frontend/src/app/features/prefacturacion/` following the `productos` signal-store pattern.

**Tech Stack:** TypeScript, Hono, Drizzle ORM (mysql2), Zod, Angular 20 (standalone + signals), Vitest.

## Global Constraints

- Node >= 22; ARM64 Lambda; `connectionLimit: 1` DB pool created outside the handler.
- Auth identity from `custom:id_usuario` on the Cognito **ID token**.
- Never hand-assign AUTO_INCREMENT PKs; read `ResultSetHeader.insertId`.
- One Zod schema shared by Lambda and Angular form — never duplicate DTOs.
- Lambdas live in the single `@serfel/lambdas` workspace; `ventas/` is a new subdir (no per-lambda `package.json`/`tsconfig`).
- Lambda/DB tests require local MariaDB: `docker compose -f packages/db/docker-compose.yml up -d --wait` (root creds `127.0.0.1:3307 root/serfel`).
- Do not use em dashes in AWS resource names/descriptions.
- Business rules ported verbatim from `lambdas/node-app-1/src/services/venta.service.ts`. Legacy numeric enums: `EstadoEnum` ACTIVO=1, FINALIZADO=3, ANULADO=4; `ImpuestoEnum` ESPEC=2, IVA=3; `BodegaEnum.CENTRAL=1`; `TipoDoctoEnum.FACTURA=1`.
- Money math mirrors legacy exactly: `subTotal = round(cantidad*precioNeto)`, `subTotalConDesc = subTotal - round(subTotal*porcenDesc/100)`, `iva = round(montoNetoTotal * ivaValor/100)`, per-line ESPEC/ILA `= round(subTotalConDesc * valor/100)`.

---

## File Structure

**Shared (`packages/shared/src/`)**
- Create `ventas.ts` — constants, Zod schemas, DTO types for the slice.
- Create `ventas.spec.ts` — schema unit tests.
- Modify `index.ts` — `export * from "./ventas"`.
- Modify `authz.ts` — add `ventas: [1]` to `MODULE_ROLES`.

**Lambda (`lambdas/ventas/`)**
- Create `errors.ts`, `types.ts`, `authz.ts` — copies of the `products` equivalents.
- Create `service.ts` — `getUserTipo`, `listPendientes`, `listEmpresas`, `prefacturarBatch` + private helpers.
- Create `app.ts` — Hono router mounted at `/api`.
- Create `index.ts` — handler wiring (cached DB pool + JWT claim extraction).
- Create `tests/helpers.ts` — `setupTestDb` seeding pedidos/stock/impuestos.
- Create `tests/service.test.ts`, `tests/app.test.ts`.

**Infra (`infra/`)**
- Modify `api.ts` — `VentasFn` + 3 routes.

**Frontend (`apps/frontend/src/app/`)**
- Create `features/prefacturacion/prefacturacion-api.service.ts`.
- Create `features/prefacturacion/prefacturacion-logic.ts` + `.spec.ts`.
- Create `features/prefacturacion/prefacturacion-store.ts`.
- Create `features/prefacturacion/prefacturacion-page.component.ts`.
- Modify `app.routes.ts`, `core/nav.ts`.

---

## Task 1: Shared contract (`@serfel/shared`)

**Files:**
- Create: `packages/shared/src/ventas.ts`
- Create: `packages/shared/src/ventas.spec.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/authz.ts`

**Interfaces:**
- Consumes: `ESTADO_ACTIVO` from `./productos`.
- Produces: `PrefacturaBatchInputSchema`, `PrefacturaBatchInput`, `PrefacturaResultItem`, `PrefacturaBatchResult`, `PedidoPendienteDto`, `EmpresaDto`, and constants `ESTADO_FINALIZADO`, `ESTADO_ANULADO`, `IMPUESTO_ESPEC`, `IMPUESTO_IVA`, `BODEGA_CENTRAL`, `TIPO_DOCTO_FACTURA`.

- [ ] **Step 1: Write the failing schema test**

Create `packages/shared/src/ventas.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PrefacturaBatchInputSchema } from "./ventas";

describe("PrefacturaBatchInputSchema", () => {
  it("accepts a valid batch", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [1, 2, 3] });
    expect(r.success).toBe(true);
  });
  it("rejects an empty idPedidos array", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [] });
    expect(r.success).toBe(false);
  });
  it("rejects duplicate idPedidos", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [1, 1] });
    expect(r.success).toBe(false);
  });
  it("rejects non-positive ids", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 76000000, idPedidos: [0] });
    expect(r.success).toBe(false);
  });
  it("rejects a non-positive rutEmpresa", () => {
    const r = PrefacturaBatchInputSchema.safeParse({ rutEmpresa: 0, idPedidos: [1] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/shared exec vitest run src/ventas.spec.ts`
Expected: FAIL — cannot resolve `./ventas`.

- [ ] **Step 3: Create the shared module**

Create `packages/shared/src/ventas.ts`:

```ts
import { z } from "zod";

/** Legacy numeric enums (99_p_estado, 99_p_impuesto, bodega, tipo docto). */
export const ESTADO_FINALIZADO = 3;
export const ESTADO_ANULADO = 4;
export const IMPUESTO_ESPEC = 2;
export const IMPUESTO_IVA = 3;
export const BODEGA_CENTRAL = 1;
export const TIPO_DOCTO_FACTURA = 1;

export const PrefacturaBatchInputSchema = z.object({
  rutEmpresa: z.number().int().positive(),
  idPedidos: z
    .array(z.number().int().positive())
    .nonempty()
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "idPedidos no debe contener duplicados",
    }),
});
export type PrefacturaBatchInput = z.infer<typeof PrefacturaBatchInputSchema>;

export interface PrefacturaResultItem {
  idPedido: number;
  status: "facturado" | "error";
  idVenta?: number;
  mensajes: string[]; // stock-adjustment / skipped-line warnings
  error?: string; // reason when status === "error"
}

export interface PrefacturaBatchResult {
  resultados: PrefacturaResultItem[];
  facturados: number;
  errores: number;
}

export interface PedidoPendienteDto {
  idPedido: number;
  fecha: string; // ISO datetime string
  rutCliente: number;
  dvCliente: string;
  nomFantasia: string;
  nomLocal: string;
  contacto: string; // full contact name
  vendedor: string; // full vendedor name
  precioTotal: number;
}

export interface EmpresaDto {
  rutEmpresa: number;
  dv: string;
  razonSocial: string;
}
```

- [ ] **Step 4: Wire the barrel export**

In `packages/shared/src/index.ts` add a line after the existing exports:

```ts
export * from "./ventas";
```

- [ ] **Step 5: Add the authz module**

In `packages/shared/src/authz.ts`, add `ventas` to `MODULE_ROLES`:

```ts
export const MODULE_ROLES = {
  productos: [1], // 1 = Administrador
  rutas: [1], // 1 = Administrador
  usuarios: [1], // 1 = Administrador
  ventas: [1], // 1 = Administrador
} as const;
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter @serfel/shared exec vitest run src/ventas.spec.ts && pnpm typecheck`
Expected: PASS. (Typecheck will now flag `NAV_ITEMS` as missing the `ventas` key — that is fixed in Task 8; if running this task in isolation, expect that single error and proceed.)

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/ventas.ts packages/shared/src/ventas.spec.ts packages/shared/src/index.ts packages/shared/src/authz.ts
git commit -m "feat(shared): prefacturacion batch contract + ventas module"
```

---

## Task 2: Ventas Lambda scaffolding (errors/types/authz)

**Files:**
- Create: `lambdas/ventas/errors.ts`
- Create: `lambdas/ventas/types.ts`
- Create: `lambdas/ventas/authz.ts`

**Interfaces:**
- Consumes: `getUserTipo` from `./service` (defined in Task 4 — this file only imports the name).
- Produces: `AppError`, `isDbUnreachable`, `AppDeps`, `AppEnv`, `requireModule`.

- [ ] **Step 1: Create `errors.ts`** (identical to `lambdas/products/errors.ts`)

```ts
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiErrorCode } from "@serfel/shared";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: ContentfulStatusCode,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** mysql2 network-level failures — the dev DB is stopped or unreachable. */
export function isDbUnreachable(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return (
    typeof code === "string" &&
    ["ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST"].includes(code)
  );
}
```

- [ ] **Step 2: Create `types.ts`** (identical to `lambdas/products/types.ts`)

```ts
import type { Context } from "hono";
import type { Db } from "@serfel/db";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
}

export type AppEnv = {
  Variables: { idUsuario: number; idTipoUsuario: number };
};
```

- [ ] **Step 3: Create `authz.ts`** (mirrors `lambdas/products/authz.ts`)

```ts
import { createMiddleware } from "hono/factory";
import { tipoCanAccess, type ModuleName } from "@serfel/shared";
import { AppError } from "./errors";
import { getUserTipo } from "./service";
import type { AppDeps, AppEnv } from "./types";

/**
 * Authorization gate for a module. Assumes an earlier middleware has already
 * set `idUsuario` on the context. Loads the user's id_tipo_usuario and checks it.
 */
export function requireModule(module: ModuleName, deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const idUsuario = c.get("idUsuario");
    const tipo = await getUserTipo(await deps.getDb(), idUsuario);
    if (tipo === null) {
      throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no existe en el sistema");
    }
    if (!tipoCanAccess(module, tipo)) {
      throw new AppError("PROHIBIDO", 403, "No tienes acceso a este módulo");
    }
    c.set("idTipoUsuario", tipo);
    await next();
  });
}
```

- [ ] **Step 4: Commit** (typecheck deferred — `./service` doesn't exist until Task 4)

```bash
git add lambdas/ventas/errors.ts lambdas/ventas/types.ts lambdas/ventas/authz.ts
git commit -m "feat(ventas): lambda scaffolding (errors, types, authz)"
```

---

## Task 3: Test harness — `tests/helpers.ts`

**Files:**
- Create: `lambdas/ventas/tests/helpers.ts`

**Interfaces:**
- Produces: `setupTestDb(dbName): Promise<{ db, pool, teardown }>` and `SEED` constants used by Tasks 4-6 tests. Seeds: estados (0,1,3,4), tipos usuario (admin=1, vendedor=2), usuarios (admin=1, vendedor=2), lista precio 1, tipo docto FACTURA=1, impuestos (ESPEC id=2 valor=13, IVA id=3 valor=19, ILA id=27 valor=18), empresa (rutEmpresa=76000000 — used as target AND acts as the internal-company rut), a normal cliente (55000000), an internal cliente whose rut equals an empresa rut, locales, productos (agua normal, leche porcionado, jugo ILA), stock rows (central bodega), pedidos (activo x3, ya-finalizado, con-porciones), producto_pedido rows.

- [ ] **Step 1: Create the helper**

Create `lambdas/ventas/tests/helpers.ts`:

```ts
import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb,
  migrateSchemaOnly,
  type Db,
  t99PEstado,
  t99PImpuesto,
  t10PTipoUsuario,
  t10MUsuario,
  t40MListaPrecio,
  t10PTipoDocto,
  t10MEmpresa,
  t10MCliente,
  t10MLocalCliente,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t20MProducto,
  t50PTipoBodega,
  t50MBodega,
  t50MStock,
  t30MPedido,
  t30MProductoPedido,
  t40MVenta,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));
const NOW = "2026-01-01 00:00:00";

export const SEED = {
  usuarioAdmin: 1,
  usuarioVendedor: 2,
  tipoAdmin: 1,
  tipoVendedor: 2,
  empresaTarget: 76000000, // target rutEmpresa for facturación
  empresaInterna: 76999999, // an empresa whose rut is also used as a cliente rut
  cliente: 55000000, // normal external cliente
  clienteInterno: 76999999, // internal cliente (rut present in empresa table)
  bodegaCentral: 1,
  marca: 1,
  tipoBebidas: 1,
  um: 1,
  impEspec: 2, // ESPEC
  impIva: 3, // IVA
  impIla: 27, // ILA (bebidas)
  prodAgua: 1, // impuesto 0, stock 100
  prodJugo: 2, // impuesto 27 (ILA), stock 5
  prodEspec: 3, // impuesto 2 (ESPEC), stock 100
  prodLeche: 4, // usaPorciones=1
  prodSinStock: 5, // no stock row
  localNorte: 500, // cliente normal
  localInterno: 501, // clienteInterno
  pedidoNormal: 10, // agua+jugo, activo
  pedidoEspec: 11, // prodEspec, activo
  pedidoInterno: 12, // agua, clienteInterno, activo
  pedidoPorciones: 13, // leche, activo -> should error
  pedidoYaVendido: 14, // activo but has a non-anulada venta
  pedidoSinStock: 15, // prodSinStock only, activo -> venta with 0 lines
  pedidoClamp: 16, // jugo qty 20 vs stock 5 -> clamp warning
  ESTADO_ACTIVO: 1,
  ESTADO_FINALIZADO: 3,
  ESTADO_ANULADO: 4,
} as const;

export async function setupTestDb(
  dbName: string
): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false }
  );
  await migrateSchemaOnly(db, MIGRATIONS);

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
    { idEstado: 3, nomEstado: "Finalizado", descEstado: "Finalizado" },
    { idEstado: 4, nomEstado: "Anulado", descEstado: "Anulado" },
  ]);
  await db.insert(t99PImpuesto).values([
    { idImpuesto: SEED.impEspec, nomImpuesto: "ESPEC", valor: 13 },
    { idImpuesto: SEED.impIva, nomImpuesto: "IVA", valor: 19 },
    { idImpuesto: SEED.impIla, nomImpuesto: "ILA", valor: 18 },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    { idUsuario: SEED.usuarioAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin", apellPatUsuario: "Perez", apellMatUsuario: "Soto", password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idUsuario: SEED.usuarioVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vera", apellPatUsuario: "Diaz", apellMatUsuario: "Rojas", password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t40MListaPrecio).values({ idListaPrecio: 1, nomListaPrecio: "GENERAL", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t10PTipoDocto).values({ idTipoDocto: 1, nomTipoDocto: "FACTURA", descTipoDocto: "Factura" });

  const empresa = (rutEmpresa: number, razon: string) => ({
    rutEmpresa, dvEmpresa: "0", razonSocial: razon, nomFantasia: razon, direccionEmpresa: "-",
    idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, giro: "-", codActividadEconomica: 1,
    comuna: "-", ciudad: "-", rutRepresentanteLegal: 1, dvRepresentanteLegal: "0", fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });
  await db.insert(t10MEmpresa).values([empresa(SEED.empresaTarget, "SERFEL"), empresa(SEED.empresaInterna, "INTERNA")]);

  await db.insert(t10MCliente).values([
    { rutCliente: SEED.cliente, dvCliente: "0", razonSocial: "CLIENTE", nomFantasia: "Fantasia Norte", idListaPrecio: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { rutCliente: SEED.clienteInterno, dvCliente: "0", razonSocial: "INTERNA", nomFantasia: "Fantasia Interna", idListaPrecio: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t10MLocalCliente).values([
    { idLocalCliente: SEED.localNorte, rutCliente: SEED.cliente, nomLocalCliente: "Local Norte", nomContacto: "Juan", apellPatContacto: "Lopez", apellMatContacto: "Vega", idVendedor: SEED.usuarioVendedor, idFormaPago: 7, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idLocalCliente: SEED.localInterno, rutCliente: SEED.clienteInterno, nomLocalCliente: "Local Interno", nomContacto: "Ana", apellPatContacto: "Diaz", apellMatContacto: "Paz", idVendedor: SEED.usuarioVendedor, idFormaPago: 7, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t20PMarca).values({ idMarca: SEED.marca, nomMarca: "MARCA" });
  await db.insert(t20PTipoProducto).values({ idTipoProducto: SEED.tipoBebidas, nomTipoProducto: "BEBIDAS", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t20PUnidadMedida).values({ idUm: SEED.um, nomUm: "UNI" });

  const prod = (idProducto: number, nom: string, impuesto: number, usaPorciones: number, cod: number) => ({
    idProducto, nomProducto: nom, descProducto: "", codBarraProducto: "", idTipoProducto: SEED.tipoBebidas, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, codSerfel: cod, impuesto, usaPorciones,
  });
  await db.insert(t20MProducto).values([
    prod(SEED.prodAgua, "Agua", 0, 0, 100),
    prod(SEED.prodJugo, "Jugo", SEED.impIla, 0, 200),
    prod(SEED.prodEspec, "Bebida ESPEC", SEED.impEspec, 0, 300),
    prod(SEED.prodLeche, "Leche", 0, 1, 400),
    prod(SEED.prodSinStock, "Sin Stock", 0, 0, 500),
  ]);
  await db.insert(t50PTipoBodega).values({ idTipoBodega: 1, nomTipoBodega: "PRINCIPAL", idEstado: 1 });
  await db.insert(t50MBodega).values({ idBodega: SEED.bodegaCentral, nomBodega: "CENTRAL", descBodega: "Bodega Central", idTipoBodega: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t50MStock).values([
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodAgua, cantidad: "100.000" },
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodJugo, cantidad: "5.000" },
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodEspec, cantidad: "100.000" },
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodLeche, cantidad: "100.000" },
    // prodSinStock: intentionally no stock row
  ]);

  const pedido = (idPedido: number, idLocalCliente: number, idEstado: number) => ({
    idPedido, fechaPedido: NOW, idLocalCliente, idListaPrecio: 1, idEstado, precioTotal: 1000, idUsuario: SEED.usuarioVendedor,
  });
  await db.insert(t30MPedido).values([
    pedido(SEED.pedidoNormal, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoEspec, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoInterno, SEED.localInterno, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoPorciones, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoYaVendido, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoSinStock, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoClamp, SEED.localNorte, SEED.ESTADO_ACTIVO),
  ]);
  await db.insert(t30MProductoPedido).values([
    { idPedido: SEED.pedidoNormal, idProducto: SEED.prodAgua, cantidad: "2.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoNormal, idProducto: SEED.prodJugo, cantidad: "1.000", precio: 500, porcenDesc: 0, precioNeto: 500 },
    { idPedido: SEED.pedidoEspec, idProducto: SEED.prodEspec, cantidad: "1.000", precio: 1000, porcenDesc: 10, precioNeto: 1000 },
    { idPedido: SEED.pedidoInterno, idProducto: SEED.prodAgua, cantidad: "3.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoPorciones, idProducto: SEED.prodLeche, cantidad: "1.000", precio: 800, porcenDesc: 0, precioNeto: 800 },
    { idPedido: SEED.pedidoYaVendido, idProducto: SEED.prodAgua, cantidad: "1.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoSinStock, idProducto: SEED.prodSinStock, cantidad: "1.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoClamp, idProducto: SEED.prodJugo, cantidad: "20.000", precio: 500, porcenDesc: 0, precioNeto: 500 },
  ]);
  // pedidoYaVendido already has a non-anulada venta
  await db.insert(t40MVenta).values({
    idVenta: 900, idListaPrecio: 1, idUsuarioVenta: SEED.usuarioVendedor, numDoctoEmitido: 0, idTipoDoctoEmitido: 1,
    rutEmpresa: SEED.empresaTarget, rutCliente: SEED.cliente, idLocalCliente: SEED.localNorte, idPedido: SEED.pedidoYaVendido,
    fechaVenta: NOW, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: SEED.ESTADO_FINALIZADO, precioTotal: 1190,
  });

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}
```

- [ ] **Step 2: Verify it compiles against the schema exports**

Run: `pnpm --filter @serfel/lambdas exec tsc --noEmit -p tsconfig.json 2>&1 | grep -i ventas || echo "no ventas type errors"`
Expected: no ventas type errors (helper references only exist-checked table names; `service.ts` is still missing but not imported here).

- [ ] **Step 3: Commit**

```bash
git add lambdas/ventas/tests/helpers.ts
git commit -m "test(ventas): seed harness for prefacturacion"
```

---

## Task 4: Service — `getUserTipo`, `listEmpresas`, `listPendientes`

**Files:**
- Create: `lambdas/ventas/service.ts`
- Test: `lambdas/ventas/tests/service.test.ts`

**Interfaces:**
- Consumes: `AppError` from `./errors`; `setupTestDb`, `SEED` from `./tests/helpers`.
- Produces: `getUserTipo(db, idUsuario): Promise<number|null>`, `listEmpresas(db): Promise<EmpresaDto[]>`, `listPendientes(db): Promise<PedidoPendienteDto[]>`. (Task 5 appends `prefacturarBatch` to this same file.)

- [ ] **Step 1: Write the failing test**

Create `lambdas/ventas/tests/service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getUserTipo, listEmpresas, listPendientes } from "../service";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_ventas_service"));
});
afterAll(async () => {
  await teardown();
});

describe("getUserTipo", () => {
  it("returns the tipo for an existing user", async () => {
    expect(await getUserTipo(db, SEED.usuarioAdmin)).toBe(SEED.tipoAdmin);
  });
  it("returns null for a missing user", async () => {
    expect(await getUserTipo(db, 999999)).toBeNull();
  });
});

describe("listEmpresas", () => {
  it("returns active empresas, one row per rut, ordered by razonSocial", async () => {
    const empresas = await listEmpresas(db);
    const ruts = empresas.map((e) => e.rutEmpresa);
    expect(new Set(ruts).size).toBe(ruts.length); // no dup ruts
    expect(ruts).toContain(SEED.empresaTarget);
    expect(empresas.find((e) => e.rutEmpresa === SEED.empresaTarget)?.razonSocial).toBe("SERFEL");
  });
});

describe("listPendientes", () => {
  it("returns active pedidos without a non-anulada venta", async () => {
    const pend = await listPendientes(db);
    const ids = pend.map((p) => p.idPedido);
    expect(ids).toContain(SEED.pedidoNormal);
    expect(ids).not.toContain(SEED.pedidoYaVendido); // has a venta
  });
  it("projects joined cliente/local/vendedor fields", async () => {
    const pend = await listPendientes(db);
    const normal = pend.find((p) => p.idPedido === SEED.pedidoNormal)!;
    expect(normal.nomFantasia).toBe("Fantasia Norte");
    expect(normal.nomLocal).toBe("Local Norte");
    expect(normal.contacto).toBe("Juan Lopez Vega");
    expect(normal.vendedor).toBe("Vera Diaz Rojas");
    expect(normal.rutCliente).toBe(SEED.cliente);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/ventas/tests/service.test.ts`
Expected: FAIL — cannot resolve `../service`.

- [ ] **Step 3: Create `service.ts` with the three read functions**

Create `lambdas/ventas/service.ts`:

```ts
import { and, asc, eq, ne, notExists, sql } from "drizzle-orm";
import {
  t10MUsuario,
  t10MEmpresa,
  t10MCliente,
  t10MLocalCliente,
  t30MPedido,
  t40MVenta,
  type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO,
  ESTADO_ANULADO,
  type EmpresaDto,
  type PedidoPendienteDto,
} from "@serfel/shared";

/** drizzle transaction object — same query API as Db for our purposes. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function listEmpresas(db: Db): Promise<EmpresaDto[]> {
  // 10_m_empresa PK is composite (rut_empresa, ult_fecha_mod): collapse to one
  // row per rut, keeping the latest ult_fecha_mod.
  const rows = await db
    .select({
      rutEmpresa: t10MEmpresa.rutEmpresa,
      dv: sql<string>`MAX(${t10MEmpresa.dvEmpresa})`,
      razonSocial: sql<string>`MAX(${t10MEmpresa.razonSocial})`,
    })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.idEstado, ESTADO_ACTIVO))
    .groupBy(t10MEmpresa.rutEmpresa)
    .orderBy(asc(sql`MAX(${t10MEmpresa.razonSocial})`));
  return rows;
}

function fullName(nom: string, ap: string | null, am: string | null): string {
  return [nom, ap ?? "", am ?? ""].join(" ").replace(/\s+/g, " ").trim();
}

export async function listPendientes(db: Db): Promise<PedidoPendienteDto[]> {
  const rows = await db
    .select({
      idPedido: t30MPedido.idPedido,
      fecha: t30MPedido.fechaPedido,
      precioTotal: t30MPedido.precioTotal,
      rutCliente: t10MCliente.rutCliente,
      dvCliente: t10MCliente.dvCliente,
      nomFantasia: t10MCliente.nomFantasia,
      nomLocal: t10MLocalCliente.nomLocalCliente,
      nomContacto: t10MLocalCliente.nomContacto,
      apellPatContacto: t10MLocalCliente.apellPatContacto,
      apellMatContacto: t10MLocalCliente.apellMatContacto,
      nomVendedor: t10MUsuario.nomUsuario,
      apellPatVendedor: t10MUsuario.apellPatUsuario,
      apellMatVendedor: t10MUsuario.apellMatUsuario,
    })
    .from(t30MPedido)
    .innerJoin(t10MLocalCliente, eq(t30MPedido.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .innerJoin(t10MCliente, eq(t10MLocalCliente.rutCliente, t10MCliente.rutCliente))
    .innerJoin(t10MUsuario, eq(t30MPedido.idUsuario, t10MUsuario.idUsuario))
    .where(
      and(
        eq(t30MPedido.idEstado, ESTADO_ACTIVO),
        notExists(
          db
            .select({ x: sql`1` })
            .from(t40MVenta)
            .where(
              and(
                eq(t40MVenta.idPedido, t30MPedido.idPedido),
                ne(t40MVenta.idEstado, ESTADO_ANULADO)
              )
            )
        )
      )
    )
    .orderBy(asc(t30MPedido.idPedido));

  return rows.map((r) => ({
    idPedido: r.idPedido,
    fecha: r.fecha,
    rutCliente: r.rutCliente,
    dvCliente: r.dvCliente,
    nomFantasia: r.nomFantasia,
    nomLocal: r.nomLocal,
    contacto: fullName(r.nomContacto ?? "", r.apellPatContacto, r.apellMatContacto),
    vendedor: fullName(r.nomVendedor, r.apellPatVendedor, r.apellMatVendedor),
    precioTotal: r.precioTotal,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/ventas/tests/service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lambdas/ventas/service.ts lambdas/ventas/tests/service.test.ts
git commit -m "feat(ventas): pendientes + empresas read queries"
```

---

## Task 5: Service — `prefacturarBatch` (the core port)

**Files:**
- Modify: `lambdas/ventas/service.ts`
- Modify: `lambdas/ventas/tests/service.test.ts`

**Interfaces:**
- Consumes: `Tx`, `DbOrTx` from Task 4.
- Produces: `prefacturarBatch(db, input, idUsuario): Promise<PrefacturaBatchResult>`.

- [ ] **Step 1: Append the failing tests**

Add to `lambdas/ventas/tests/service.test.ts`:

```ts
import { prefacturarBatch } from "../service";
import { and, eq } from "drizzle-orm";
import { t40MVenta, t40MProductoVenta, t50MStock, t30MPedido } from "@serfel/db";

describe("prefacturarBatch", () => {
  it("facturas a normal pedido: creates venta, lines, taxes, reduces stock, finalizes pedido", async () => {
    const before = await db
      .select({ cantidad: t50MStock.cantidad })
      .from(t50MStock)
      .where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua)));

    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoNormal] },
      SEED.usuarioAdmin
    );

    expect(res.facturados).toBe(1);
    expect(res.errores).toBe(0);
    const item = res.resultados[0];
    expect(item.status).toBe("facturado");
    expect(item.idVenta).toBeGreaterThan(0);

    // venta net = agua 2*1000 + jugo 1*500 = 2500; iva = round(2500*19/100)=475
    const venta = (await db.select().from(t40MVenta).where(eq(t40MVenta.idVenta, item.idVenta!)))[0];
    expect(venta.subTotal).toBe(2500);
    expect(venta.iva).toBe(475);
    expect(venta.iaba).toBe(round(500 * 18 / 100)); // jugo ILA on its 500 line
    expect(venta.rutEmpresa).toBe(SEED.empresaTarget);
    expect(venta.idEstado).toBe(SEED.ESTADO_FINALIZADO);

    const lines = await db.select().from(t40MProductoVenta).where(eq(t40MProductoVenta.idVenta, item.idVenta!));
    expect(lines.length).toBe(2);

    // stock for agua reduced by 2
    const after = await db
      .select({ cantidad: t50MStock.cantidad })
      .from(t50MStock)
      .where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua)));
    expect(Number(before[0].cantidad) - Number(after[0].cantidad)).toBe(2);

    const pedido = (await db.select().from(t30MPedido).where(eq(t30MPedido.idPedido, SEED.pedidoNormal)))[0];
    expect(pedido.idEstado).toBe(SEED.ESTADO_FINALIZADO);
  });

  it("errors on a pedido that already has a venta, without partial writes", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoYaVendido] },
      SEED.usuarioAdmin
    );
    expect(res.errores).toBe(1);
    expect(res.resultados[0].status).toBe("error");
    expect(res.resultados[0].error).toMatch(/asociado a Venta/i);
    // no new venta for that pedido (still exactly the seeded one, idVenta 900)
    const ventas = await db.select().from(t40MVenta).where(eq(t40MVenta.idPedido, SEED.pedidoYaVendido));
    expect(ventas.length).toBe(1);
  });

  it("errors on a porcionado pedido", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoPorciones] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("error");
    expect(res.resultados[0].error).toMatch(/porcionados/i);
  });

  it("skips a line with no stock and warns, still creating the venta with 0 lines", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoSinStock] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("facturado");
    expect(res.resultados[0].mensajes.join(" ")).toMatch(/no tiene stock/i);
    const lines = await db.select().from(t40MProductoVenta).where(eq(t40MProductoVenta.idVenta, res.resultados[0].idVenta!));
    expect(lines.length).toBe(0);
  });

  it("clamps line quantity to available stock and warns", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoClamp] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("facturado");
    expect(res.resultados[0].mensajes.join(" ")).toMatch(/se altero cantidad/i);
    const stock = (await db.select().from(t50MStock).where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodJugo))))[0];
    expect(Number(stock.cantidad)).toBe(0); // clamped to the 5 available, fully consumed
  });

  it("does NOT reduce stock for an internal-company cliente", async () => {
    const before = (await db.select().from(t50MStock).where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua))))[0];
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoInterno] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("facturado");
    const after = (await db.select().from(t50MStock).where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua))))[0];
    expect(Number(after.cantidad)).toBe(Number(before.cantidad)); // unchanged
  });

  it("processes all pedidos in a mixed batch and reports per-row", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoEspec, SEED.pedidoPorciones] },
      SEED.usuarioAdmin
    );
    expect(res.resultados.length).toBe(2);
    expect(res.facturados).toBe(1);
    expect(res.errores).toBe(1);
    const espec = res.resultados.find((r) => r.idPedido === SEED.pedidoEspec)!;
    expect(espec.status).toBe("facturado");
  });
});

function round(n: number): number {
  return Math.round(n);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/ventas/tests/service.test.ts -t prefacturarBatch`
Expected: FAIL — `prefacturarBatch` not exported.

- [ ] **Step 3: Implement `prefacturarBatch` (+ helpers) in `service.ts`**

Add these imports to the existing import block in `lambdas/ventas/service.ts`:

```ts
// extend the drizzle-orm import
import { and, asc, eq, ne, notExists, sql } from "drizzle-orm";
// extend the @serfel/db import with:
import {
  t20MProducto,
  t30MProductoPedido,
  t40MProductoVenta,
  t50MStock,
  t99PImpuesto,
} from "@serfel/db";
// extend the @serfel/shared import with:
import {
  BODEGA_CENTRAL,
  ESTADO_FINALIZADO,
  IMPUESTO_ESPEC,
  IMPUESTO_IVA,
  TIPO_DOCTO_FACTURA,
  type PrefacturaBatchInput,
  type PrefacturaBatchResult,
  type PrefacturaResultItem,
} from "@serfel/shared";
import { AppError } from "./errors";
```

Then append the implementation:

```ts
function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const subTotal = (cantidad: number, precio: number) => Math.round(cantidad * precio);
const montoDescSubTotal = (st: number, porcenDesc: number) => Math.round((st * porcenDesc) / 100);
const subTotalConDesc = (st: number, porcenDesc: number) => st - montoDescSubTotal(st, porcenDesc);

/** Thrown inside a pedido's transaction to abort + roll back with a reason. */
class PedidoError extends Error {}

/**
 * Batch pre-invoicing. Each pedido runs in its own transaction so a failure
 * rolls back only that pedido; every pedido is processed and reported.
 * Ported from lambdas/node-app-1/src/services/venta.service.ts.
 */
export async function prefacturarBatch(
  db: Db,
  input: PrefacturaBatchInput,
  idUsuario: number
): Promise<PrefacturaBatchResult> {
  // Tax rates loaded once for the whole batch.
  const impuestos = await db
    .select({ id: t99PImpuesto.idImpuesto, valor: t99PImpuesto.valor })
    .from(t99PImpuesto);
  const rateOf = (id: number): number | null => {
    const row = impuestos.find((i) => i.id === id);
    return row ? row.valor : null;
  };
  const ivaValor = rateOf(IMPUESTO_IVA);
  const especValor = rateOf(IMPUESTO_ESPEC);
  if (ivaValor === null) throw new AppError("VALIDACION", 500, "IVA no existe");
  if (especValor === null) throw new AppError("VALIDACION", 500, "ESPEC no existe");

  const uniqueIds = [...new Set(input.idPedidos)];
  const resultados: PrefacturaResultItem[] = [];

  for (const idPedido of uniqueIds) {
    const mensajes: string[] = [];
    try {
      const idVenta = await db.transaction(async (tx) => {
        return prefacturarUno(tx, idPedido, input.rutEmpresa, idUsuario, ivaValor, especValor, mensajes);
      });
      resultados.push({ idPedido, status: "facturado", idVenta, mensajes });
    } catch (err) {
      if (err instanceof PedidoError) {
        resultados.push({ idPedido, status: "error", mensajes, error: err.message });
      } else {
        resultados.push({
          idPedido,
          status: "error",
          mensajes,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
    }
  }

  return {
    resultados,
    facturados: resultados.filter((r) => r.status === "facturado").length,
    errores: resultados.filter((r) => r.status === "error").length,
  };
}

async function prefacturarUno(
  tx: Tx,
  idPedido: number,
  rutEmpresa: number,
  idUsuario: number,
  ivaValor: number,
  especValor: number,
  mensajes: string[]
): Promise<number> {
  // Guard: no existing non-anulada venta (re-checked inside the txn).
  const existente = await tx
    .select({ idVenta: t40MVenta.idVenta, num: t40MVenta.numDoctoEmitido })
    .from(t40MVenta)
    .where(and(eq(t40MVenta.idPedido, idPedido), ne(t40MVenta.idEstado, ESTADO_ANULADO)))
    .limit(1);
  if (existente.length > 0) {
    throw new PedidoError(
      `Pedido [${idPedido}] se encuentra asociado a Venta [${existente[0].idVenta}] factura n° ${existente[0].num}`
    );
  }

  const pedidoRows = await tx
    .select({ idEstado: t30MPedido.idEstado, idLocalCliente: t30MPedido.idLocalCliente, idUsuario: t30MPedido.idUsuario })
    .from(t30MPedido)
    .where(eq(t30MPedido.idPedido, idPedido))
    .limit(1);
  if (pedidoRows.length === 0) throw new PedidoError(`Pedido [${idPedido}] no existe`);
  const pedido = pedidoRows[0];
  if (pedido.idEstado !== ESTADO_ACTIVO) throw new PedidoError(`Pedido [${idPedido}] no se encuentra activo`);

  // Guard: reject porcionado products.
  const porcion = await tx
    .select({ x: sql`1` })
    .from(t30MProductoPedido)
    .innerJoin(t20MProducto, eq(t30MProductoPedido.idProducto, t20MProducto.idProducto))
    .where(and(eq(t30MProductoPedido.idPedido, idPedido), eq(t20MProducto.usaPorciones, 1)))
    .limit(1);
  if (porcion.length > 0) throw new PedidoError(`Pedido [${idPedido}] contiene productos porcionados`);

  // Line items joined with their producto (impuesto) and central-bodega stock.
  const lineas = await tx
    .select({
      idProducto: t30MProductoPedido.idProducto,
      cantidad: t30MProductoPedido.cantidad,
      porcenDesc: t30MProductoPedido.porcenDesc,
      precioNeto: t30MProductoPedido.precioNeto,
      codSerfel: t20MProducto.codSerfel,
      impuesto: t20MProducto.impuesto,
      stock: t50MStock.cantidad,
    })
    .from(t30MProductoPedido)
    .innerJoin(t20MProducto, eq(t30MProductoPedido.idProducto, t20MProducto.idProducto))
    .leftJoin(
      t50MStock,
      and(eq(t50MStock.idProducto, t30MProductoPedido.idProducto), eq(t50MStock.idBodega, BODEGA_CENTRAL))
    )
    .where(eq(t30MProductoPedido.idPedido, idPedido));

  let montoNetoTotal = 0;
  let montoILA = 0;
  let montoESPEC = 0;
  const ventaLines: { idProducto: number; cantidad: number; precioNeto: number; porcenDesc: number }[] = [];

  for (const l of lineas) {
    if (l.stock === null) {
      mensajes.push(`Pedido [${idPedido}] producto [${l.codSerfel}] no tiene stock`);
      continue;
    }
    const cantStock = Number(l.stock);
    if (cantStock === 0) {
      mensajes.push(`Pedido [${idPedido}] producto [${l.codSerfel}] no tiene stock disponible`);
      continue;
    }
    let cantidad = Number(l.cantidad);
    if (cantStock < cantidad) {
      mensajes.push(`Pedido [${idPedido}] se altero cantidad de producto [${l.codSerfel}] de ${cantidad} a ${cantStock}`);
      cantidad = cantStock;
    }
    const st = subTotal(cantidad, l.precioNeto);
    const stDesc = subTotalConDesc(st, l.porcenDesc);
    montoNetoTotal += stDesc;
    if (l.impuesto === IMPUESTO_ESPEC) {
      montoESPEC += Math.round((stDesc * especValor) / 100);
    } else if (l.impuesto > 0) {
      const rate = await taxRate(tx, l.impuesto);
      if (rate !== null) montoILA += Math.round((stDesc * rate) / 100);
    }
    ventaLines.push({ idProducto: l.idProducto, cantidad, precioNeto: l.precioNeto, porcenDesc: l.porcenDesc });
  }

  const localRows = await tx
    .select({ rutCliente: t10MLocalCliente.rutCliente, idFormaPago: t10MLocalCliente.idFormaPago })
    .from(t10MLocalCliente)
    .where(eq(t10MLocalCliente.idLocalCliente, pedido.idLocalCliente))
    .limit(1);
  if (localRows.length === 0) throw new PedidoError(`Local [${pedido.idLocalCliente}] no existe`);
  const local = localRows[0];

  const clienteRows = await tx
    .select({ idListaPrecio: t10MCliente.idListaPrecio })
    .from(t10MCliente)
    .where(eq(t10MCliente.rutCliente, local.rutCliente))
    .limit(1);
  if (clienteRows.length === 0) throw new PedidoError(`Cliente [${local.rutCliente}] no existe`);
  const cliente = clienteRows[0];

  const empresaTarget = await tx
    .select({ x: sql`1` })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.rutEmpresa, rutEmpresa))
    .limit(1);
  if (empresaTarget.length === 0) throw new PedidoError(`Empresa [${rutEmpresa}] no existe`);

  const iva = Math.round((montoNetoTotal * ivaValor) / 100);
  const now = nowDateTime();
  const [header] = await tx.insert(t40MVenta).values({
    idPedido,
    idUsuarioMod: idUsuario,
    fechaVenta: now,
    ultFechaMod: now,
    rutCliente: local.rutCliente,
    idLocalCliente: pedido.idLocalCliente,
    idTipoDoctoEmitido: TIPO_DOCTO_FACTURA,
    numDoctoEmitido: 0,
    idFormaPago: local.idFormaPago,
    idUsuarioVenta: pedido.idUsuario,
    idListaPrecio: cliente.idListaPrecio,
    idEstado: ESTADO_FINALIZADO,
    rutEmpresa,
    iva,
    espec: montoESPEC,
    iaba: montoILA,
    subTotal: montoNetoTotal,
    precioTotal: montoNetoTotal + montoESPEC + montoILA + iva,
  });
  const idVenta = header.insertId;

  // Internal company: cliente rut also present in the empresa table -> no stock decrement.
  const clienteInterno = await tx
    .select({ x: sql`1` })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.rutEmpresa, local.rutCliente))
    .limit(1);
  const esInterno = clienteInterno.length > 0;

  for (const vl of ventaLines) {
    await tx.insert(t40MProductoVenta).values({
      idVenta,
      idProducto: vl.idProducto,
      cantidad: vl.cantidad.toString(),
      precio: vl.precioNeto,
      porcenDesc: vl.porcenDesc,
      precioNeto: vl.precioNeto,
    });
    if (!esInterno) {
      await tx
        .update(t50MStock)
        .set({ cantidad: sql`${t50MStock.cantidad} - ${vl.cantidad}` })
        .where(and(eq(t50MStock.idBodega, BODEGA_CENTRAL), eq(t50MStock.idProducto, vl.idProducto)));
    }
  }

  await tx.update(t30MPedido).set({ idEstado: ESTADO_FINALIZADO }).where(eq(t30MPedido.idPedido, idPedido));
  return idVenta;
}

async function taxRate(tx: Tx, idImpuesto: number): Promise<number | null> {
  const rows = await tx
    .select({ valor: t99PImpuesto.valor })
    .from(t99PImpuesto)
    .where(eq(t99PImpuesto.idImpuesto, idImpuesto))
    .limit(1);
  return rows.length > 0 ? rows[0].valor : null;
}
```

- [ ] **Step 4: Run the full service test suite**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/ventas/tests/service.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add lambdas/ventas/service.ts lambdas/ventas/tests/service.test.ts
git commit -m "feat(ventas): prefacturarBatch transactional port"
```

---

## Task 6: Hono app + handler + app tests

**Files:**
- Create: `lambdas/ventas/app.ts`
- Create: `lambdas/ventas/index.ts`
- Test: `lambdas/ventas/tests/app.test.ts`

**Interfaces:**
- Consumes: `getUserTipo`, `listPendientes`, `listEmpresas`, `prefacturarBatch` from `./service`; `requireModule` from `./authz`; `AppError`, `isDbUnreachable` from `./errors`; `AppDeps`, `AppEnv` from `./types`.
- Produces: `createApp(deps): Hono`, `handler`.

- [ ] **Step 1: Write the failing app test**

Create `lambdas/ventas/tests/app.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { createApp } from "../app";

let db: Db;
let teardown: () => Promise<void>;

function appFor(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario });
}

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_ventas_app"));
});
afterAll(async () => {
  await teardown();
});

describe("authz", () => {
  it("403s a vendedor (tipo without ventas access)", async () => {
    const res = await appFor(SEED.usuarioVendedor).request("/api/prefacturacion/pendientes");
    expect(res.status).toBe(403);
  });
  it("403s when there is no id_usuario mapping", async () => {
    const res = await appFor(null).request("/api/prefacturacion/pendientes");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/prefacturacion/pendientes", () => {
  it("returns the worklist for an admin", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion/pendientes");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { idPedido: number }[];
    expect(body.some((p) => p.idPedido === SEED.pedidoNormal)).toBe(true);
  });
});

describe("GET /api/prefacturacion/empresas", () => {
  it("returns active empresas", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion/empresas");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rutEmpresa: number }[];
    expect(body.some((e) => e.rutEmpresa === SEED.empresaTarget)).toBe(true);
  });
});

describe("POST /api/prefacturacion", () => {
  it("400s on an empty idPedidos array", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rutEmpresa: SEED.empresaTarget, idPedidos: [] }),
    });
    expect(res.status).toBe(400);
  });
  it("400s on duplicate ids", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoNormal, SEED.pedidoNormal] }),
    });
    expect(res.status).toBe(400);
  });
  it("200s and returns a per-pedido result array", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoInterno] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resultados: { idPedido: number; status: string }[]; facturados: number };
    expect(body.facturados).toBe(1);
    expect(body.resultados[0].idPedido).toBe(SEED.pedidoInterno);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/ventas/tests/app.test.ts`
Expected: FAIL — cannot resolve `../app`.

- [ ] **Step 3: Create `app.ts`**

```ts
import { Hono, type Context } from "hono";
import { PrefacturaBatchInputSchema, type ApiErrorBody } from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { listPendientes, listEmpresas, prefacturarBatch } from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

async function parseBatch(c: Context) {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = PrefacturaBatchInputSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (isDbUnreachable(err)) {
      return c.json(
        errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible en este momento. Intenta más tarde."),
        503
      );
    }
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) {
      throw new AppError(
        "NO_AUTORIZADO",
        403,
        "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)"
      );
    }
    c.set("idUsuario", idUsuario);
    await next();
  });

  const ventas = requireModule("ventas", deps);
  app.use("/prefacturacion", ventas);
  app.use("/prefacturacion/*", ventas);

  app.get("/prefacturacion/pendientes", async (c) => c.json(await listPendientes(await deps.getDb())));
  app.get("/prefacturacion/empresas", async (c) => c.json(await listEmpresas(await deps.getDb())));
  app.post("/prefacturacion", async (c) => {
    const input = await parseBatch(c);
    return c.json(await prefacturarBatch(await deps.getDb(), input, c.get("idUsuario")));
  });

  return app;
}
```

- [ ] **Step 4: Create `index.ts`** (mirrors `lambdas/products/index.ts`)

```ts
import { readFileSync } from "node:fs";
import { handle } from "hono/aws-lambda";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { createDb, type Db, type DbCredentials } from "@serfel/db";
import { createApp } from "./app";

const sm = new SecretsManagerClient({});
let cachedDb: Db | null = null;

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  if (!secret.SecretString) {
    throw new Error("DB secret has no SecretString");
  }
  const creds = JSON.parse(secret.SecretString) as DbCredentials;
  cachedDb = createDb(creds, { ssl: { ca: readFileSync("rds-global-bundle.pem", "utf8") } }).db;
  return cachedDb;
}

interface JwtEnv {
  event?: { requestContext?: { authorizer?: { jwt?: { claims?: Record<string, unknown> } } } };
}

const app = createApp({
  getDb,
  getIdUsuario: (c) => {
    const claims = (c.env as JwtEnv).event?.requestContext?.authorizer?.jwt?.claims;
    const parsed = Number(claims?.["custom:id_usuario"]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },
});

export const handler = handle(app);
```

- [ ] **Step 5: Run app tests + typecheck**

Run: `pnpm --filter @serfel/lambdas exec vitest run lambdas/ventas/tests/app.test.ts && pnpm typecheck`
Expected: PASS. Typecheck clean for lambdas (`NAV_ITEMS` frontend error still pending until Task 8).

- [ ] **Step 6: Commit**

```bash
git add lambdas/ventas/app.ts lambdas/ventas/index.ts lambdas/ventas/tests/app.test.ts
git commit -m "feat(ventas): hono app, handler, and endpoint tests"
```

---

## Task 7: Infra wiring (`VentasFn` + routes)

**Files:**
- Modify: `infra/api.ts`

**Interfaces:**
- Consumes: `privateSubnetIds`, `sgLambdaId`, `dbSecretArn`, `jwtAuthorizer`, `stackTags`, `api` (all already in `infra/api.ts`).
- Produces: three new API Gateway routes bound to `VentasFn`.

- [ ] **Step 1: Add the `VentasFn` function definition**

In `infra/api.ts`, after the `usuariosFn` block (before `const api = new sst.aws.ApiGatewayV2(...)`), add:

```ts
const ventasFn = new sst.aws.Function("VentasFn", {
  handler: "lambdas/ventas/index.handler",
  runtime: "nodejs22.x",
  architecture: "arm64",
  timeout: "20 seconds",
  memory: "256 MB",
  vpc: { privateSubnets: privateSubnetIds, securityGroups: [sgLambdaId] },
  environment: { DB_SECRET_ARN: dbSecretArn },
  permissions: [{ actions: ["secretsmanager:GetSecretValue"], resources: [dbSecretArn] }],
  copyFiles: [{ from: "packages/db/rds-global-bundle.pem", to: "rds-global-bundle.pem" }],
  transform: {
    function: { name: `serfel-${$app.stage}-ventas`, tags: stackTags("serfel-aws") },
    logGroup: { tags: stackTags("serfel-aws") },
  },
});
```

- [ ] **Step 2: Add the routes**

After the `usuariosRoutes` loop (near the end of the file, before `export const apiUrl = api.url;`), add:

```ts
const ventasRoutes = [
  "GET /api/prefacturacion/pendientes",
  "GET /api/prefacturacion/empresas",
  "POST /api/prefacturacion",
] as const;
for (const route of ventasRoutes) {
  api.route(route, ventasFn.arn, { auth: { jwt: { authorizer: jwtAuthorizer.id } } });
}
```

- [ ] **Step 3: Verify SST config typechecks**

Run: `pnpm typecheck 2>&1 | grep -i "infra/api" || echo "infra/api ok"`
Expected: `infra/api ok` (no type errors in the infra file).

- [ ] **Step 4: Commit**

```bash
git add infra/api.ts
git commit -m "feat(infra): ventas lambda + prefacturacion routes"
```

---

## Task 8: Frontend — API service + pure logic

**Files:**
- Create: `apps/frontend/src/app/features/prefacturacion/prefacturacion-api.service.ts`
- Create: `apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.ts`
- Create: `apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts`
- Modify: `apps/frontend/src/app/core/nav.ts`

**Interfaces:**
- Consumes: `PedidoPendienteDto`, `EmpresaDto`, `PrefacturaBatchInput`, `PrefacturaBatchResult` from `@serfel/shared`; `environment`.
- Produces: `PrefacturacionApi` (`pendientes()`, `empresas()`, `prefacturar()`); logic helpers `applyFilter`, `sortRows`, `computeStats`, `Sort`, `SortKey`.

- [ ] **Step 1: Write the failing logic test**

Create `apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyFilter, sortRows, computeStats } from "./prefacturacion-logic";
import type { PedidoPendienteDto } from "@serfel/shared";

const row = (over: Partial<PedidoPendienteDto>): PedidoPendienteDto => ({
  idPedido: 1, fecha: "2026-01-01T00:00:00", rutCliente: 55000000, dvCliente: "0",
  nomFantasia: "Fantasia", nomLocal: "Local", contacto: "Juan Lopez", vendedor: "Vera Diaz", precioTotal: 1000,
  ...over,
});

describe("applyFilter", () => {
  const rows = [
    row({ idPedido: 1, nomFantasia: "Almacen Sur" }),
    row({ idPedido: 2, nomFantasia: "Kiosco Norte" }),
  ];
  it("returns all rows for an empty query", () => {
    expect(applyFilter(rows, "").length).toBe(2);
  });
  it("matches by fantasia tokens in any order", () => {
    expect(applyFilter(rows, "sur almacen").map((r) => r.idPedido)).toEqual([1]);
  });
  it("matches by idPedido", () => {
    expect(applyFilter(rows, "2").map((r) => r.idPedido)).toEqual([2]);
  });
});

describe("sortRows", () => {
  const rows = [row({ idPedido: 2, precioTotal: 500 }), row({ idPedido: 1, precioTotal: 900 })];
  it("sorts numeric ascending", () => {
    expect(sortRows(rows, { key: "idPedido", asc: true }).map((r) => r.idPedido)).toEqual([1, 2]);
  });
  it("sorts numeric descending", () => {
    expect(sortRows(rows, { key: "precioTotal", asc: false }).map((r) => r.precioTotal)).toEqual([900, 500]);
  });
});

describe("computeStats", () => {
  it("counts selected against a selection set", () => {
    const rows = [row({ idPedido: 1 }), row({ idPedido: 2 }), row({ idPedido: 3 })];
    const stats = computeStats(rows, new Set([1, 3]));
    expect(stats.total).toBe(3);
    expect(stats.seleccionados).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/prefacturacion/prefacturacion-logic.spec.ts`
Expected: FAIL — cannot resolve `./prefacturacion-logic`.

- [ ] **Step 3: Create `prefacturacion-logic.ts`**

```ts
import type { PedidoPendienteDto } from "@serfel/shared";

export type SortKey = "idPedido" | "fecha" | "rutCliente" | "nomFantasia" | "nomLocal" | "contacto" | "vendedor" | "precioTotal";

export interface Sort {
  key: SortKey;
  asc: boolean;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function applyFilter(rows: PedidoPendienteDto[], query: string): PedidoPendienteDto[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return rows;
  return rows.filter((r) => {
    const haystack = normalize(`${r.idPedido} ${r.rutCliente} ${r.nomFantasia} ${r.nomLocal} ${r.contacto} ${r.vendedor}`);
    return tokens.every((t) => haystack.includes(t));
  });
}

export function sortRows(rows: PedidoPendienteDto[], s: Sort): PedidoPendienteDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key];
    const vb = b[s.key];
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return s.asc ? cmp : -cmp;
  });
}

export function computeStats(
  rows: PedidoPendienteDto[],
  seleccion: Set<number>
): { total: number; seleccionados: number } {
  let seleccionados = 0;
  for (const r of rows) if (seleccion.has(r.idPedido)) seleccionados++;
  return { total: rows.length, seleccionados };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/features/prefacturacion/prefacturacion-logic.spec.ts`
Expected: PASS.

- [ ] **Step 5: Create `prefacturacion-api.service.ts`**

```ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { EmpresaDto, PedidoPendienteDto, PrefacturaBatchInput, PrefacturaBatchResult } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class PrefacturacionApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/prefacturacion`;

  pendientes() {
    return this.http.get<PedidoPendienteDto[]>(`${this.base}/pendientes`);
  }
  empresas() {
    return this.http.get<EmpresaDto[]>(`${this.base}/empresas`);
  }
  prefacturar(input: PrefacturaBatchInput) {
    return this.http.post<PrefacturaBatchResult>(this.base, input);
  }
}
```

- [ ] **Step 6: Add the nav entry**

In `apps/frontend/src/app/core/nav.ts`, add the `ventas` key to `NAV_ITEMS`:

```ts
export const NAV_ITEMS: Record<ModuleName, { label: string; path: string }> = {
  productos: { label: "Productos", path: "/productos" },
  rutas: { label: "Listado Carga", path: "/listado-carga" },
  usuarios: { label: "Usuarios", path: "/usuarios" },
  ventas: { label: "Prefacturación", path: "/prefacturacion" },
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/features/prefacturacion/prefacturacion-api.service.ts apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.ts apps/frontend/src/app/features/prefacturacion/prefacturacion-logic.spec.ts apps/frontend/src/app/core/nav.ts
git commit -m "feat(frontend): prefacturacion api + logic + nav"
```

---

## Task 9: Frontend — store

**Files:**
- Create: `apps/frontend/src/app/features/prefacturacion/prefacturacion-store.ts`

**Interfaces:**
- Consumes: `PrefacturacionApi`; logic helpers; `PedidoPendienteDto`, `EmpresaDto`, `PrefacturaResultItem`, `ApiErrorBody`.
- Produces: `PrefacturacionStore` with signals `pedidos`, `empresas`, `empresaSeleccionada`, `seleccion`, `resultados`, `query`, `sort`, `loading`, `procesando`, `errorMsg`; computed `filtered`, `stats`; actions `load()`, `toggle(id)`, `toggleAll()`, `setQuery()`, `toggleSort()`, `setEmpresa()`, `prefacturar()`.

- [ ] **Step 1: Create the store**

```ts
import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type { ApiErrorBody, PedidoPendienteDto, EmpresaDto, PrefacturaResultItem } from "@serfel/shared";
import { PrefacturacionApi } from "./prefacturacion-api.service";
import { applyFilter, sortRows, computeStats, type Sort, type SortKey } from "./prefacturacion-logic";

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class PrefacturacionStore {
  private api = inject(PrefacturacionApi);

  readonly pedidos = signal<PedidoPendienteDto[]>([]);
  readonly empresas = signal<EmpresaDto[]>([]);
  readonly empresaSeleccionada = signal<number | null>(null);
  readonly seleccion = signal<Set<number>>(new Set());
  readonly resultados = signal<Map<number, PrefacturaResultItem>>(new Map());
  readonly query = signal("");
  readonly sort = signal<Sort>({ key: "idPedido", asc: true });
  readonly loading = signal(false);
  readonly procesando = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly filtered = computed(() => sortRows(applyFilter(this.pedidos(), this.query()), this.sort()));
  readonly stats = computed(() => {
    const base = computeStats(this.filtered(), this.seleccion());
    const rs = [...this.resultados().values()];
    return {
      ...base,
      facturados: rs.filter((r) => r.status === "facturado").length,
      errores: rs.filter((r) => r.status === "error").length,
    };
  });
  readonly allSelected = computed(() => {
    const rows = this.filtered();
    const sel = this.seleccion();
    return rows.length > 0 && rows.every((r) => sel.has(r.idPedido));
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [pedidos, empresas] = await Promise.all([
        firstValueFrom(this.api.pendientes()),
        this.empresas().length ? Promise.resolve(this.empresas()) : firstValueFrom(this.api.empresas()),
      ]);
      this.pedidos.set(pedidos);
      this.empresas.set(empresas);
      // Drop selections for pedidos no longer present.
      const present = new Set(pedidos.map((p) => p.idPedido));
      this.seleccion.update((s) => new Set([...s].filter((id) => present.has(id))));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudieron cargar los pedidos. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  setEmpresa(rutEmpresa: number | null): void {
    this.empresaSeleccionada.set(rutEmpresa);
  }
  setQuery(q: string): void {
    this.query.set(q);
  }
  toggleSort(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }
  toggle(id: number): void {
    this.seleccion.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  toggleAll(): void {
    const rows = this.filtered();
    this.seleccion.update((s) => {
      const allOn = rows.length > 0 && rows.every((r) => s.has(r.idPedido));
      const next = new Set(s);
      for (const r of rows) allOn ? next.delete(r.idPedido) : next.add(r.idPedido);
      return next;
    });
  }

  async prefacturar(): Promise<void> {
    const rutEmpresa = this.empresaSeleccionada();
    if (rutEmpresa === null) {
      this.errorMsg.set("Debe seleccionar una empresa");
      return;
    }
    const idPedidos = [...this.seleccion()];
    if (idPedidos.length === 0) return;

    this.procesando.set(true);
    this.errorMsg.set(null);
    try {
      const result = await firstValueFrom(this.api.prefacturar({ rutEmpresa, idPedidos }));
      this.resultados.update((m) => {
        const next = new Map(m);
        for (const r of result.resultados) next.set(r.idPedido, r);
        return next;
      });
      // Clear selection for the facturados; keep errored rows selected for retry.
      const okIds = new Set(result.resultados.filter((r) => r.status === "facturado").map((r) => r.idPedido));
      this.seleccion.update((s) => new Set([...s].filter((id) => !okIds.has(id))));
      await this.load(); // facturados drop out of the worklist
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo procesar la prefacturación.");
    } finally {
      this.procesando.set(false);
    }
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i prefacturacion-store || echo "store ok"`
Expected: `store ok`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/features/prefacturacion/prefacturacion-store.ts
git commit -m "feat(frontend): prefacturacion signal store"
```

---

## Task 10: Frontend — page component + route

**Files:**
- Create: `apps/frontend/src/app/features/prefacturacion/prefacturacion-page.component.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `PrefacturacionStore`; `SortKey`.
- Produces: `PrefacturacionPageComponent` (standalone, inline template + styles), route `/prefacturacion`.

- [ ] **Step 1: Create the page component**

```ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PrefacturacionStore } from "./prefacturacion-store";
import type { SortKey } from "./prefacturacion-logic";

@Component({
  selector: "app-prefacturacion-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="toolbar">
        <div class="field">
          <label for="empresa">Rut Empresa</label>
          <select id="empresa" [ngModel]="store.empresaSeleccionada()" (ngModelChange)="store.setEmpresa($event)">
            <option [ngValue]="null">Seleccione una empresa</option>
            @for (e of store.empresas(); track e.rutEmpresa) {
              <option [ngValue]="e.rutEmpresa">{{ e.rutEmpresa }}-{{ e.dv }} · {{ e.razonSocial }}</option>
            }
          </select>
        </div>
        <button class="primary" [disabled]="store.procesando() || store.stats().seleccionados === 0" (click)="store.prefacturar()">
          @if (store.procesando()) { <span class="spinner"></span> }
          Prefacturar
        </button>
        <div class="counts">
          <span class="badge">Seleccionados {{ store.stats().seleccionados }}</span>
          <span class="badge ok">Facturados {{ store.stats().facturados }}</span>
          <span class="badge err">Errores {{ store.stats().errores }}</span>
        </div>
        <input class="search" type="search" placeholder="Buscar pedido, cliente, local, vendedor…"
               [ngModel]="store.query()" (ngModelChange)="store.setQuery($event)" />
      </header>

      @if (store.errorMsg()) { <p class="alert">{{ store.errorMsg() }}</p> }
      @if (store.loading()) { <p class="muted">Cargando…</p> }

      <table class="grid">
        <thead>
          <tr>
            @for (col of columns; track col.key) {
              <th (click)="store.toggleSort(col.key)">
                {{ col.label }}
                @if (store.sort().key === col.key) { <span>{{ store.sort().asc ? '▲' : '▼' }}</span> }
              </th>
            }
            <th>Estado</th>
            <th><button class="link" (click)="store.toggleAll()">{{ store.allSelected() ? 'Ninguno' : 'Todos' }}</button></th>
          </tr>
        </thead>
        <tbody>
          @for (p of store.filtered(); track p.idPedido) {
            <tr>
              <td>{{ p.idPedido }}</td>
              <td>{{ p.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ p.rutCliente }}-{{ p.dvCliente }}</td>
              <td>{{ p.nomFantasia }}</td>
              <td>{{ p.nomLocal }}</td>
              <td>{{ p.contacto }}</td>
              <td>{{ p.vendedor }}</td>
              <td class="num">{{ p.precioTotal | number }}</td>
              <td>
                @if (resultOf(p.idPedido); as r) {
                  @if (r.status === 'facturado') {
                    <span class="status ok" [title]="r.mensajes.join('\n')">✓ Venta {{ r.idVenta }}{{ r.mensajes.length ? ' ⚠' : '' }}</span>
                  } @else {
                    <span class="status err" [title]="r.error || ''">✕ {{ r.error }}</span>
                  }
                }
              </td>
              <td class="center">
                <input type="checkbox" [checked]="store.seleccion().has(p.idPedido)" (change)="store.toggle(p.idPedido)" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    .page { padding: 1rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .counts { display: flex; gap: 0.5rem; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 999px; background: #eef2f7; font-size: 0.85rem; }
    .badge.ok { background: #dcfce7; color: #14532d; }
    .badge.err { background: #fee2e2; color: #991b1b; }
    .search { margin-left: auto; padding: 0.4rem 0.6rem; min-width: 16rem; }
    .primary { padding: 0.45rem 1rem; }
    .primary[disabled] { opacity: 0.5; cursor: not-allowed; }
    .grid { width: 100%; border-collapse: collapse; }
    .grid th, .grid td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
    .grid th { cursor: pointer; user-select: none; white-space: nowrap; }
    .num, td.num { text-align: right; }
    .center { text-align: center; }
    .status.ok { color: #14532d; }
    .status.err { color: #991b1b; }
    .alert { background: #fee2e2; color: #991b1b; padding: 0.6rem; border-radius: 6px; }
    .muted { color: #6b7280; }
    .link { background: none; border: none; color: #2563eb; cursor: pointer; }
    .spinner { display: inline-block; width: 0.8rem; height: 0.8rem; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PrefacturacionPageComponent implements OnInit {
  readonly store = inject(PrefacturacionStore);

  readonly columns: { key: SortKey; label: string }[] = [
    { key: "idPedido", label: "N°" },
    { key: "fecha", label: "Fecha Pedido" },
    { key: "rutCliente", label: "Rut Cliente" },
    { key: "nomFantasia", label: "Nombre Fantasía" },
    { key: "nomLocal", label: "Nombre Local" },
    { key: "contacto", label: "Contacto" },
    { key: "vendedor", label: "Vendedor" },
    { key: "precioTotal", label: "Precio Total" },
  ];

  private readonly resultados = computed(() => this.store.resultados());

  ngOnInit(): void {
    void this.store.load();
  }

  resultOf(idPedido: number) {
    return this.resultados().get(idPedido) ?? null;
  }
}
```

- [ ] **Step 2: Register the route**

In `apps/frontend/src/app/app.routes.ts`, import the component and add the guarded route (place it after the `usuarios` route):

```ts
import { PrefacturacionPageComponent } from './features/prefacturacion/prefacturacion-page.component';
```

```ts
  { path: 'prefacturacion', component: PrefacturacionPageComponent, canActivate: [moduleGuard('ventas')] },
```

- [ ] **Step 3: Typecheck + build the frontend**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/features/prefacturacion/prefacturacion-page.component.ts apps/frontend/src/app/app.routes.ts
git commit -m "feat(frontend): prefacturacion page + route"
```

---

## Task 11: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Typecheck the whole repo**

Run: `pnpm typecheck`
Expected: PASS, zero errors.

- [ ] **Step 2: Run the full test suite** (MariaDB up)

Run: `docker compose -f packages/db/docker-compose.yml up -d --wait && pnpm -r test`
Expected: all packages green, including `@serfel/lambdas` ventas suites and `@serfel/frontend` prefacturacion-logic.

- [ ] **Step 3: Sanity-check the diff**

Run: `git log --oneline -11 && git status`
Expected: 10 feature commits (Tasks 1-10) on the branch, clean working tree.

- [ ] **Step 4: Commit any remaining fixes** (only if Steps 1-2 surfaced issues)

```bash
git add -A && git commit -m "fix(ventas): verification-pass fixes"
```

---

## Self-Review Notes

- **Spec coverage:** batch endpoint (Task 5/6), empresa DB lookup (Task 4/6), pendientes worklist excluding sold pedidos (Task 4), per-pedido transaction + process-all (Task 5), inline per-row status + summary counts (Task 10), client-side filter/sort/select (Tasks 8-10), authz `ventas` module (Tasks 1-2-6), no DB migration (uses existing tables), all correctness improvements (single request, transactions, sequential stock, idempotency re-check, fixed stock read via deterministic central-bodega join, structured results, one impuesto load per batch) — all mapped.
- **Placeholder guard:** every code step ships the real content; no TBD/TODO markers remain.
- **Type consistency:** `prefacturarBatch(db, input, idUsuario)`, `PrefacturaResultItem.status ∈ {facturado, error}`, `SortKey` union, and store signal names are used identically across tasks.
