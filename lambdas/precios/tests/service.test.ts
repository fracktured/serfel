import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import type { Db } from "@serfel/db";
import { t40MPrecioProducto } from "@serfel/db";
import { listListas, createLista, updateLista, deactivateLista, getGrid, upsertPrecioProducto, bulkApply } from "../service";
import { setupPreciosTestDb, SEED, seedLista } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupPreciosTestDb("serfel_test_precios_service"));
});
afterAll(async () => { await teardown(); });

describe("listas de precio CRUD", () => {
  it("creates the first lista with id 1 and lists it", async () => {
    const created = await createLista(db, { nombre: "Mayoristas" }, SEED.idUsuario);
    expect(created.idListaPrecio).toBe(1);
    expect(created.idEstado).toBe(1);
    expect((await listListas(db)).map((l) => l.nombre)).toContain("Mayoristas");
  });

  it("assigns MAX+1 for the next lista", async () => {
    const created = await createLista(db, { nombre: "Minoristas" }, SEED.idUsuario);
    expect(created.idListaPrecio).toBe(2);
  });

  it("rejects a duplicate active name", async () => {
    await expect(createLista(db, { nombre: "Mayoristas" }, SEED.idUsuario))
      .rejects.toMatchObject({ code: "NOMBRE_EN_USO" });
  });

  it("renames a lista", async () => {
    const created = await createLista(db, { nombre: "Temporal" }, SEED.idUsuario);
    const renamed = await updateLista(db, created.idListaPrecio, { nombre: "Definitiva" }, SEED.idUsuario);
    expect(renamed.nombre).toBe("Definitiva");
  });

  it("deactivate then re-create reactivates the same id", async () => {
    const created = await createLista(db, { nombre: "Reciclable" }, SEED.idUsuario);
    const del = await deactivateLista(db, created.idListaPrecio, SEED.idUsuario);
    expect(del.idEstado).toBe(0);
    expect((await listListas(db)).map((l) => l.nombre)).not.toContain("Reciclable");
    const again = await createLista(db, { nombre: "Reciclable" }, SEED.idUsuario);
    expect(again.idListaPrecio).toBe(created.idListaPrecio); // reactivated, not a new id
    expect(again.idEstado).toBe(1);
  });

  it("throws LISTA_NO_ENCONTRADA renaming a missing id", async () => {
    await expect(updateLista(db, 999, { nombre: "X" }, SEED.idUsuario))
      .rejects.toMatchObject({ code: "LISTA_NO_ENCONTRADA" });
  });
});

describe("grid + pricing writes", () => {
  const LISTA = 50;
  beforeAll(async () => { await seedLista(db, LISTA, "Grid"); });

  it("grid returns a row per active product, unpriced products default to 0", async () => {
    const rows = await getGrid(db, LISTA);
    expect(rows).toHaveLength(2);
    const barato = rows.find((r) => r.idProducto === SEED.prodBarato)!;
    expect(barato.precioNeto).toBe(0);
    expect(barato.preciosVenta).toHaveLength(1); // no tramos
    expect(barato.impuestosPorcen).toBe(19); // producto.impuesto = 0
    const caro = rows.find((r) => r.idProducto === SEED.prodCaro)!;
    expect(caro.impuestosPorcen).toBe(39); // 19 iva + 20 extra
  });

  it("upsert sets precio_neto, derives precio, stores tramos, and re-reads", async () => {
    const updated = await upsertPrecioProducto(db, LISTA, SEED.prodBarato, {
      precioNeto: 1000, maxPorcenDesc: 10,
      tramos: [{ cantidad: 10, maxPorcen: 15 }, { cantidad: 50, maxPorcen: 20 }, { cantidad: 0, maxPorcen: 0 }],
    });
    expect(updated.precioBase).toBe(1190);
    expect(updated.preciosVenta.map((v) => v.etiqueta)).toEqual(["1+", "≥10", "≥50"]);

    // persisted: a second read reflects it
    const rows = await getGrid(db, LISTA);
    const barato = rows.find((r) => r.idProducto === SEED.prodBarato)!;
    expect(barato.precioNeto).toBe(1000);
    expect(barato.tramos[1].cantidad).toBe(50);
  });

  it("upsert never writes porcen_desc (stays 0)", async () => {
    await upsertPrecioProducto(db, LISTA, SEED.prodCaro, {
      precioNeto: 5000, maxPorcenDesc: 5,
      tramos: [{ cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
    });
    // assert the dead column directly via a select on the raw table
    const rows = await db.select({ pd: t40MPrecioProducto.porcenDesc })
      .from(t40MPrecioProducto)
      .where(and(
        eq(t40MPrecioProducto.idListaPrecio, LISTA),
        eq(t40MPrecioProducto.idProducto, SEED.prodCaro),
      ));
    expect(rows[0].pd).toBe(0);
  });

  it("bulk setPrecioNeto applies to all listed products", async () => {
    const affected = await bulkApply(db, LISTA, {
      action: "setPrecioNeto", valor: 2000, idProductos: [SEED.prodBarato, SEED.prodCaro],
    });
    expect(affected.every((r) => r.precioNeto === 2000)).toBe(true);
  });

  it("bulk clearMaxDesc zeroes max_porcen_desc", async () => {
    await upsertPrecioProducto(db, LISTA, SEED.prodBarato, {
      precioNeto: 1000, maxPorcenDesc: 30,
      tramos: [{ cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
    });
    const affected = await bulkApply(db, LISTA, {
      action: "clearMaxDesc", idProductos: [SEED.prodBarato],
    });
    expect(affected[0].maxPorcenDesc).toBe(0);
  });

  it("bulk setTramo updates the target tramo and preserves the others", async () => {
    await upsertPrecioProducto(db, LISTA, SEED.prodBarato, {
      precioNeto: 1000, maxPorcenDesc: 10,
      tramos: [{ cantidad: 10, maxPorcen: 15 }, { cantidad: 50, maxPorcen: 20 }, { cantidad: 0, maxPorcen: 0 }],
    });
    await bulkApply(db, LISTA, {
      action: "setTramo", tramo: 2, cantidad: 99, maxPorcen: 33, idProductos: [SEED.prodBarato],
    });
    const rows = await getGrid(db, LISTA);
    const barato = rows.find((r) => r.idProducto === SEED.prodBarato)!;
    expect(barato.tramos[1]).toEqual({ cantidad: 99, maxPorcen: 33 });
    expect(barato.tramos[0]).toEqual({ cantidad: 10, maxPorcen: 15 });
    expect(barato.tramos[2]).toEqual({ cantidad: 0, maxPorcen: 0 });
    // untouched scalar fields survive
    expect(barato.precioNeto).toBe(1000);
    expect(barato.maxPorcenDesc).toBe(10);
  });

  it("bulk setTramo upserts a row for a product not yet in the list", async () => {
    const FRESH = 51;
    await seedLista(db, FRESH, "TramoFresh");
    await bulkApply(db, FRESH, {
      action: "setTramo", tramo: 1, cantidad: 5, maxPorcen: 12, idProductos: [SEED.prodCaro],
    });
    const rows = await getGrid(db, FRESH);
    const caro = rows.find((r) => r.idProducto === SEED.prodCaro)!;
    expect(caro.tramos[0]).toEqual({ cantidad: 5, maxPorcen: 12 });
    expect(caro.precioNeto).toBe(0); // inserted fresh, no price set
  });

  it("getGrid throws LISTA_NO_ENCONTRADA for a missing list", async () => {
    await expect(getGrid(db, 9999)).rejects.toMatchObject({ code: "LISTA_NO_ENCONTRADA" });
  });
});
