import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { AppError } from "../errors";
import {
  listMarcas, createMarca, updateMarca, deactivateMarca, restoreMarca,
} from "../service";
import { setupTestDb } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_test_marcas_service"));
});
afterAll(async () => { await teardown(); });

describe("marcas service", () => {
  it("creates a marca and lists it among activos", async () => {
    const created = await createMarca(db, { nomMarca: "SOPROLE", descMarca: "Lacteos" });
    expect(created.idMarca).toBeGreaterThan(0);
    expect(created.idEstado).toBe(1);

    const activos = await listMarcas(db, "activos");
    expect(activos.map((m) => m.nomMarca)).toContain("SOPROLE");
  });

  it("rejects a duplicate active name with NOMBRE_EN_USO", async () => {
    await createMarca(db, { nomMarca: "NESTLE", descMarca: "" });
    await expect(createMarca(db, { nomMarca: "nestle", descMarca: "" }))
      .rejects.toMatchObject({ code: "NOMBRE_EN_USO" });
  });

  it("updates a marca", async () => {
    const created = await createMarca(db, { nomMarca: "COLUN", descMarca: "" });
    const updated = await updateMarca(db, created.idMarca, { nomMarca: "COLUN SA", descMarca: "Sur" });
    expect(updated.nomMarca).toBe("COLUN SA");
    expect(updated.descMarca).toBe("Sur");
  });

  it("throws MARCA_NO_ENCONTRADA updating a missing id", async () => {
    await expect(updateMarca(db, 999999, { nomMarca: "X", descMarca: "" }))
      .rejects.toMatchObject({ code: "MARCA_NO_ENCONTRADA" });
  });

  it("soft-deletes then restores, and a deleted name frees up for reuse", async () => {
    const created = await createMarca(db, { nomMarca: "WATTS", descMarca: "" });
    const deleted = await deactivateMarca(db, created.idMarca);
    expect(deleted.idEstado).toBe(0);
    expect((await listMarcas(db, "activos")).map((m) => m.nomMarca)).not.toContain("WATTS");
    expect((await listMarcas(db, "inactivos")).map((m) => m.nomMarca)).toContain("WATTS");

    // name is free while the original is inactive
    const reused = await createMarca(db, { nomMarca: "WATTS", descMarca: "nueva" });
    expect(reused.idEstado).toBe(1);

    // restoring the original now clashes with the active reuse
    await expect(restoreMarca(db, created.idMarca))
      .rejects.toMatchObject({ code: "NOMBRE_EN_USO" });
  });
});
