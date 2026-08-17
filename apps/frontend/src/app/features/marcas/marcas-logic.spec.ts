import { describe, it, expect } from "vitest";
import { applyFilters, sortRows, paginate, computeStats, toCsv } from "./marcas-logic";
import type { MarcaDto } from "@serfel/shared";

const rows: MarcaDto[] = [
  { idMarca: 1, nomMarca: "SOPROLE", descMarca: "Lacteos", idEstado: 1 },
  { idMarca: 2, nomMarca: "NESTLE", descMarca: "Global", idEstado: 1 },
  { idMarca: 3, nomMarca: "COLUN", descMarca: "Sur", idEstado: 0 },
];

describe("marcas-logic", () => {
  it("applyFilters matches nombre case-insensitively", () => {
    expect(applyFilters(rows, { nombre: "sop", quick: "" }).map((m) => m.idMarca)).toEqual([1]);
  });

  it("applyFilters quick matches nombre or descripcion", () => {
    expect(applyFilters(rows, { nombre: "", quick: "sur" }).map((m) => m.idMarca)).toEqual([3]);
  });

  it("sortRows sorts by nomMarca descending", () => {
    expect(sortRows(rows, { key: "nomMarca", asc: false }).map((m) => m.nomMarca))
      .toEqual(["SOPROLE", "NESTLE", "COLUN"]);
  });

  it("paginate slices and reports bounds", () => {
    const p = paginate(rows, 1, 2);
    expect(p.slice.length).toBe(2);
    expect(p.from).toBe(1);
    expect(p.to).toBe(2);
    expect(p.totalPages).toBe(2);
  });

  it("computeStats reports totals", () => {
    expect(computeStats(rows, [rows[0]])).toEqual({ total: 3, filtrados: 1 });
  });

  it("toCsv includes a header and a row per marca", () => {
    const csv = toCsv(rows);
    expect(csv.split("\n")[0]).toContain("Nombre");
    expect(csv.split("\n").length).toBe(4);
  });
});
