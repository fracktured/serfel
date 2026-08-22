import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { eq } from "drizzle-orm";
import { t20MProducto, t50MStock, t50MStockLog, t40MPrecioProducto, t50MRecepcionCompra, t50MProductoRecepcion, type Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getLookups, listProducts, createProduct, updateProduct, deactivateProduct, restoreProduct, getUserTipo, getMe, getProductoDetalle, setStock } from "../service";

let db: Db;
let pool: Pool;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, pool, teardown } = await setupTestDb("serfel_products_svc"));
});
afterAll(async () => {
  await teardown();
});

function productRow(over: Partial<typeof base> = {}) {
  return { ...base, ...over };
}
const base = {
  nomProducto: "YOG BASE", descProducto: "", codBarraProducto: "",
  idTipoProducto: SEED.tipoYogurt, idMarca: SEED.marcaSoprole as number, idUm: SEED.umUni,
  idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
  idEstado: 1, codSerfel: 311, impuesto: 0, usaPorciones: 0,
};

describe("getLookups", () => {
  it("returns marcas, tiposProducto and unidadesMedida as {id, nombre} ordered by name", async () => {
    const lookups = await getLookups(db);
    // ordered alphabetically by name, not by id
    expect(lookups.marcas).toEqual([
      { id: SEED.marcaNestle, nombre: "NESTLE" },
      { id: SEED.marcaSoprole, nombre: "SOPROLE" },
    ]);
    expect(lookups.tiposProducto).toEqual([{ id: SEED.tipoYogurt, nombre: "YOGURT" }]);
    expect(lookups.unidadesMedida).toEqual([
      { id: SEED.umLt, nombre: "LT" },
      { id: SEED.umUni, nombre: "UNI" },
    ]);
    // label carries the rate; ordered by raw name (HARINA, IABA, IVA, Sin Imp.)
    expect(lookups.impuestos).toEqual([
      { id: SEED.impHarina, nombre: "HARINA 12%" },
      { id: SEED.impIaba, nombre: "IABA 18%" },
      { id: SEED.impIva, nombre: "IVA 19%" },
      { id: SEED.impSinAdicional, nombre: "Sin Imp. Adicional 0%" },
    ]);
  });
});

describe("listProducts", () => {
  beforeAll(async () => {
    await db.insert(t20MProducto).values([
      productRow({ nomProducto: "ACTIVO A", codSerfel: 200 }),
      productRow({ nomProducto: "ACTIVO B", codSerfel: 100, idMarca: SEED.marcaNestle }),
      productRow({ nomProducto: "INACTIVO C", codSerfel: 300, idEstado: 0 }),
    ]);
  });

  it("returns active products with joined names, ordered by codSerfel", async () => {
    const rows = await listProducts(db, "activos");
    expect(rows.map((r) => r.codSerfel)).toEqual([100, 200]);
    const b = rows[0];
    expect(b).toMatchObject({
      codSerfel: 100,
      nomProducto: "ACTIVO B",
      nomMarca: "NESTLE",
      nomUm: "UNI",
      nomTipoProducto: "YOGURT",
      idEstado: 1,
    });
    expect(b.idProducto).toBeGreaterThan(0);
  });

  it("filters inactivos and todos", async () => {
    const inactive = await listProducts(db, "inactivos");
    expect(inactive.map((r) => r.nomProducto)).toEqual(["INACTIVO C"]);
    const all = await listProducts(db, "todos");
    expect(all).toHaveLength(3);
  });
});

