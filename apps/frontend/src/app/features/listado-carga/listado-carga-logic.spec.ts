import { describe, it, expect } from "vitest";
import type { RutaDto } from "@serfel/shared";
import { toggleSelection, allSelected, selectedRutas, parseApiErrorText } from "./listado-carga-logic";

const routes: RutaDto[] = [
  { idRuta: 1, nomRuta: "Norte", idUsuario: 1, numDia: 1, idEstado: 1 },
  { idRuta: 2, nomRuta: "Sur", idUsuario: 1, numDia: 2, idEstado: 1 },
];

describe("toggleSelection", () => {
  it("adds an id that is not present and removes one that is", () => {
    const a = toggleSelection(new Set(), 1);
    expect([...a]).toEqual([1]);
    const b = toggleSelection(a, 1);
    expect([...b]).toEqual([]);
  });
  it("does not mutate the input set", () => {
    const input = new Set([1]);
    toggleSelection(input, 2);
    expect([...input]).toEqual([1]);
  });
});

describe("allSelected", () => {
  it("is true only when every route id is selected", () => {
    expect(allSelected(routes, new Set([1, 2]))).toBe(true);
    expect(allSelected(routes, new Set([1]))).toBe(false);
    expect(allSelected([], new Set())).toBe(false);
  });
});

describe("selectedRutas", () => {
  it("returns {idRuta, nomRuta} for selected routes only", () => {
    expect(selectedRutas(routes, new Set([2]))).toEqual([{ idRuta: 2, nomRuta: "Sur" }]);
  });
});

describe("parseApiErrorText", () => {
  it("returns the error object for a valid API error JSON string", () => {
    const text = JSON.stringify({ error: { code: "DB_NO_DISPONIBLE", message: "La base de datos no está disponible." } });
    expect(parseApiErrorText(text)).toEqual({ code: "DB_NO_DISPONIBLE", message: "La base de datos no está disponible." });
  });

  it("returns null for a plain non-JSON string", () => {
    expect(parseApiErrorText("not json")).toBeNull();
  });

  it("returns null for a JSON object without error.code", () => {
    expect(parseApiErrorText(JSON.stringify({ foo: "bar" }))).toBeNull();
  });
});
