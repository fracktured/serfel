import { describe, it, expect } from "vitest";
import type { ClienteDto } from "@serfel/shared";
import { sortRows, paginate, computeStats, toCsv } from "./clientes-logic";

function c(over: Partial<ClienteDto>): ClienteDto {
  return {
    rutCliente: 1, dvCliente: "9", rut: "1-9", razonSocial: "Alfa SpA", nomFantasia: "Alfa",
    telefono: null, direccion: "Calle 1", comuna: "Prov", ciudad: "Stgo", email: "a@x.cl",
    idListaPrecio: 1, nomListaPrecio: "Base", permiteVentaDeuda: false, idEstado: 1,
    dias: [], ultFactura: null, ultNotaCredito: null, ...over,
  };
}

describe("sortRows", () => {
  it("sorts by ultFactura numerically", () => {
    const rows = [c({ ultFactura: 5 }), c({ ultFactura: 100 }), c({ ultFactura: null })];
    const sorted = sortRows(rows, { key: "ultFactura", asc: true });
    expect(sorted.map((r) => r.ultFactura)).toEqual([null, 5, 100]);
  });
});

describe("paginate", () => {
  it("slices a page", () => {
    const rows = Array.from({ length: 25 }, (_, i) => c({ rutCliente: i }));
    const p = paginate(rows, 2, 10);
    expect(p.slice).toHaveLength(10);
    expect(p.from).toBe(11);
    expect(p.totalPages).toBe(3);
  });
});

describe("computeStats", () => {
  it("counts total, listas, con deuda and filtrados", () => {
    const all = [c({ idListaPrecio: 1, permiteVentaDeuda: true }), c({ idListaPrecio: 2, permiteVentaDeuda: false })];
    const s = computeStats(all, all);
    expect(s.total).toBe(2);
    expect(s.listasPrecio).toBe(2);
    expect(s.conDeuda).toBe(1);
    expect(s.filtrados).toBeNull();
  });
});

describe("toCsv", () => {
  it("emits a header and one row per cliente", () => {
    const csv = toCsv([c({ razonSocial: "Alfa SpA" })]);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("Razón Social");
  });
});
