import { describe, expect, it } from "vitest";
import { emptyLocalForm, dtoToForm, formToInput } from "./locales-logic";
import type { LocalDto } from "@serfel/shared";

describe("locales-logic", () => {
  it("emptyLocalForm has blank strings and numeric defaults", () => {
    const m = emptyLocalForm();
    expect(m.nombre).toBe("");
    expect(m.topeVenta).toBe(0);
    expect(m.permiteVentaTopeMensual).toBe(false);
  });

  it("formToInput trims and maps blank nullable fields to null", () => {
    const m = { ...emptyLocalForm(), nombre: " Centro ", direccion: "Dir 1", telefono: "", email: "" };
    const input = formToInput(m) as Record<string, unknown>;
    expect(input.nombre).toBe("Centro");
    expect(input.telefono).toBeNull();
    expect(input.email).toBeNull();
  });

  it("dtoToForm round-trips a DTO into an editable model", () => {
    const dto = { idLocalCliente: 3, rutCliente: 1, nombre: "N", telefono: null,
      direccion: "D", comuna: "C", email: null, giro: "G", nomContacto: "",
      apellPatContacto: "", apellMatContacto: "", telefonoContacto: null,
      emailContacto: null, topeVenta: 5, topeCredito: 6, idVendedor: 2,
      nomVendedor: "V", idFormaPago: 7, nomFormaPago: "F", observaciones: "",
      permiteVentaTopeMensual: true, idEstado: 1 } as LocalDto;
    const m = dtoToForm(dto);
    expect(m.nombre).toBe("N");
    expect(m.telefono).toBe("");
    expect(m.idFormaPago).toBe(7);
    expect(m.permiteVentaTopeMensual).toBe(true);
  });
});
