import { describe, it, expect } from "vitest";
import type { ProductoDto } from "@serfel/shared";
import {
  applyFilters,
  sortRows,
  paginate,
  toCsv,
  computeStats,
} from "./productos-logic";

function p(over: Partial<ProductoDto>): ProductoDto {
  return {
    idProducto: 1, codSerfel: 100, nomProducto: "YOGURT X", idMarca: 1,
    nomMarca: "SOPROLE", idUm: 1, nomUm: "UNI", idTipoProducto: 1,
    nomTipoProducto: "YOGURT", idEstado: 1, ...over,
  };
}

const rows = [
  p({ idProducto: 1, codSerfel: 311, nomProducto: "YOG.BATIDO", idMarca: 1, nomMarca: "SOPROLE" }),
  p({ idProducto: 2, codSerfel: 422, nomProducto: "LECHE ENTERA", idMarca: 3, nomMarca: "COLUN" }),
  p({ idProducto: 3, codSerfel: 610, nomProducto: "NESQUIK", idMarca: 2, nomMarca: "NESTLE" }),
];

describe("applyFilters", () => {
  const none = { codigo: "", nombre: "", idMarca: null, quick: "" };
  it("passes everything with empty filters", () => {
    expect(applyFilters(rows, none)).toHaveLength(3);
  });
  it("filters by codigo substring, nombre and marca", () => {
    expect(applyFilters(rows, { ...none, codigo: "31" })).toHaveLength(1);
    expect(applyFilters(rows, { ...none, nombre: "leche" })).toHaveLength(1);
    expect(applyFilters(rows, { ...none, idMarca: 2 })).toHaveLength(1);
  });
  it("quick search matches nombre, codigo or marca", () => {
    expect(applyFilters(rows, { ...none, quick: "colun" })).toHaveLength(1);
    expect(applyFilters(rows, { ...none, quick: "610" })).toHaveLength(1);
  });
  it("nombre matches loose multi-token queries ignoring punctuation and order", () => {
    const soprole = [p({ nomProducto: "YOG.BATIDO SOPR 165grs" })];
    expect(applyFilters(soprole, { ...none, nombre: "YOG BAT 165" })).toHaveLength(1);
    expect(applyFilters(soprole, { ...none, nombre: "165 BATIDO" })).toHaveLength(1);
    expect(applyFilters(soprole, { ...none, nombre: "leche" })).toHaveLength(0);
  });
});

describe("sortRows", () => {
  it("sorts numerically by codSerfel and alphabetically by name", () => {
    expect(sortRows(rows, { key: "codSerfel", asc: false })[0].codSerfel).toBe(610);
    expect(sortRows(rows, { key: "nomProducto", asc: true })[0].nomProducto).toBe("LECHE ENTERA");
  });
  it("does not mutate the input", () => {
    const before = rows.map((r) => r.idProducto);
    sortRows(rows, { key: "codSerfel", asc: false });
    expect(rows.map((r) => r.idProducto)).toEqual(before);
  });
});

describe("paginate", () => {
  const many = Array.from({ length: 23 }, (_, i) => i + 1);
  it("slices pages and reports ranges", () => {
    expect(paginate(many, 1, 10)).toMatchObject({ totalPages: 3, from: 1, to: 10 });
    expect(paginate(many, 3, 10).slice).toEqual([21, 22, 23]);
  });
  it("clamps out-of-range pages and handles empty", () => {
    expect(paginate(many, 99, 10).page).toBe(3);
    expect(paginate([], 1, 10)).toMatchObject({ totalPages: 1, from: 0, to: 0, slice: [] });
  });
});

describe("toCsv", () => {
  it("emits semicolon-separated quoted CSV with header", () => {
    const csv = toCsv([p({ nomProducto: 'CON "COMILLAS"' })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Nº";"Nombre";"Marca";"UM";"Tipo";"Estado"');
    expect(lines[1]).toContain('"CON ""COMILLAS"""');
    expect(lines[1]).toContain('"Activo"');
  });
});

describe("computeStats", () => {
  it("counts totals and distincts; filtrados null when nothing filtered", () => {
    expect(computeStats(rows, rows)).toEqual({ total: 3, marcas: 3, tipos: 1, filtrados: null });
    expect(computeStats(rows, rows.slice(0, 1)).filtrados).toBe(1);
  });
});
