import { describe, it, expect, beforeAll } from "vitest";
import { makeTestDb, seedVenta, seedNota, seedFolioRange } from "./helpers";
import { getVentaCreditable, resolveNextFolio } from "../service";

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

  it("sums an existing nota de credito into montoYaCreditado", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 456, precioTotal: 1190 });
    await seedNota(db, { idVenta, precioTotal: 500 });
    const v = await getVentaCreditable(db, idVenta);
    expect(v!.montoYaCreditado).toBe(500);
  });

  it("sums multiple notas de credito against the same venta", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 789, precioTotal: 2000 });
    await seedNota(db, { idVenta, precioTotal: 300 });
    await seedNota(db, { idVenta, precioTotal: 700 });
    const v = await getVentaCreditable(db, idVenta);
    expect(v!.montoYaCreditado).toBe(1000);
  });
});

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
