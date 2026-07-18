import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t20MProducto, type Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getLookups, listProducts, createProduct, updateProduct, deactivateProduct, restoreProduct, getUserTipo, getMe } from "../service";

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
    // label carries the rate; ordered by raw name (IVA before Sin Imp.)
    expect(lookups.impuestos).toEqual([
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
      modulos: ["productos"],
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
