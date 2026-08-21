import type { PedidoPendienteDto } from "@serfel/shared";
import { normalizeSearch } from "../../shared/text-search";

export type SortKey = "idPedido" | "fecha" | "rutCliente" | "nomFantasia" | "nomLocal" | "contacto" | "vendedor" | "precioTotal";

export interface Sort {
  key: SortKey;
  asc: boolean;
}

export function applyFilter(rows: PedidoPendienteDto[], query: string): PedidoPendienteDto[] {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return rows;
  return rows.filter((r) => {
    const haystack = normalizeSearch(`${r.idPedido} ${r.rutCliente} ${r.nomFantasia} ${r.nomLocal} ${r.contacto} ${r.vendedor}`);
    return tokens.every((t) => haystack.includes(t));
  });
}

export function sortRows(rows: PedidoPendienteDto[], s: Sort): PedidoPendienteDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key];
    const vb = b[s.key];
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return s.asc ? cmp : -cmp;
  });
}

export function computeStats(
  rows: PedidoPendienteDto[],
  seleccion: Set<number>
): { total: number; seleccionados: number } {
  let seleccionados = 0;
  for (const r of rows) if (seleccion.has(r.idPedido)) seleccionados++;
  return { total: rows.length, seleccionados };
}
