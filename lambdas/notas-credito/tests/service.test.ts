import { describe, it, expect, beforeAll } from "vitest";
import { makeTestDb, seedVenta, seedNota, seedFolioRange, stockOf, ultFolioOf, SEED } from "./helpers";
import { getVentaCreditable, resolveNextFolio, emitirNotaCredito } from "../service";
import { COD_REF_ANULA, COD_REF_CORRIGE_MONTOS } from "@serfel/shared";

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

const emisorOk = async () => ({ ok: true, folio: 500, urlPdfOriginal: "http://o", urlPdfCedible: "http://c" });

describe("emitirNotaCredito", () => {
  it("anula: inserts NC + prod rows, marks electrónica, restitutes stock, bumps ult_folio", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 123, precioTotal: 1190 });
    await seedFolioRange(db, { rutEmpresa: SEED.empresaTarget, idTipoDocto: 11, folioDesde: 500, folioHasta: 600, ultFolio: 0 });
    const venta = (await getVentaCreditable(db, idVenta))!;
    const before = await stockOf(db, venta.lineas[0].idProducto);

    const res = await emitirNotaCredito(db, emisorOk, {
      idVenta, idMotivo: 5, codRef: COD_REF_ANULA,
      lineas: venta.lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc })),
    }, 1);

    expect(res.esElectronica).toBe(true);
    expect(res.idFolio).toBe(500);
    expect(await stockOf(db, venta.lineas[0].idProducto)).toBe(before + venta.lineas[0].cantidad);
    expect(await ultFolioOf(db, SEED.empresaTarget)).toBe(500);
  });

  it("blocks a second NC once the venta is fully credited", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 200, precioTotal: 1190 });
    await seedNota(db, { idVenta, precioTotal: 1190 }); // already fully credited
    await seedFolioRange(db, { rutEmpresa: SEED.empresaTarget, idTipoDocto: 11, folioDesde: 700, folioHasta: 800, ultFolio: 0 });
    const venta = (await getVentaCreditable(db, idVenta))!;
    await expect(emitirNotaCredito(db, emisorOk, {
      idVenta, idMotivo: 5, codRef: COD_REF_ANULA,
      lineas: venta.lineas.map((l) => ({ idProducto: l.idProducto, cantidad: l.cantidad, precio: l.precio, porcenDesc: l.porcenDesc })),
    }, 1)).rejects.toThrow();
  });

  it("leaves a retryable pendiente NC (no stock change) when the emisor fails", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 300, precioTotal: 1190 });
    await seedFolioRange(db, { rutEmpresa: SEED.empresaTarget, idTipoDocto: 11, folioDesde: 900, folioHasta: 999, ultFolio: 0 });
    const venta = (await getVentaCreditable(db, idVenta))!;
    const before = await stockOf(db, venta.lineas[0].idProducto);
    const emisorFail = async () => ({ ok: false, error: "SII rechazó" });
    await expect(emitirNotaCredito(db, emisorFail, {
      idVenta, idMotivo: 5, codRef: COD_REF_CORRIGE_MONTOS,
      lineas: [{ idProducto: venta.lineas[0].idProducto, cantidad: venta.lineas[0].cantidad, precio: 1, porcenDesc: 0 }],
    }, 1)).rejects.toThrow();
    expect(await stockOf(db, venta.lineas[0].idProducto)).toBe(before); // unchanged
    expect(await ultFolioOf(db, SEED.empresaTarget)).toBe(0); // not bumped
  });
});
