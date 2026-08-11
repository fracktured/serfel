import { z } from "zod";

/**
 * Chilean RUT check digit (módulo 11). Returns "0"-"9" or "K".
 * The multiplier cycles 2..7 over the digits from right to left.
 */
export function computeDv(rut: number): string {
  let sum = 0;
  let mul = 2;
  let n = Math.trunc(rut);
  while (n > 0) {
    sum += (n % 10) * mul;
    n = Math.floor(n / 10);
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}

/** Parses "12.345.678-5" / "12345678-5" / "6371526-k" into its parts, or null. */
export function parseRut(input: string): { rut: number; dv: string } | null {
  const clean = input.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  const m = clean.match(/^(\d+)-?([\dK])$/);
  if (!m) return null;
  const rut = Number(m[1]);
  if (!Number.isInteger(rut) || rut <= 0) return null;
  return { rut, dv: m[2] };
}

export function rutValido(input: string): boolean {
  const p = parseRut(input);
  return p !== null && computeDv(p.rut) === p.dv;
}

export function formatRut(rut: number, dv: string): string {
  return `${rut}-${dv}`;
}

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
