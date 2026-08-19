import type { Disponibilidad, DisponibilidadFilter, PorcionesQuery } from "@serfel/shared";

export function disponibilidadLabel(d: Disponibilidad): string {
  return d === "disponible" ? "Disponible" : "Asignado";
}

export function buildPorcionesQuery(f: {
  numero: string;
  factura: string;
  disponibilidad: DisponibilidadFilter;
}): PorcionesQuery {
  const q: PorcionesQuery = { disponibilidad: f.disponibilidad };
  const numero = Number(f.numero);
  if (f.numero.trim() !== "" && Number.isInteger(numero)) q.numero = numero;
  const factura = Number(f.factura);
  if (f.factura.trim() !== "" && Number.isInteger(factura)) q.factura = factura;
  return q;
}
