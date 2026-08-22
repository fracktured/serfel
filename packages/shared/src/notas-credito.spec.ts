import { describe, it, expect } from "vitest";
import { EmitirNcInputSchema, COD_REF_ANULA, COD_REF_CORRIGE_MONTOS } from "./notas-credito";

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
