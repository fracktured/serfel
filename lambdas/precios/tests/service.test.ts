import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { listListas, createLista, updateLista, deactivateLista } from "../service";
import { setupPreciosTestDb, SEED } from "./helpers";

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
