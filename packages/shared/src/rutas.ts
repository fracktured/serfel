import { z } from "zod";

export interface RutaDto {
  idRuta: number;
  nomRuta: string;
  idUsuario: number;
  numDia: number;
  idEstado: number;
}

// cargoList body: only id + nom are needed (nom feeds the PDF "Rutas:" header).
export const RutaSelectionSchema = z
  .array(
    z.object({
      idRuta: z.number().int().positive(),
      nomRuta: z.string().trim().min(1),
    })
  )
  .min(1);
export type RutaSelection = z.infer<typeof RutaSelectionSchema>;
