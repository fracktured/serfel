import type { MarcaDto } from "@serfel/shared";

export type SortKey = "nomMarca" | "descMarca";
export interface Sort { key: SortKey; asc: boolean }
export interface Filters { nombre: string; quick: string }

export function applyFilters(rows: MarcaDto[], f: Filters): MarcaDto[] {
  const nombre = f.nombre.trim().toLowerCase();
  const quick = f.quick.trim().toLowerCase();
  return rows.filter((r) => {
    if (nombre && !r.nomMarca.toLowerCase().includes(nombre)) return false;
    if (quick) {
      const hay = `${r.nomMarca} ${r.descMarca}`.toLowerCase();
      if (!hay.includes(quick)) return false;
    }
    return true;
  });
}

export function sortRows(rows: MarcaDto[], s: Sort): MarcaDto[] {
  const dir = s.asc ? 1 : -1;
  return [...rows].sort((a, b) =>
    a[s.key].localeCompare(b[s.key], "es", { sensitivity: "base" }) * dir
  );
}

export function paginate<T>(rows: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * perPage;
  const slice = rows.slice(start, start + perPage);
  return {
    slice,
    from: rows.length === 0 ? 0 : start + 1,
    to: start + slice.length,
    page: clamped,
    totalPages,
  };
}

export function computeStats(all: MarcaDto[], filtered: MarcaDto[]): { total: number; filtrados: number | null } {
  return { total: all.length, filtrados: filtered.length };
}

export function toCsv(rows: MarcaDto[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Nombre", "Descripción"].join(",");
  const body = rows.map((r) => [esc(r.nomMarca), esc(r.descMarca)].join(","));
  return [header, ...body].join("\n");
}
