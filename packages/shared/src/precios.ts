import { z } from "zod";
import { ESTADO_ACTIVO, ESTADO_INACTIVO } from "./productos";

export { ESTADO_ACTIVO, ESTADO_INACTIVO };

/** ---- Listas de Precio ---- */
export const ListaPrecioInputSchema = z.object({
  nombre: z.string().trim().min(1).max(15),
});
export type ListaPrecioInput = z.infer<typeof ListaPrecioInputSchema>;

export interface ListaPrecioDto {
  idListaPrecio: number;
  nombre: string;
  idEstado: number;
}

/** ---- Tramos (volume tiers) ---- */
export const TramoSchema = z.object({
  cantidad: z.number().int().nonnegative(), // 0 = tier unused
  maxPorcen: z.number().int().min(0).max(100),
});
export type Tramo = z.infer<typeof TramoSchema>;

export const PrecioProductoInputSchema = z
  .object({
    precioNeto: z.number().int().nonnegative(),
    maxPorcenDesc: z.number().int().min(0).max(100),
    tramos: z.array(TramoSchema).length(3),
  })
  .superRefine((val, ctx) => {
    const setQ = val.tramos.filter((t) => t.cantidad > 0).map((t) => t.cantidad);
    for (let i = 1; i < setQ.length; i++) {
      if (setQ[i] <= setQ[i - 1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tramos"],
          message: "Las cantidades de los tramos deben ser estrictamente ascendentes",
        });
        break;
      }
    }
  });
export type PrecioProductoInput = z.infer<typeof PrecioProductoInputSchema>;

/** ---- Bulk actions ---- */
export const BulkActionSchema = z.enum(["setPrecioNeto", "setMaxDesc", "clearMaxDesc"]);
export type BulkAction = z.infer<typeof BulkActionSchema>;

export const BulkInputSchema = z
  .object({
    action: BulkActionSchema,
    valor: z.number().int().nonnegative().optional(),
    idProductos: z.array(z.number().int().positive()).min(1),
  })
  .superRefine((v, ctx) => {
    if (v.action !== "clearMaxDesc" && v.valor === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "valor es requerido" });
    }
    if (v.action === "setMaxDesc" && v.valor !== undefined && v.valor > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "El descuento máximo es 100" });
    }
  });
export type BulkInput = z.infer<typeof BulkInputSchema>;

/** ---- Grid DTOs ---- */
export interface PrecioVentaValor {
  etiqueta: string; // "1+", "≥10", ...
  cantidadDesde: number;
  porcenDesc: number;
  precioVenta: number;
  margen: number | null;
}

export interface PrecioProductoRowDto {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  costoProm: number;
  precioNeto: number;
  precioBase: number;
  maxPorcenDesc: number;
  tramos: Tramo[]; // length 3
  impuestosPorcen: number;
  margenBase: number | null;
  preciosVenta: PrecioVentaValor[]; // 1..4
  bajoCosto: boolean;
}

/** ---- Pure pricing ---- */
export interface PricingParams {
  precioNeto: number;
  maxPorcenDesc: number;
  tramos: Tramo[];
  costoProm: number;
  impuestosPorcen: number;
}

export function computePrecioBase(precioNeto: number, impuestosPorcen: number): number {
  return precioNeto + Math.round((precioNeto * impuestosPorcen) / 100);
}

export function computeMargen(
  precioNeto: number,
  porcenDesc: number,
  costoProm: number
): number | null {
  if (!costoProm || costoProm <= 0) return null;
  const netoConDesc = precioNeto * (1 - porcenDesc / 100);
  return Math.round((netoConDesc / costoProm - 1) * 100);
}

export function computePreciosVenta(p: PricingParams): PrecioVentaValor[] {
  const base = computePrecioBase(p.precioNeto, p.impuestosPorcen);
  const make = (etiqueta: string, cantidadDesde: number, porcenDesc: number): PrecioVentaValor => ({
    etiqueta,
    cantidadDesde,
    porcenDesc,
    precioVenta: Math.round(base * (1 - porcenDesc / 100)),
    margen: computeMargen(p.precioNeto, porcenDesc, p.costoProm),
  });
  const values = [make("1+", 1, p.maxPorcenDesc)];
  for (const t of p.tramos) {
    if (t.cantidad > 0) values.push(make(`≥${t.cantidad}`, t.cantidad, t.maxPorcen));
  }
  return values;
}

export function buildPrecioProductoRow(args: {
  idProducto: number;
  codSerfel: number;
  nomProducto: string;
  costoProm: number;
  precioNeto: number;
  maxPorcenDesc: number;
  tramos: Tramo[];
  impuestosPorcen: number;
}): PrecioProductoRowDto {
  const preciosVenta = computePreciosVenta(args);
  return {
    idProducto: args.idProducto,
    codSerfel: args.codSerfel,
    nomProducto: args.nomProducto,
    costoProm: args.costoProm,
    precioNeto: args.precioNeto,
    precioBase: computePrecioBase(args.precioNeto, args.impuestosPorcen),
    maxPorcenDesc: args.maxPorcenDesc,
    tramos: args.tramos,
    impuestosPorcen: args.impuestosPorcen,
    margenBase: computeMargen(args.precioNeto, args.maxPorcenDesc, args.costoProm),
    preciosVenta,
    bajoCosto: args.costoProm > 0 && preciosVenta.some((v) => args.costoProm >= v.precioVenta),
  };
}
