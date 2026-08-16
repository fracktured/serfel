import type { LocalDto } from "@serfel/shared";

export interface LocalFormModel {
  nombre: string; telefono: string; direccion: string; comuna: string; email: string;
  giro: string; nomContacto: string; apellPatContacto: string; apellMatContacto: string;
  telefonoContacto: string; emailContacto: string;
  topeVenta: number; topeCredito: number;
  idVendedor: number | null; idFormaPago: number | null;
  observaciones: string; permiteVentaTopeMensual: boolean;
}

export function emptyLocalForm(): LocalFormModel {
  return {
    nombre: "", telefono: "", direccion: "", comuna: "", email: "",
    giro: "", nomContacto: "", apellPatContacto: "", apellMatContacto: "",
    telefonoContacto: "", emailContacto: "",
    topeVenta: 0, topeCredito: 0, idVendedor: null, idFormaPago: null,
    observaciones: "", permiteVentaTopeMensual: false,
  };
}

export function dtoToForm(dto: LocalDto): LocalFormModel {
  return {
    nombre: dto.nombre, telefono: dto.telefono ?? "", direccion: dto.direccion,
    comuna: dto.comuna, email: dto.email ?? "", giro: dto.giro,
    nomContacto: dto.nomContacto, apellPatContacto: dto.apellPatContacto,
    apellMatContacto: dto.apellMatContacto, telefonoContacto: dto.telefonoContacto ?? "",
    emailContacto: dto.emailContacto ?? "", topeVenta: dto.topeVenta,
    topeCredito: dto.topeCredito, idVendedor: dto.idVendedor, idFormaPago: dto.idFormaPago,
    observaciones: dto.observaciones, permiteVentaTopeMensual: dto.permiteVentaTopeMensual,
  };
}

export function formToInput(m: LocalFormModel): unknown {
  const nn = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    nombre: m.nombre.trim(), telefono: nn(m.telefono), direccion: m.direccion.trim(),
    comuna: m.comuna.trim(), email: nn(m.email), giro: m.giro.trim(),
    nomContacto: m.nomContacto.trim(), apellPatContacto: m.apellPatContacto.trim(),
    apellMatContacto: m.apellMatContacto.trim(), telefonoContacto: nn(m.telefonoContacto),
    emailContacto: nn(m.emailContacto), topeVenta: m.topeVenta, topeCredito: m.topeCredito,
    idVendedor: m.idVendedor, idFormaPago: m.idFormaPago,
    observaciones: m.observaciones.trim(), permiteVentaTopeMensual: m.permiteVentaTopeMensual,
  };
}
