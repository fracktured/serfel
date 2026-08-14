import { z } from "zod";
import { rutValido, parseRut, formatRut, computeDv } from "./rut";

export { rutValido, parseRut, formatRut, computeDv };

const REQUIRED = (max: number) => z.string().trim().min(1).max(max);

/** Fields common to create and update (everything except rut and password). */
const usuarioBase = {
  nomUsuario: REQUIRED(50),
  apellPatUsuario: REQUIRED(30),
  apellMatUsuario: REQUIRED(30),
  idTipoUsuario: z.number().int().positive(),
  telefonoUsuario: REQUIRED(15),
  direccionUsuario: REQUIRED(200),
  emailUsuario: z.string().trim().email().max(50),
  // optional; when present must be a non-negative integer. 0 means "sin número".
  numUsuario: z.number().int().nonnegative().nullable().default(null),
};

export const UsuarioCreateSchema = z.object({
  rut: z.string().refine(rutValido, "RUT inválido (dígito verificador no coincide)"),
  ...usuarioBase,
  password: z.string().min(4).max(50),
});
export type UsuarioCreateInput = z.infer<typeof UsuarioCreateSchema>;

export const UsuarioUpdateSchema = z.object({
  ...usuarioBase,
  // optional on update: empty/omitted means "keep current password".
  password: z.string().min(4).max(50).optional(),
});
export type UsuarioUpdateInput = z.infer<typeof UsuarioUpdateSchema>;

export interface UsuarioDto {
  idUsuario: number;
  rutUsuario: number;
  dvUsuario: string;
  rut: string;
  nomUsuario: string;
  apellPatUsuario: string;
  apellMatUsuario: string;
  nombreCompleto: string;
  idTipoUsuario: number;
  nomTipoUsuario: string;
  telefonoUsuario: string | null;
  direccionUsuario: string;
  emailUsuario: string | null;
  numUsuario: number;
  idEstado: number;
  tieneCognito: boolean;
}

export interface UsuarioLookupsDto {
  tiposUsuario: { id: number; nombre: string }[];
}
