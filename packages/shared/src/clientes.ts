import { z } from "zod";
import { rutValido } from "./rut";
import { EstadoFilterSchema, type EstadoFilter } from "./productos";

const REQUIRED = (max: number) => z.string().trim().min(1).max(max);
const OPTTEXT = (max: number) => z.string().trim().max(max);

/** Fields common to create and update (everything except rut). */
const clienteBase = {
  razonSocial: REQUIRED(50),
  nomFantasia: OPTTEXT(50).default(""),
  telefono: z.string().trim().max(15).nullable().default(null),
  direccion: REQUIRED(200),
  comuna: OPTTEXT(20).default(""),
  ciudad: OPTTEXT(25).default(""),
  email: z.string().trim().email().max(50).nullable().default(null),
  idListaPrecio: z.number().int().positive(),
  permiteVentaDeuda: z.boolean().default(false),
};

export const ClienteCreateSchema = z.object({
  rut: z.string().refine(rutValido, "RUT inválido (dígito verificador no coincide)"),
  ...clienteBase,
});
export type ClienteCreateInput = z.infer<typeof ClienteCreateSchema>;

export const ClienteUpdateSchema = z.object({ ...clienteBase });
export type ClienteUpdateInput = z.infer<typeof ClienteUpdateSchema>;

export interface ClienteDto {
  rutCliente: number;
  dvCliente: string;
  rut: string;               // formatRut(rutCliente, dvCliente)
  razonSocial: string;
  nomFantasia: string;
  telefono: string | null;
  direccion: string;
  comuna: string;
  ciudad: string;
  email: string | null;
  idListaPrecio: number;
  nomListaPrecio: string;
  permiteVentaDeuda: boolean;
  idEstado: number;
  dias: number[];            // present route weekdays (num_dia 1..5)
  ultFactura: number | null;
  ultNotaCredito: number | null;
}

export interface ClienteLookupsDto {
  listasPrecio: { id: number; nombre: string }[];
}

const optDigits = z.string().optional().transform((s) => {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length ? d : undefined;
});
const optTrimmed = z.string().optional().transform((s) => {
  const t = (s ?? "").trim();
  return t.length ? t : undefined;
});

/** Server-side clientes search params. All filters optional and ANDed. */
export const ClienteSearchSchema = z.object({
  estado: EstadoFilterSchema,
  rut: optDigits,
  razonSocial: optTrimmed,
  direccion: optTrimmed,
});
export type ClienteSearchParams = z.infer<typeof ClienteSearchSchema>;