describe("createProduct", () => {
  const input = {
    codSerfel: 500,
    nomProducto: "CREADO X",
    idMarca: SEED.marcaSoprole,
    idUm: SEED.umUni,
    idTipoProducto: SEED.tipoYogurt,
    impuesto: SEED.impIva,
    usaPorciones: 1 as const,
  };

  it("creates and returns the joined DTO with a DB-assigned id, persisting impuesto and usaPorciones", async () => {
    const dto = await createProduct(db, input, SEED.idUsuario);
    expect(dto.idProducto).toBeGreaterThan(0);
    expect(dto).toMatchObject({
      codSerfel: 500,
      nomProducto: "CREADO X",
      nomMarca: "SOPROLE",
      nomUm: "UNI",
      nomTipoProducto: "YOGURT",
      impuesto: SEED.impIva,
      usaPorciones: 1,
      idEstado: 1,
    });
  });

  it("rejects a codSerfel used by an active product", async () => {
    await expect(
      createProduct(db, { ...input, nomProducto: "OTRO NOMBRE" }, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "COD_SERFEL_EN_USO", status: 409 });
  });

  it("rejects a nomProducto used by an active product (case-insensitive)", async () => {
    await expect(
      createProduct(db, { ...input, codSerfel: 501, nomProducto: "creado x" }, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "NOMBRE_EN_USO", status: 409 });
  });

  it("allows reusing codSerfel and nombre of an INACTIVE product", async () => {
    await db.insert(t20MProducto).values(
      productRow({ nomProducto: "MUERTO", codSerfel: 600, idEstado: 0 })
    );
    const dto = await createProduct(
      db,
      { ...input, codSerfel: 600, nomProducto: "MUERTO" },
      SEED.idUsuario
    );
    expect(dto.idEstado).toBe(1);
  });
});

describe("update / deactivate / restore", () => {
  const input = {
    codSerfel: 700,
    nomProducto: "CICLO DE VIDA",
    idMarca: SEED.marcaSoprole,
    idUm: SEED.umUni,
    idTipoProducto: SEED.tipoYogurt,
    impuesto: SEED.impSinAdicional,
    usaPorciones: 0 as const,
  };
  let id: number;

  beforeAll(async () => {
    id = (await createProduct(db, input, SEED.idUsuario)).idProducto;
  });

  it("updates fields, keeping its own codSerfel without a false conflict", async () => {
    const dto = await updateProduct(
      db,
      id,
      { ...input, nomProducto: "CICLO RENOMBRADO", idMarca: SEED.marcaNestle },
      SEED.idUsuario
    );
    expect(dto).toMatchObject({
      idProducto: id,
      codSerfel: 700,
      nomProducto: "CICLO RENOMBRADO",
      nomMarca: "NESTLE",
    });
  });

  it("rejects update that takes another active product's codigo", async () => {
    // codSerfel 500 belongs to "CREADO X" from the previous suite
    await expect(
      updateProduct(db, id, { ...input, codSerfel: 500 }, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "COD_SERFEL_EN_USO", status: 409 });
  });

  it("404s for a nonexistent product", async () => {
    await expect(
      updateProduct(db, 999999, input, SEED.idUsuario)
    ).rejects.toMatchObject({ code: "PRODUCTO_NO_ENCONTRADO", status: 404 });
    await expect(deactivateProduct(db, 999999, SEED.idUsuario)).rejects.toMatchObject({
      code: "PRODUCTO_NO_ENCONTRADO",
    });
    await expect(restoreProduct(db, 999999, SEED.idUsuario)).rejects.toMatchObject({
      code: "PRODUCTO_NO_ENCONTRADO",
    });
  });

  it("soft-deletes (idEstado 0) and is idempotent", async () => {
    expect((await deactivateProduct(db, id, SEED.idUsuario)).idEstado).toBe(0);
    expect((await deactivateProduct(db, id, SEED.idUsuario)).idEstado).toBe(0);
    const activos = await listProducts(db, "activos");
    expect(activos.find((p) => p.idProducto === id)).toBeUndefined();
  });

  it("blocks restore when another active product took the codigo meanwhile", async () => {
    await createProduct(
      db,
      { ...input, nomProducto: "USURPADOR" }, // same codSerfel 700, now free
      SEED.idUsuario
    );
    await expect(restoreProduct(db, id, SEED.idUsuario)).rejects.toMatchObject({
      code: "COD_SERFEL_EN_USO",
      status: 409,
    });
  });

  it("restores when there is no conflict", async () => {
    const fresh = await createProduct(
      db,
      { ...input, codSerfel: 800, nomProducto: "RESTAURABLE" },
      SEED.idUsuario
    );
    await deactivateProduct(db, fresh.idProducto, SEED.idUsuario);
    const restored = await restoreProduct(db, fresh.idProducto, SEED.idUsuario);
    expect(restored.idEstado).toBe(1);
  });
});

