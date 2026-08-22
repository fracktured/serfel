import { describe, it, expect } from "vitest";
import { EmitirNcInputSchema, COD_REF_ANULA, COD_REF_CORRIGE_MONTOS, computeNcTotales } from "./notas-credito";

describe("EmitirNcInputSchema", () => {
  it("accepts a valid corrige-montos NC", () => {
    const r = EmitirNcInputSchema.safeParse({
      idVenta: 5, idMotivo: 1, codRef: COD_REF_CORRIGE_MONTOS,
      lineas: [{ idProducto: 2, cantidad: 1, precio: 1000, porcenDesc: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty lineas array", () => {
    const r = EmitirNcInputSchema.safeParse({ idVenta: 5, idMotivo: 1, codRef: COD_REF_ANULA, lineas: [] });
    expect(r.success).toBe(false);
  });

  it("rejects codRef 2 (corrige texto, out of scope)", () => {
    const r = EmitirNcInputSchema.safeParse({
      idVenta: 5, idMotivo: 1, codRef: 2,
      lineas: [{ idProducto: 2, cantidad: 1, precio: 1000, porcenDesc: 0 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("computeNcTotales", () => {
  const opts = { ivaValor: 19, especValor: 0, rateOf: () => null };

  it("sums neto with discount and applies IVA", () => {
    // 2 * 1000 = 2000, 10% desc -> 1800, IVA 19% -> 342
    const t = computeNcTotales([{ cantidad: 2, precio: 1000, porcenDesc: 10, impuesto: 3 }], opts);
    expect(t.subTotal).toBe(1800);
    expect(t.iva).toBe(342);
    expect(t.precioTotal).toBe(2142);
  });

  it("applies the ESPEC rate to espec-taxed products", () => {
    const t = computeNcTotales(
      [{ cantidad: 1, precio: 1000, porcenDesc: 0, impuesto: 2 }],
      { ivaValor: 19, especValor: 12, rateOf: () => null },
    );
    expect(t.espec).toBe(120);
    expect(t.precioTotal).toBe(1000 + 120 + 0 + 190);
  });
});
