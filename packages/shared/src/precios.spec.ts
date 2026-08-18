import { describe, it, expect } from "vitest";
import {
  ListaPrecioInputSchema, PrecioProductoInputSchema, BulkInputSchema,
  computePrecioBase, computeMargen, computePreciosVenta, buildPrecioProductoRow,
  type Tramo,
} from "./precios";

const ZERO_TRAMOS: Tramo[] = [
  { cantidad: 0, maxPorcen: 0 },
  { cantidad: 0, maxPorcen: 0 },
  { cantidad: 0, maxPorcen: 0 },
];

describe("precios schemas", () => {
  it("accepts a valid lista name and rejects empty / too long", () => {
    expect(ListaPrecioInputSchema.safeParse({ nombre: "Mayoristas" }).success).toBe(true);
    expect(ListaPrecioInputSchema.safeParse({ nombre: "" }).success).toBe(false);
    expect(ListaPrecioInputSchema.safeParse({ nombre: "x".repeat(16) }).success).toBe(false);
  });

  it("requires exactly 3 tramos and 0..100 percentages", () => {
    const base = { precioNeto: 1000, maxPorcenDesc: 10, tramos: ZERO_TRAMOS };
    expect(PrecioProductoInputSchema.safeParse(base).success).toBe(true);
    expect(PrecioProductoInputSchema.safeParse({ ...base, maxPorcenDesc: 101 }).success).toBe(false);
    expect(PrecioProductoInputSchema.safeParse({ ...base, tramos: ZERO_TRAMOS.slice(0, 2) }).success).toBe(false);
  });

  it("rejects non-ascending set tramo quantities", () => {
    const tramos: Tramo[] = [
      { cantidad: 10, maxPorcen: 5 },
      { cantidad: 10, maxPorcen: 8 },
      { cantidad: 0, maxPorcen: 0 },
    ];
    const r = PrecioProductoInputSchema.safeParse({ precioNeto: 1000, maxPorcenDesc: 0, tramos });
    expect(r.success).toBe(false);
  });

  it("bulk: valor required except for clearMaxDesc / setTramo", () => {
    expect(BulkInputSchema.safeParse({ action: "clearMaxDesc", idProductos: [1] }).success).toBe(true);
    expect(BulkInputSchema.safeParse({ action: "setPrecioNeto", idProductos: [1] }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ action: "setMaxDesc", valor: 200, idProductos: [1] }).success).toBe(false);
  });

  it("bulk setTramo requires tramo, cantidad and maxPorcen (not valor)", () => {
    const ok = { action: "setTramo", tramo: 2, cantidad: 10, maxPorcen: 15, idProductos: [1] };
    expect(BulkInputSchema.safeParse(ok).success).toBe(true);
    // valor is not required for setTramo
    expect(BulkInputSchema.safeParse({ ...ok, valor: undefined }).success).toBe(true);
    // missing pieces
    expect(BulkInputSchema.safeParse({ ...ok, tramo: undefined }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ ...ok, cantidad: undefined }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ ...ok, maxPorcen: undefined }).success).toBe(false);
    // out of range
    expect(BulkInputSchema.safeParse({ ...ok, tramo: 4 }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ ...ok, tramo: 0 }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ ...ok, maxPorcen: 101 }).success).toBe(false);
    expect(BulkInputSchema.safeParse({ ...ok, cantidad: -1 }).success).toBe(false);
  });
});

describe("pricing math", () => {
  it("precioBase adds rounded taxes", () => {
    expect(computePrecioBase(1000, 19)).toBe(1190);
    expect(computePrecioBase(1000, 39)).toBe(1390); // 19 iva + 20 extra
  });

  it("margen is null when costoProm <= 0, else rounded percent", () => {
    expect(computeMargen(1000, 0, 0)).toBeNull();
    expect(computeMargen(1000, 0, 900)).toBe(11); // (1000/900-1)*100
    expect(computeMargen(1000, 10, 900)).toBe(0);  // (900/900-1)*100
  });

  it("computePreciosVenta yields only V1 when no tramos set", () => {
    const vals = computePreciosVenta({
      precioNeto: 1000, maxPorcenDesc: 10, tramos: ZERO_TRAMOS, costoProm: 900, impuestosPorcen: 19,
    });
    expect(vals).toHaveLength(1);
    expect(vals[0].precioVenta).toBe(1071); // round(1190*0.9)
  });

  it("computePreciosVenta adds a value per set tramo", () => {
    const tramos: Tramo[] = [
      { cantidad: 10, maxPorcen: 15 },
      { cantidad: 50, maxPorcen: 20 },
      { cantidad: 0, maxPorcen: 0 },
    ];
    const vals = computePreciosVenta({
      precioNeto: 1000, maxPorcenDesc: 10, tramos, costoProm: 900, impuestosPorcen: 19,
    });
    expect(vals.map((v) => v.etiqueta)).toEqual(["1+", "≥10", "≥50"]);
    expect(vals[2].precioVenta).toBe(952); // round(1190*0.8)
  });

  it("buildPrecioProductoRow flags bajoCosto when a tier sells below cost", () => {
    const row = buildPrecioProductoRow({
      idProducto: 1, codSerfel: 100, nomProducto: "P", costoProm: 1000,
      precioNeto: 1000, maxPorcenDesc: 0,
      tramos: [{ cantidad: 10, maxPorcen: 30 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
      impuestosPorcen: 19,
    });
    expect(row.bajoCosto).toBe(true); // round(1190*0.7)=833 < 1000
    expect(row.preciosVenta).toHaveLength(2);
  });
});