describe("getUserTipo", () => {
  it("returns the id_tipo_usuario for an existing user", async () => {
    expect(await getUserTipo(db, SEED.idUsuario)).toBe(SEED.tipoAdmin);
    expect(await getUserTipo(db, SEED.idUsuarioVendedor)).toBe(SEED.tipoVendedor);
  });
  it("returns null for a missing user", async () => {
    expect(await getUserTipo(db, 999999)).toBeNull();
  });
});

describe("getMe", () => {
  it("returns identity + accessible modules for an admin", async () => {
    const me = await getMe(db, SEED.idUsuario);
    expect(me).toEqual({
      idUsuario: SEED.idUsuario,
      idTipoUsuario: SEED.tipoAdmin,
      nomUsuario: "Admin Test",
      modulos: ["productos", "rutas", "usuarios", "ventas", "clientes", "marcas", "precios", "notas_credito"],
    });
  });
  it("returns an empty module list for a vendedor", async () => {
    const me = await getMe(db, SEED.idUsuarioVendedor);
    expect(me.idTipoUsuario).toBe(SEED.tipoVendedor);
    expect(me.modulos).toEqual([]);
  });
  it("throws NO_AUTORIZADO for a missing user", async () => {
    await expect(getMe(db, 999999)).rejects.toMatchObject({
      code: "NO_AUTORIZADO",
      status: 403,
    });
  });
});

describe("getProductoDetalle", () => {
  let idConImp: number;
  let idSinImp: number;

  beforeAll(async () => {
    // product WITH additional tax (IABA), price, stock, and a purchase.
    // costoProm/ultFechaCompra are not part of `base`, so spread them onto the
    // insert object (the Drizzle insert type accepts them).
    const [h1] = await db.insert(t20MProducto).values({
      ...productRow({ nomProducto: "DET IABA", codSerfel: 900, impuesto: SEED.impIaba }),
      costoProm: "100.00",
      ultFechaCompra: "2026-02-01 00:00:00",
    });
    idConImp = h1.insertId;
    await db.insert(t40MPrecioProducto).values({ idListaPrecio: 1, idProducto: idConImp, precioNeto: 200, precio: 0, porcenDesc: 0 });
    await db.insert(t50MStock).values({ idBodega: SEED.bodegaCentral, idProducto: idConImp, cantidad: "10.000" });
    await db.insert(t50MRecepcionCompra).values({
      idRecepcion: 500, rutProveedor: SEED.proveedorRut, rutEmpresa: 76000000, idTipoDocto: SEED.tipoDoctoFactura,
      numDocto: 1, fechaEmisionDocto: "2026-02-01 00:00:00", idBodega: SEED.bodegaCentral,
      idUsuarioRecepcion: SEED.idUsuario, idEstado: 1,
    });
    await db.insert(t50MProductoRecepcion).values({ idRecepcion: 500, idProducto: idConImp, cantidad: "10.000", valor: "1000.000" });

    // product WITHOUT price, stock, or purchase (costoProm defaults to 0.00)
    const [h2] = await db.insert(t20MProducto).values(
      productRow({ nomProducto: "DET SIN", codSerfel: 901, impuesto: 0 })
    );
    idSinImp = h2.insertId;
  });

  it("assembles the full detail with computed money fields and IABA tax", async () => {
    const d = await getProductoDetalle(db, idConImp);
    expect(d).toMatchObject({
      codSerfel: 900,
      nomProducto: "DET IABA",
      nomMarca: "SOPROLE",
      nomUm: "UNI",
      tipoProducto: "YOGURT",
      costoProm: 100,
      cantidadStock: 10,
      precioNeto: 200,
    });
    // costoConIva = 100 * (1 + 19/100) = 119
    expect(d.costoConIva).toBeCloseTo(119, 5);
    // costoTotalStock = 10 * 100 = 1000
    expect(d.costoTotalStock).toBeCloseTo(1000, 5);
    // valorMargen = 200 - 100 = 100 ; porcenMargen = 100/200*100 = 50
    expect(d.valorMargen).toBeCloseTo(100, 5);
    expect(d.porcenMargen).toBeCloseTo(50, 5);
    // impuesto adicional IABA 18% of neto 200 = 36
    expect(d.impuestoAdicional).toEqual({ nombre: "IABA", porcentaje: 18, monto: 36 });
    // precio_base = 200 + iva(38) + iaba(36) = 274 ; porcen_desc 0 -> venta cliente 274
    expect(d.precioVentaCliente).toBeCloseTo(274, 5);
    expect(d.proveedorUltCompra).toEqual({ rut: "76000000-9", razonSocial: "PROV TEST SA" });
  });

  it("defaults missing price/stock/purchase to zero and null tax/proveedor", async () => {
    const d = await getProductoDetalle(db, idSinImp);
    expect(d).toMatchObject({
      precioNeto: 0, cantidadStock: 0, costoTotalStock: 0,
      costoConIva: 0, precioVentaCliente: 0, valorMargen: 0, porcenMargen: 0,
      impuestoAdicional: null, proveedorUltCompra: null,
    });
  });

  it("throws PRODUCTO_NO_ENCONTRADO for an unknown id", async () => {
    await expect(getProductoDetalle(db, 999999)).rejects.toMatchObject({ code: "PRODUCTO_NO_ENCONTRADO", status: 404 });
  });
});

