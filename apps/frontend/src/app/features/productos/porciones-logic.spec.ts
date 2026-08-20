import { describe, it, expect } from "vitest";
import { disponibilidadLabel, buildPorcionesQuery } from "./porciones-logic";

describe("disponibilidadLabel", () => {
  it("maps to Spanish labels", () => {
    expect(disponibilidadLabel("disponible")).toBe("Disponible");
    expect(disponibilidadLabel("asignado")).toBe("Asignado");
  });
});

describe("buildPorcionesQuery", () => {
  it("omits blank fields and coerces numbers", () => {
    expect(buildPorcionesQuery({ numero: "", factura: "", disponibilidad: "todas" }))
      .toEqual({ disponibilidad: "todas" });
    expect(buildPorcionesQuery({ numero: "7", factura: "900", disponibilidad: "asignado" }))
      .toEqual({ numero: 7, factura: 900, disponibilidad: "asignado" });
  });
  it("ignores non-numeric numero/factura", () => {
    expect(buildPorcionesQuery({ numero: "abc", factura: "", disponibilidad: "todas" }))
      .toEqual({ disponibilidad: "todas" });
  });
});
