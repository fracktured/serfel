import { z } from "zod";

/** Legacy numeric enums (99_p_estado, 99_p_impuesto, bodega, tipo docto). */
export const ESTADO_FINALIZADO = 3;
export const ESTADO_ANULADO = 4;
export const IMPUESTO_ESPEC = 2;
export const IMPUESTO_IVA = 3;
export const BODEGA_CENTRAL = 1;
export const TIPO_DOCTO_FACTURA = 1;

export const PrefacturaBatchInputSchema = z.object({
  rutEmpresa: z.number().int().positive(),
  idPedidos: z
    .array(z.number().int().positive())
    .nonempty()
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "idPedidos no debe contener duplicados",
    }),
});
export type PrefacturaBatchInput = z.infer<typeof PrefacturaBatchInputSchema>;

export interface PrefacturaResultItem {
  idPedido: number;
  status: "facturado" | "error";
  idVenta?: number;
  mensajes: string[]; // stock-adjustment / skipped-line warnings
  error?: string; // reason when status === "error"
}

export interface PrefacturaBatchResult {
  resultados: PrefacturaResultItem[];
  facturados: number;
  errores: number;
}

export interface PedidoPendienteDto {
  idPedido: number;
  fecha: string; // ISO datetime string
  rutCliente: number;
  dvCliente: string;
  nomFantasia: string;
  nomLocal: string;
  contacto: string; // full contact name
  vendedor: string; // full vendedor name
  precioTotal: number;
}

export interface EmpresaDto {
  rutEmpresa: number;
  dv: string;
  razonSocial: string;
}
