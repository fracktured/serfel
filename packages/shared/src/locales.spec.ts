import { describe, expect, it } from "vitest";
import { LocalCreateSchema, LocalUpdateSchema } from "./locales";

const validBase = {
  nombre: "Local Centro",
  telefono: "912345678",
  direccion: "Av. Principal 123",
  comuna: "Santiago",
  email: "local@test.cl",
  giro: "Provisiones",
  nomContacto: "Juan",
  apellPatContacto: "Perez",
  apellMatContacto: "Soto",
  telefonoContacto: "998877665",
  emailContacto: "juan@test.cl",
  topeVenta: 0,
  topeCredito: 0,
  idVendedor: 5,
  idFormaPago: 7,
  observaciones: "",
  permiteVentaTopeMensual: false,
};

describe("LocalCreateSchema", () => {
  it("accepts a valid local with rutCliente", () => {
    const r = LocalCreateSchema.safeParse({ ...validBase, rutCliente: 12345678 });
    expect(r.success).toBe(true);
  });
  it("rejects empty nombre", () => {
    const r = LocalCreateSchema.safeParse({ ...validBase, rutCliente: 1, nombre: "" });
    expect(r.success).toBe(false);
  });
  it("rejects a bad email", () => {
    const r = LocalCreateSchema.safeParse({ ...validBase, rutCliente: 1, email: "nope" });
    expect(r.success).toBe(false);
  });
  it("coerces optional blanks to defaults on update", () => {
    const r = LocalUpdateSchema.safeParse({ ...validBase, giro: undefined });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.giro).toBe("");
  });
});
