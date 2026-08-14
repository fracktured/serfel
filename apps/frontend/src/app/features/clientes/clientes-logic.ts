import { ESTADO_ACTIVO, type ClienteDto } from "@serfel/shared";

export interface Filters {
  razonSocial: string;
  rut: string;
  idListaPrecio: number | null;
  quick: string;
}

export type SortKey = "rut" | "razonSocial" | "ultFactura" | "ultNotaCredito";
export interface Sort { key: SortKey; asc: boolean; }

/** Weekday columns L·M·M·J·V ↔ num_dia 1..5. */
export const WEEKDAYS: { dia: number; label: string }[] = [
  { dia: 1, label: "L" }, { dia: 2, label: "M" }, { dia: 3, label: "M" },
  { dia: 4, label: "J" }, { dia: 5, label: "V" },
];

function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).split(" ").filter(Boolean).every((t) => haystack.includes(t));
}

export function applyFilters(rows: ClienteDto[], f: Filters): ClienteDto[] {
  const razon = f.razonSocial.trim();
  const rut = f.rut.trim().replace(/\./g, "");
  const quick = f.quick.trim();
  return rows.filter((r) => {
    if (razon && !matchesAllTokens(r.razonSocial + " " + r.nomFantasia, razon)) return false;
    if (rut && !r.rut.replace(/\./g, "").includes(rut)) return false;
    if (f.idListaPrecio !== null && r.idListaPrecio !== f.idListaPrecio) return false;
    if (quick && !matchesAllTokens(r.razonSocial + " " + r.nomFantasia, quick) && !r.rut.includes(quick)) return false;
    return true;
  });
}

export function sortRows(rows: ClienteDto[], s: Sort): ClienteDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key]; const vb = b[s.key];
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : (va === null ? -1 : vb === null ? 1 : String(va).localeCompare(String(vb)));
    return s.asc ? cmp : -cmp;
  });
}

export function paginate<T>(rows: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = rows.length === 0 ? 0 : (current - 1) * perPage + 1;
  const to = Math.min(current * perPage, rows.length);
  return { slice: rows.slice((current - 1) * perPage, current * perPage), totalPages, page: current, from, to };
}

export function toCsv(rows: ClienteDto[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["RUT", "Razón Social", "Nombre Fantasía", "Comuna", "Ciudad", "Lista Precio", "Días", "Últ. Factura", "Últ. Nota Crédito", "Estado"].map(esc).join(";");
  const lines = rows.map((r) => [
    r.rut, r.razonSocial, r.nomFantasia, r.comuna, r.ciudad, r.nomListaPrecio,
    r.dias.join("-"), r.ultFactura ?? "", r.ultNotaCredito ?? "",
    r.idEstado === ESTADO_ACTIVO ? "Activo" : "Inactivo",
  ].map(esc).join(";"));
  return [header, ...lines].join("\r\n");
}

export function computeStats(all: ClienteDto[], filtered: ClienteDto[]) {
  return {
    total: all.length,
    listasPrecio: new Set(all.map((r) => r.idListaPrecio)).size,
    conDeuda: all.filter((r) => r.permiteVentaDeuda).length,
    filtrados: filtered.length === all.length ? null : filtered.length,
  };
}
