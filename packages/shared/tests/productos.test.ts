import { describe, it, expect } from "vitest";
import {
  ESTADO_ACTIVO,
  ESTADO_INACTIVO,
  EstadoFilterSchema,
  ProductoInputSchema,
} from "../src/productos";

describe("estado constants", () => {
  it("matches legacy 99_p_estado values (1=Activo, 0=Inactivo)", () => {
    expect(ESTADO_ACTIVO).toBe(1);
    expect(ESTADO_INACTIVO).toBe(0);
  });
});

describe("EstadoFilterSchema", () => {
  it("defaults to activos when undefined", () => {
    expect(EstadoFilterSchema.parse(undefined)).toBe("activos");
  });
  it("accepts the three values", () => {
    expect(EstadoFilterSchema.parse("inactivos")).toBe("inactivos");
    expect(EstadoFilterSchema.parse("todos")).toBe("todos");
  });
  it("rejects anything else", () => {
    expect(EstadoFilterSchema.safeParse("x").success).toBe(false);
  });
});

describe("ProductoInputSchema", () => {
  const valid = {
    codSerfel: 311,
    nomProducto: "YOG.BATIDO SOPR 165grs",
    idMarca: 1,
    idUm: 1,
    idTipoProducto: 1,
    impuesto: 0,
    usaPorciones: 0,
  };

  it("accepts a valid input", () => {
    expect(ProductoInputSchema.parse(valid)).toEqual(valid);
  });
  it("trims the name", () => {
    expect(
      ProductoInputSchema.parse({ ...valid, nomProducto: "  X  " }).nomProducto
    ).toBe("X");
  });
  it("rejects empty name, non-positive codSerfel, missing fields", () => {
    expect(ProductoInputSchema.safeParse({ ...valid, nomProducto: "  " }).success).toBe(false);
    expect(ProductoInputSchema.safeParse({ ...valid, codSerfel: 0 }).success).toBe(false);
    expect(ProductoInputSchema.safeParse({ ...valid, codSerfel: 1.5 }).success).toBe(false);
    const { idMarca: _omit, ...missing } = valid;
    expect(ProductoInputSchema.safeParse(missing).success).toBe(false);
    expect(ProductoInputSchema.safeParse({ ...valid, idTipoProducto: -1 }).success).toBe(false);
  });
  it("accepts idTipoProducto 0 (legacy 'SIN TIPO' row)", () => {
    expect(ProductoInputSchema.safeParse({ ...valid, idTipoProducto: 0 }).success).toBe(true);
  });
  it("accepts impuesto 0 (Sin Imp. Adicional) and rejects negative", () => {
    expect(ProductoInputSchema.safeParse({ ...valid, impuesto: 0 }).success).toBe(true);
    expect(ProductoInputSchema.safeParse({ ...valid, impuesto: -1 }).success).toBe(false);
  });
  it("accepts usaPorciones 0 or 1, rejects anything else", () => {
    expect(ProductoInputSchema.safeParse({ ...valid, usaPorciones: 1 }).success).toBe(true);
    expect(ProductoInputSchema.safeParse({ ...valid, usaPorciones: 2 }).success).toBe(false);
  });
  it("rejects names longer than 200 chars", () => {
    expect(
      ProductoInputSchema.safeParse({ ...valid, nomProducto: "a".repeat(201) }).success
    ).toBe(false);
  });
});