describe("setStock", () => {
  let idProd: number;

  beforeAll(async () => {
    const [h] = await db.insert(t20MProducto).values({
      ...productRow({ nomProducto: "STK PROD", codSerfel: 910 }),
      costoProm: "50.00",
    });
    idProd = h.insertId;
  });

  it("inserts stock when none exists and logs cantidad_antes = NULL", async () => {
    const dto = await setStock(db, idProd, 25, SEED.idUsuario);
    expect(dto.cantidadStock).toBe(25);
    const logs = await db.select().from(t50MStockLog).where(eq(t50MStockLog.idProducto, idProd));
    expect(logs).toHaveLength(1);
    expect(logs[0].cantidadAntes).toBeNull();
    expect(Number(logs[0].cantidadNueva)).toBe(25);
    expect(Number(logs[0].diferencia)).toBe(25);
    expect(logs[0].idUsuario).toBe(SEED.idUsuario);
    expect(logs[0].idBodega).toBe(SEED.bodegaCentral);
  });

  it("updates existing stock and logs the before/after/difference", async () => {
    const dto = await setStock(db, idProd, 10, SEED.idUsuario);
    expect(dto.cantidadStock).toBe(10);
    const logs = await db.select().from(t50MStockLog).where(eq(t50MStockLog.idProducto, idProd));
    const last = logs[logs.length - 1];
    expect(Number(last.cantidadAntes)).toBe(25);
    expect(Number(last.cantidadNueva)).toBe(10);
    expect(Number(last.diferencia)).toBe(-15);
  });

  it("throws PRODUCTO_NO_ENCONTRADO for an unknown id and writes no log", async () => {
    await expect(setStock(db, 888888, 5, SEED.idUsuario)).rejects.toMatchObject({ code: "PRODUCTO_NO_ENCONTRADO", status: 404 });
    const logs = await db.select().from(t50MStockLog).where(eq(t50MStockLog.idProducto, 888888));
    expect(logs).toHaveLength(0);
  });
});
