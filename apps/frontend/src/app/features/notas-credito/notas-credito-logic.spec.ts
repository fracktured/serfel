import { describe, it, expect } from "vitest";
import { anularLineas, previewTotal } from "./notas-credito-logic";
import type { VentaCreditableDto } from "@serfel/shared";

const venta: VentaCreditableDto = {
  idVenta: 1, idFolio: 10, numDoctoEmitido: 10, fechaVenta: "2026-08-01 00:00:00",
  rutEmpresa: 8030856, rutCliente: 76, nomCliente: "C", precioTotal: 1190, montoYaCreditado: 0,
  lineas: [{ idProducto: 2, codSerfel: 2, descripcion: "d", cantidad: 2, precio: 500, porcenDesc: 0, impuesto: 3 }],
};

describe("notas-credito-logic", () => {
  it("anularLineas mirrors every venta line at full quantity with restituirStock true", () => {
    const lines = anularLineas(venta);
    expect(lines).toEqual([
      { idProducto: 2, cantidad: 2, precio: 500, porcenDesc: 0, restituirStock: true },
    ]);
  });

  it("previewTotal applies IVA to the selected lines", () => {
    expect(previewTotal(anularLineas(venta), venta, 19)).toBe(1190);
  });

  it("previewTotal ignores restituirStock when computing totals", () => {
    const soloPrecio = anularLineas(venta).map((l) => ({ ...l, restituirStock: false }));
    expect(previewTotal(soloPrecio, venta, 19)).toBe(1190);
  });
});
