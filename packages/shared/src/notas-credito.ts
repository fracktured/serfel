import { z } from "zod";

/** Internal 10_p_tipo_docto codes. */
export const TIPO_DOCTO_FACTURA_ELECTRONICA = 9;
export const TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA = 11;

/** facturación.cl / SII DTE types. */
export const DTE_FACTURA_ELECTRONICA = 33;
export const DTE_NOTA_CREDITO_ELECTRONICA = 61;

/** CodRef in the flat-file ->Referencia<- section. */
export const COD_REF_ANULA = 1;
export const COD_REF_CORRIGE_MONTOS = 3;

export const NcLineaInputSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  precio: z.number().int().nonnegative(),
  porcenDesc: z.number().int().min(0).max(100),
});
export type NcLineaInput = z.infer<typeof NcLineaInputSchema>;

export const EmitirNcInputSchema = z.object({
  idVenta: z.number().int().positive(),
  idMotivo: z.number().int().positive(),
  codRef: z.union([z.literal(COD_REF_ANULA), z.literal(COD_REF_CORRIGE_MONTOS)]),
  lineas: z.array(NcLineaInputSchema).nonempty(),
});
export type EmitirNcInput = z.infer<typeof EmitirNcInputSchema>;

export interface NcLineaDto {
  idProducto: number;
  codSerfel: number; // 20_m_producto.cod_serfel is an int
  descripcion: string;
  cantidad: number;
  precio: number;
  porcenDesc: number;
  impuesto: number; // 99_p_impuesto id on the producto
}

export interface VentaCreditableDto {
  idVenta: number;
  idFolio: number;
  numDoctoEmitido: number;
  fechaVenta: string;
  rutEmpresa: number;
  rutCliente: number;
  nomCliente: string;
  precioTotal: number;
  montoYaCreditado: number; // sum of existing NC precio_total against this venta
  lineas: NcLineaDto[];
}

export interface NotaCreditoListItemDto {
  idNotaCredito: number;
  idVenta: number;
  idFolio: number;
  numNotaCredito: number;
  rutCliente: number;
  nomCliente: string;
  fechaNotaCredito: string;
  precioTotal: number;
  esElectronica: boolean;
}

export interface EmitirNcResultDto {
  idNotaCredito: number;
  idFolio: number;
  esElectronica: boolean;
  urlPdfOriginal: string;
  urlPdfCedible: string;
}

/**
 * Contract between the notas-credito lambda and the facturacion-emisor lambda.
 * Both lambdas live in the @serfel/lambdas package; these types live here in
 * @serfel/shared so neither lambda imports from the other's directory.
 */
export type EmisorEvent =
  | { op: "procesar"; rutEmpresa: string; flatFileBase64: string }
  | { op: "obtenerlink"; rutEmpresa: string; folio: number; tipoDte: number; cedible: boolean };

export interface EmisorResult {
  ok: boolean;
  folio?: number;
  urlPdfOriginal?: string;
  urlPdfCedible?: string;
  url?: string;
  resultado?: string;
  error?: string;
}

const IMPUESTO_ESPEC = 2;

export interface NcTotales {
  subTotal: number;
  iva: number;
  espec: number;
  iaba: number;
  precioTotal: number;
}

export function computeNcTotales(
  lineas: { cantidad: number; precio: number; porcenDesc: number; impuesto: number }[],
  opts: { ivaValor: number; especValor: number; rateOf: (impuesto: number) => number | null },
): NcTotales {
  let subTotal = 0;
  let espec = 0;
  let iaba = 0;
  for (const l of lineas) {
    const bruto = Math.round(l.cantidad * l.precio);
    const conDesc = bruto - Math.round((bruto * l.porcenDesc) / 100);
    subTotal += conDesc;
    if (l.impuesto === IMPUESTO_ESPEC) {
      espec += Math.round((conDesc * opts.especValor) / 100);
    } else if (l.impuesto > 0) {
      const rate = opts.rateOf(l.impuesto);
      if (rate !== null) iaba += Math.round((conDesc * rate) / 100);
    }
  }
  const iva = Math.round((subTotal * opts.ivaValor) / 100);
  return { subTotal, iva, espec, iaba, precioTotal: subTotal + espec + iaba + iva };
}
