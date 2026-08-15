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
  | "PROHIBIDO"
  | "DB_NO_DISPONIBLE"
  | "ERROR_INTERNO"
  | "RUT_EN_USO"
  | "RUT_INACTIVO"
  | "NUM_EN_USO"
  | "EMAIL_EN_USO"
  | "USUARIO_NO_ENCONTRADO"
  | "USUARIO_CON_VENTAS_PENDIENTES"
  | "USUARIO_SIN_EMAIL"
  | "COGNITO_YA_EXISTE"
  | "COGNITO_ERROR"
  | "RAZON_SOCIAL_EN_USO"
  | "CLIENTE_NO_ENCONTRADO"
  | "CLIENTE_CON_VENTAS_PENDIENTES";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

/** Additional-tax breakdown shown when producto.impuesto > 0. */
export interface ImpuestoAdicionalDto {
  nombre: string;
  porcentaje: number;
  monto: number;
}

/** Last-purchase supplier, null when the product was never received. */
export interface ProveedorUltCompraDto {
  rut: string; // "12345678-9"
  razonSocial: string;
}

/**
 * Read model for the "$" detail modal, mirroring legacy consultaProductos
 * minus IVA Costo and IVA Precio Venta. All monetary/quantity fields are raw
 * numbers; the frontend formats for display.
 */
export interface ProductoDetalleDto {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  nomMarca: string;
  nomUm: string;
  tipoProductoPadre: string | null;
  tipoProducto: string;
  costoProm: number;
  costoConIva: number;
  ultFechaCompra: string | null;
  cantidadStock: number;
  costoTotalStock: number;
  precioNeto: number;
  precioVentaCliente: number;
  valorMargen: number;
  porcenMargen: number;
  impuestoAdicional: ImpuestoAdicionalDto | null;
  proveedorUltCompra: ProveedorUltCompraDto | null;
}

/** Absolute new stock quantity for PUT /products/:id/stock. */
export const StockInputSchema = z.object({
  cantidad: z
    .number()
    .nonnegative()
    .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-9, {
      message: "cantidad admite máximo 3 decimales",
    }),
});
export type StockInput = z.infer<typeof StockInputSchema>;
