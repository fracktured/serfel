import { describe, it, expect } from "vitest";
import { isDisponible, nextNumero, numeroOcupado, pickGrupo } from "../porciones";

describe("isDisponible", () => {
  it("treats null and 0 as disponible, any positive id as asignado", () => {
    expect(isDisponible(null)).toBe(true);
    expect(isDisponible(0)).toBe(true);
    expect(isDisponible(42)).toBe(false);
  });
});

describe("nextNumero", () => {
  it("is 1 when there are no porciones", () => {
    expect(nextNumero([])).toBe(1);
  });
  it("is top-of-(grupo,numero) + 1", () => {
    expect(nextNumero([{ grupo: 1, numero: 4 }, { grupo: 1, numero: 7 }])).toBe(8);
    expect(nextNumero([{ grupo: 1, numero: 99 }, { grupo: 2, numero: 3 }])).toBe(4);
  });
  it("wraps to 1 after 100", () => {
    expect(nextNumero([{ grupo: 2, numero: 100 }])).toBe(1);
  });
});

describe("numeroOcupado", () => {
  it("is true only when a DISPONIBLE piece already uses the numero", () => {
    const rows = [
      { numero: 5, idVenta: null },   // disponible
      { numero: 6, idVenta: 900 },    // asignado
    ];
    expect(numeroOcupado(rows, 5)).toBe(true);
    expect(numeroOcupado(rows, 6)).toBe(false); // sold piece does not block
    expect(numeroOcupado(rows, 7)).toBe(false);
  });
});

describe("pickGrupo", () => {
  it("is 1 for the first piece", () => {
    expect(pickGrupo([], 1)).toBe(1);
  });
  it("stays in the max grupo when the numero is free there", () => {
    expect(pickGrupo([{ grupo: 1, numero: 1 }], 2)).toBe(1);
  });
  it("bumps to maxGrupo + 1 when the numero already exists in the max grupo", () => {
    expect(pickGrupo([{ grupo: 1, numero: 1 }], 1)).toBe(2);
    expect(pickGrupo([{ grupo: 3, numero: 5 }, { grupo: 3, numero: 1 }], 1)).toBe(4);
  });
});
