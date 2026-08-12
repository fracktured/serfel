import { describe, it, expect } from "vitest";
import { applyFilter, sortRows, computeStats } from "./prefacturacion-logic";
import type { PedidoPendienteDto } from "@serfel/shared";

const row = (over: Partial<PedidoPendienteDto>): PedidoPendienteDto => ({
  idPedido: 1, fecha: "2026-01-01T00:00:00", rutCliente: 55000000, dvCliente: "0",
  nomFantasia: "Fantasia", nomLocal: "Local", contacto: "Juan Lopez", vendedor: "Vera Diaz", precioTotal: 1000,
  ...over,
});

describe("applyFilter", () => {
  const rows = [
    row({ idPedido: 1, nomFantasia: "Almacen Sur" }),
    row({ idPedido: 2, nomFantasia: "Kiosco Norte" }),
  ];
  it("returns all rows for an empty query", () => {
    expect(applyFilter(rows, "").length).toBe(2);
  });
  it("matches by fantasia tokens in any order", () => {
    expect(applyFilter(rows, "sur almacen").map((r) => r.idPedido)).toEqual([1]);
  });
  it("matches by idPedido", () => {
    expect(applyFilter(rows, "2").map((r) => r.idPedido)).toEqual([2]);
  });
});

describe("sortRows", () => {
  const rows = [row({ idPedido: 2, precioTotal: 500 }), row({ idPedido: 1, precioTotal: 900 })];
  it("sorts numeric ascending", () => {
    expect(sortRows(rows, { key: "idPedido", asc: true }).map((r) => r.idPedido)).toEqual([1, 2]);
  });
  it("sorts numeric descending", () => {
    expect(sortRows(rows, { key: "precioTotal", asc: false }).map((r) => r.precioTotal)).toEqual([900, 500]);
  });
});

describe("computeStats", () => {
  it("counts selected against a selection set", () => {
    const rows = [row({ idPedido: 1 }), row({ idPedido: 2 }), row({ idPedido: 3 })];
    const stats = computeStats(rows, new Set([1, 3]));
    expect(stats.total).toBe(3);
    expect(stats.seleccionados).toBe(2);
  });
});
