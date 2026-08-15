import { describe, it, expect } from "vitest";
import { ClienteCreateSchema, ClienteUpdateSchema } from "./clientes";

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
