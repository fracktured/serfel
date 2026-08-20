import { describe, it, expect } from "vitest";
import { PorcionInputSchema, PorcionesQuerySchema, DisponibilidadFilterSchema } from "./porciones";

describe("PorcionInputSchema", () => {
  it("accepts a valid porcion", () => {
    expect(PorcionInputSchema.parse({ numero: 7, cantidad: 0.25 })).toEqual({ numero: 7, cantidad: 0.25 });
  });
  it("rejects numero outside 1..100", () => {
    expect(PorcionInputSchema.safeParse({ numero: 0, cantidad: 1 }).success).toBe(false);
    expect(PorcionInputSchema.safeParse({ numero: 101, cantidad: 1 }).success).toBe(false);
  });
  it("rejects non-positive or >3-decimal cantidad", () => {
    expect(PorcionInputSchema.safeParse({ numero: 1, cantidad: 0 }).success).toBe(false);
    expect(PorcionInputSchema.safeParse({ numero: 1, cantidad: 0.1234 }).success).toBe(false);
  });
});

describe("PorcionesQuerySchema", () => {
  it("coerces string query params and defaults disponibilidad", () => {
    expect(PorcionesQuerySchema.parse({ numero: "5", factura: "900" }))
      .toMatchObject({ numero: 5, factura: 900 });
    expect(DisponibilidadFilterSchema.parse(undefined)).toBe("todas");
  });
  it("rejects an invalid disponibilidad", () => {
    expect(PorcionesQuerySchema.safeParse({ disponibilidad: "nope" }).success).toBe(false);
  });
});
