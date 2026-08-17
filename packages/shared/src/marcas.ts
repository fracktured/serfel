import { z } from "zod";

export const MarcaInputSchema = z.object({
  nomMarca: z.string().trim().min(1).max(50),
  descMarca: z.string().trim().max(200).default(""),
});
export type MarcaInput = z.infer<typeof MarcaInputSchema>;

export interface MarcaDto {
  idMarca: number;
  nomMarca: string;
  descMarca: string;
  idEstado: number;
}
