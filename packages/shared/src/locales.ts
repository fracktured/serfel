import { z } from "zod";

const REQUIRED = (max: number) => z.string().trim().min(1).max(max);
const OPTTEXT = (max: number) => z.string().trim().max(max);

/** Fields common to create and update (everything except rutCliente / id). */
const localBase = {
  nombre: REQUIRED(30),
  telefono: z.string().trim().max(15).nullable().default(null),
  direccion: REQUIRED(200),
  comuna: OPTTEXT(20).default(""),
  email: z.string().trim().email().max(50).nullable().default(null),
  giro: OPTTEXT(30).default(""),
  nomContacto: OPTTEXT(50).default(""),
  apellPatContacto: OPTTEXT(30).default(""),
  apellMatContacto: OPTTEXT(30).default(""),
  telefonoContacto: z.string().trim().max(15).nullable().default(null),
  emailContacto: z.string().trim().email().max(50).nullable().default(null),
  topeVenta: z.number().int().min(0).default(0),
  topeCredito: z.number().int().min(0).default(0),
  idVendedor: z.number().int().positive(),
  idFormaPago: z.number().int().positive(),
  observaciones: OPTTEXT(200).default(""),
  permiteVentaTopeMensual: z.boolean().default(false),
};

export const LocalCreateSchema = z.object({
  rutCliente: z.number().int().positive(),
  ...localBase,
});
export type LocalCreateInput = z.infer<typeof LocalCreateSchema>;

export const LocalUpdateSchema = z.object({ ...localBase });
export type LocalUpdateInput = z.infer<typeof LocalUpdateSchema>;

export interface LocalDto {
  idLocalCliente: number;
  rutCliente: number;
  nombre: string;
  telefono: string | null;
  direccion: string;
  comuna: string;
  email: string | null;
  giro: string;
  nomContacto: string;
  apellPatContacto: string;
  apellMatContacto: string;
  telefonoContacto: string | null;
  emailContacto: string | null;
  topeVenta: number;
  topeCredito: number;
  idVendedor: number;
  nomVendedor: string | null;
  idFormaPago: number;
  nomFormaPago: string | null;
  observaciones: string;
  permiteVentaTopeMensual: boolean;
  idEstado: number;
}

export interface LocalLookupsDto {
  formasPago: { id: number; nombre: string }[];
  vendedores: { id: number; nombre: string }[];
}
