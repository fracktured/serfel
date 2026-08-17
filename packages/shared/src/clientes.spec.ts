import { describe, it, expect } from "vitest";
import { ClienteCreateSchema, ClienteUpdateSchema, ClienteSearchSchema } from "./clientes";

const valid = {
  rut: "12345678-5",
  razonSocial: "Comercial Los Andes SpA",
  nomFantasia: "Los Andes",
  telefono: "+56 9 1234 5678",
  direccion: "Av Siempre Viva 742",
  comuna: "Providencia",
  ciudad: "Santiago",
  email: "contacto@losandes.cl",
  idListaPrecio: 1,
  permiteVentaDeuda: false,
};

describe("ClienteCreateSchema", () => {
  it("accepts a valid cliente", () => {
    expect(ClienteCreateSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an invalid RUT check digit", () => {
    const r = ClienteCreateSchema.safeParse({ ...valid, rut: "12345678-9" });
    expect(r.success).toBe(false);
  });
  it("rejects a missing razon social", () => {
    const r = ClienteCreateSchema.safeParse({ ...valid, razonSocial: "" });
    expect(r.success).toBe(false);
  });
  it("rejects an invalid email", () => {
    const r = ClienteCreateSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });
  it("defaults nomFantasia to empty and permiteVentaDeuda to false", () => {
    const r = ClienteCreateSchema.safeParse({
      rut: "12345678-5", razonSocial: "X SpA", direccion: "Calle 1", idListaPrecio: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.nomFantasia).toBe("");
      expect(r.data.permiteVentaDeuda).toBe(false);
    }
  });
});

describe("ClienteUpdateSchema", () => {
  it("has no rut field", () => {
    expect("rut" in ClienteUpdateSchema.shape).toBe(false);
  });
});

describe("ClienteSearchSchema", () => {
  it("defaults estado to activos and leaves filters undefined", () => {
    const r = ClienteSearchSchema.safeParse({});
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.estado).toBe("activos");
    expect(r.data.rut).toBeUndefined();
    expect(r.data.razonSocial).toBeUndefined();
    expect(r.data.direccion).toBeUndefined();
  });

  it("strips dots from rut to digits", () => {
    const r = ClienteSearchSchema.parse({ rut: "12.345.678" });
    expect(r.rut).toBe("12345678");
  });

  it("drops the DV so a full rut matches the stored body", () => {
    // rutCliente stores only the body (DV is a separate column), so the DV
    // after "-" must be dropped or the LIKE never matches. See rut split note.
    expect(ClienteSearchSchema.parse({ rut: "12452724-4" }).rut).toBe("12452724");
    expect(ClienteSearchSchema.parse({ rut: "11.704.324-K" }).rut).toBe("11704324");
  });

  it("trims razonSocial and direccion, mapping empty to undefined", () => {
    const r = ClienteSearchSchema.parse({ razonSocial: "  espiga  ", direccion: "   " });
    expect(r.razonSocial).toBe("espiga");
    expect(r.direccion).toBeUndefined();
  });

  it("rejects an invalid estado", () => {
    expect(ClienteSearchSchema.safeParse({ estado: "nope" }).success).toBe(false);
  });
});
