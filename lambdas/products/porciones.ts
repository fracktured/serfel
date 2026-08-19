/** A piece is available when it is not tied to a venta (null or 0). */
export function isDisponible(idVenta: number | null): boolean {
  return idVenta === null || idVenta === 0;
}

/** Next physical label: top piece by (grupo desc, numero desc) + 1, wrapping at 100. */
export function nextNumero(porciones: { grupo: number; numero: number }[]): number {
  if (porciones.length === 0) return 1;
  const top = [...porciones].sort(
    (a, b) => b.grupo - a.grupo || b.numero - a.numero
  )[0];
  const n = top.numero + 1;
  return n > 100 ? 1 : n;
}

/** True when a Disponible piece already uses this numero (blocks creation). */
export function numeroOcupado(
  porciones: { numero: number; idVenta: number | null }[],
  numero: number
): boolean {
  return porciones.some((p) => p.numero === numero && isDisponible(p.idVenta));
}

/** Grupo for a new piece: bump to maxGrupo + 1 when the numero already sits in the max grupo. */
export function pickGrupo(
  porciones: { grupo: number; numero: number }[],
  numero: number
): number {
  if (porciones.length === 0) return 1;
  const maxGrupo = Math.max(...porciones.map((p) => p.grupo));
  const existsInMax = porciones.some(
    (p) => p.grupo === maxGrupo && p.numero === numero
  );
  return existsInMax ? maxGrupo + 1 : maxGrupo;
}
