import { z } from "zod";

export type Disponibilidad = "disponible" | "asignado";

export const DisponibilidadFilterSchema = z
  .enum(["disponible", "asignado", "todas"])
  .default("todas");
export type DisponibilidadFilter = z.infer<typeof DisponibilidadFilterSchema>;

export const PorcionInputSchema = z.object({
  numero: z.number().int().min(1).max(100),
  cantidad: z
    .number()
    .positive()
    .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-9, {
      message: "cantidad admite máximo 3 decimales",
    }),
});
export type PorcionInput = z.infer<typeof PorcionInputSchema>;

export const PorcionesQuerySchema = z.object({
  numero: z.coerce.number().int().min(1).max(100).optional(),
  factura: z.coerce.number().int().positive().optional(),
  disponibilidad: DisponibilidadFilterSchema.optional(),
});
export type PorcionesQuery = z.infer<typeof PorcionesQuerySchema>;

export interface PorcionDto {
  idPorcion: number;
  idProducto: number;
  grupo: number;
  numero: number;
  cantidad: number;
  fecha: string;
  disponibilidad: Disponibilidad;
  idVenta: number | null;
  numDoctoEmitido: number | null;
}

export interface PorcionesListDto {
  porciones: PorcionDto[];
  nextNumero: number;
}
