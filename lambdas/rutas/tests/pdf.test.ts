import { describe, it, expect } from "vitest";
import { renderCargoListPdf } from "../pdf";
import type { CargoListData } from "../types";

const sample: CargoListData = {
  nomRutas: "Ruta Norte, Ruta Sur",
  rows: [
    { idProducto: 1, codSerfel: 100, nomProducto: "Agua", nomUm: "UNI", nomTipoProducto: "BEBIDAS", sumCantidad: "5.00", subtotal: 2500, obs: [] },
    { idProducto: 2, codSerfel: 200, nomProducto: "Leche", nomUm: "UNI", nomTipoProducto: "LACTEOS", sumCantidad: "1.00", subtotal: 720, obs: [5] },
  ],
  totals: { numFacturas: 2, total: 3000 },
};

describe("renderCargoListPdf", () => {
  it("returns PDF bytes for a multi-tipo document", async () => {
    const bytes = await renderCargoListPdf(sample);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // PDF magic number "%PDF"
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it("handles an empty document (no rows)", async () => {
    const bytes = await renderCargoListPdf({ nomRutas: "Ruta X", rows: [], totals: { numFacturas: 0, total: 0 } });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
