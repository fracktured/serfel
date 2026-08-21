import { z } from "zod";
import { rutValido } from "./rut";
import { EstadoFilterSchema } from "./productos";

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
  bloquearVenta: z.boolean().default(false),
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
  bloquearVenta: boolean;
  idEstado: number;
  dias: number[];            // present route weekdays (num_dia 1..5)
  ultFactura: number | null;
  ultNotaCredito: number | null;
}

export interface ClienteLookupsDto {
  listasPrecio: { id: number; nombre: string }[];
}

// The trailing .optional() (after .transform()) is required so the inferred
// output type marks these keys optional (`rut?: string`) rather than required
// `rut: string | undefined` — zod's object-key-optionality check only looks at
// the outermost wrapper, and ZodEffects (from .transform()) isn't recognized,
// so without it every ClienteSearchParams literal would need to spell out all
// three keys even when omitting them was intended.
const optDigits = z.string().optional().transform((s) => {
  // rutCliente stores only the body ("12452724"); the DV lives in a separate
  // column. Drop everything after "-" so a full RUT ("12.452.724-4") matches,
  // then keep just the body digits for the LIKE.
  const body = (s ?? "").split("-")[0].replace(/\D/g, "");
  return body.length ? body : undefined;
}).optional();
const optTrimmed = z.string().optional().transform((s) => {
  const t = (s ?? "").trim();
  return t.length ? t : undefined;
}).optional();

/** Server-side clientes search params. All filters optional and ANDed. */
export const ClienteSearchSchema = z.object({
  estado: EstadoFilterSchema,
  rut: optDigits,
  razonSocial: optTrimmed,
  direccion: optTrimmed,
});
export type ClienteSearchParams = z.infer<typeof ClienteSearchSchema>;
