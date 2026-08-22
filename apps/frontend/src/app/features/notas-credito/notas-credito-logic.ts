import { computeNcTotales, type VentaCreditableDto, type NcLineaInput } from "@serfel/shared";

/**
 * Fills a full-void set of NC lines from a venta: every line at its original
 * cantidad/precio, and restituirStock: true (a full anulación always returns
 * goods, so stock must be restituted for every line).
 */
export function anularLineas(venta: VentaCreditableDto): NcLineaInput[] {
  return venta.lineas.map((l) => ({
    idProducto: l.idProducto,
    cantidad: l.cantidad,
    precio: l.precio,
    porcenDesc: l.porcenDesc,
    restituirStock: true,
  }));
}

/**
 * Client-side preview of the NC total for the given lines. Uses an approximate
 * ivaValor (the real rate is resolved server-side from 99_p_impuesto at emit
 * time); restituirStock does not affect totals, only stock movement.
 */
export function previewTotal(lineas: NcLineaInput[], venta: VentaCreditableDto, ivaValor: number): number {
  const impuestoByProd = new Map(venta.lineas.map((l) => [l.idProducto, l.impuesto]));
  const calc = lineas.map((l) => ({ ...l, impuesto: impuestoByProd.get(l.idProducto) ?? 0 }));
  return computeNcTotales(calc, { ivaValor, especValor: 0, rateOf: () => null }).precioTotal;
}
