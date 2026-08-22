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
