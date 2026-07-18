import { ESTADO_ACTIVO, type ProductoDto } from "@serfel/shared";

export interface Filters {
  codigo: string;
  nombre: string;
  idMarca: number | null;
  quick: string;
}

export type SortKey =
  | "codSerfel"
  | "nomProducto"
  | "nomMarca"
  | "nomUm"
  | "nomTipoProducto";

export interface Sort {
  key: SortKey;
  asc: boolean;
}

/**
 * Normaliza texto para búsqueda: minúsculas, sin tildes, puntuación → espacio.
 * Así "YOG.BATIDO SOPR 165grs" se compara como "yog batido sopr 165grs".
 */
function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * true si cada palabra de la consulta aparece como substring en el texto,
 * en cualquier orden (ej. "yog bat 165" matchea "YOG.BATIDO SOPR 165grs").
 */
function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

export function applyFilters(rows: ProductoDto[], f: Filters): ProductoDto[] {
  const codigo = f.codigo.trim();
  const nombre = f.nombre.trim();
  const quick = f.quick.trim();
  return rows.filter((p) => {
    if (codigo && !String(p.codSerfel).includes(codigo)) return false;
    if (nombre && !matchesAllTokens(p.nomProducto, nombre)) return false;
    if (f.idMarca !== null && p.idMarca !== f.idMarca) return false;
    if (
      quick &&
      !matchesAllTokens(p.nomProducto, quick) &&
      !String(p.codSerfel).includes(quick) &&
      !matchesAllTokens(p.nomMarca, quick)
    ) {
      return false;
    }
    return true;
  });
}

export function sortRows(rows: ProductoDto[], s: Sort): ProductoDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key];
    const vb = b[s.key];
    const cmp =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
    return s.asc ? cmp : -cmp;
  });
}

export function paginate<T>(
  rows: T[],
  page: number,
  perPage: number
): { slice: T[]; totalPages: number; page: number; from: number; to: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = rows.length === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, rows.length);
  return {
    slice: rows.slice((current - 1) * perPage, current * perPage),
    totalPages,
    page: current,
    from,
    to,
  };
}

export function toCsv(rows: ProductoDto[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Nº", "Nombre", "Marca", "UM", "Tipo", "Estado"].map(esc).join(";");
  const lines = rows.map((r) =>
    [
      r.codSerfel,
      r.nomProducto,
      r.nomMarca,
      r.nomUm,
      r.nomTipoProducto,
      r.idEstado === ESTADO_ACTIVO ? "Activo" : "Inactivo",
    ]
      .map(esc)
      .join(";")
  );
  return [header, ...lines].join("\r\n");
}

export function computeStats(
  all: ProductoDto[],
  filtered: ProductoDto[]
): { total: number; marcas: number; tipos: number; filtrados: number | null } {
  return {
    total: all.length,
    marcas: new Set(all.map((p) => p.idMarca)).size,
    tipos: new Set(all.map((p) => p.idTipoProducto)).size,
    filtrados: filtered.length === all.length ? null : filtered.length,
  };
}

const BADGE_PALETTE: ReadonlyArray<{ background: string; color: string }> = [
  { background: "#fef3c7", color: "#92400e" },
  { background: "#dcfce7", color: "#14532d" },
  { background: "#dbeafe", color: "#1e3a8a" },
  { background: "#fce7f3", color: "#831843" },
  { background: "#ede9fe", color: "#5b21b6" },
  { background: "#ffedd5", color: "#9a3412" },
];

export function brandBadgeStyle(idMarca: number): {
  background: string;
  color: string;
} {
  return BADGE_PALETTE[idMarca % BADGE_PALETTE.length];
}
