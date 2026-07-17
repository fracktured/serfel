import { z } from "zod";

/** Verified against legacy 99_p_estado: 1=Activo, 0=Inactivo. */
export const ESTADO_ACTIVO = 1;
export const ESTADO_INACTIVO = 0;

export const EstadoFilterSchema = z
  .enum(["activos", "inactivos", "todos"])
  .default("activos");
export type EstadoFilter = z.infer<typeof EstadoFilterSchema>;

export const ProductoInputSchema = z.object({
  codSerfel: z.number().int().positive(),
  nomProducto: z.string().trim().min(1).max(200),
  idMarca: z.number().int().positive(),
  idUm: z.number().int().positive(),
  // nonnegative, not positive: the legacy catalog's only tipo row is
  // id 0 "SIN TIPO" — rejecting 0 would make product creation impossible
  idTipoProducto: z.number().int().nonnegative(),
  // impuesto id from 99_p_impuesto; 0 = "Sin Imp. Adicional"
  impuesto: z.number().int().nonnegative(),
  // usa_porciones: "Es porcionado" — only 0 or 1
  usaPorciones: z.union([z.literal(0), z.literal(1)]),
});
export type ProductoInput = z.infer<typeof ProductoInputSchema>;

export interface ProductoDto {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  idMarca: number;
  nomMarca: string;
  idUm: number;
  nomUm: string;
  idTipoProducto: number;
  nomTipoProducto: string;
  impuesto: number;
  usaPorciones: number;
  idEstado: number;
}

export interface LookupItem {
  id: number;
  nombre: string;
}

export interface LookupsDto {
  marcas: LookupItem[];
  tiposProducto: LookupItem[];
  unidadesMedida: LookupItem[];
  impuestos: LookupItem[];
}

export type ApiErrorCode =
  | "COD_SERFEL_EN_USO"
  | "NOMBRE_EN_USO"
  | "PRODUCTO_NO_ENCONTRADO"
  | "VALIDACION"
  | "NO_AUTORIZADO"
  | "DB_NO_DISPONIBLE"
  | "ERROR_INTERNO";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
