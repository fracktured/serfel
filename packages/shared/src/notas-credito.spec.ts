import { describe, it, expect } from "vitest";
import { EmitirNcInputSchema, COD_REF_ANULA, COD_REF_CORRIGE_MONTOS, computeNcTotales, buildFlatFile, DTE_NOTA_CREDITO_ELECTRONICA, DTE_FACTURA_ELECTRONICA } from "./notas-credito";

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

describe("buildFlatFile", () => {
  const doc = {
    folio: 501, fecha: "2026-08-20",
    rutReceptor: "76543210-9", rsReceptor: "Cliente SA", giroReceptor: "Comercio",
    dirReceptor: "Calle 1", comReceptor: "Santiago", ciuReceptor: "Santiago", emailReceptor: "a@b.cl",
    totales: { subTotal: 1000, iva: 190, espec: 0, iaba: 0, precioTotal: 1190 },
    lineas: [{ codigo: "P1", descripcion: "Prod 1", cantidad: 1, precio: 1000, porcenDesc: 0, valor: 1000 }],
    referencia: { folioRef: 123, fchRef: "2026-08-01", codRef: COD_REF_ANULA, razonRef: "OTROS" },
  };

  it("emits the credit-note DTE type 61 in the header", () => {
    const output = buildFlatFile(doc);
    expect(output).toContain(`${DTE_NOTA_CREDITO_ELECTRONICA};501;`);
  });

  it("references the original factura electrónica (33) with its folio and CodRef", () => {
    const out = buildFlatFile(doc);
    expect(out).toContain("->Referencia<-");
    expect(out).toContain(`${DTE_FACTURA_ELECTRONICA};123;2026-08-01;${COD_REF_ANULA};OTROS`);
  });

  it("emits one detail line per producto", () => {
    expect(buildFlatFile(doc)).toMatch(/->Detalle<-[\s\S]*P1;Prod 1;1;1000/);
  });
});
