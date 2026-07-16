import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t20MProducto, type Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getLookups, listProducts } from "../service";

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
  it("returns marcas, tiposProducto and unidadesMedida as {id, nombre}", async () => {
    const lookups = await getLookups(db);
    expect(lookups.marcas).toEqual([
      { id: SEED.marcaSoprole, nombre: "SOPROLE" },
      { id: SEED.marcaNestle, nombre: "NESTLE" },
    ]);
    expect(lookups.tiposProducto).toEqual([{ id: SEED.tipoYogurt, nombre: "YOGURT" }]);
    expect(lookups.unidadesMedida).toEqual([
      { id: SEED.umUni, nombre: "UNI" },
      { id: SEED.umLt, nombre: "LT" },
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
