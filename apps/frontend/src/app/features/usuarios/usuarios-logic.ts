import { ESTADO_ACTIVO, type UsuarioDto } from "@serfel/shared";

export interface Filters {
  nombre: string;
  rut: string;
  idTipoUsuario: number | null;
  quick: string;
}

export type SortKey = "rut" | "nombreCompleto" | "nomTipoUsuario" | "emailUsuario" | "numUsuario";
export interface Sort { key: SortKey; asc: boolean; }

function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).split(" ").filter(Boolean).every((t) => haystack.includes(t));
}

export function applyFilters(rows: UsuarioDto[], f: Filters): UsuarioDto[] {
  const nombre = f.nombre.trim();
  const rut = f.rut.trim().replace(/\./g, "");
  const quick = f.quick.trim();
  return rows.filter((r) => {
    if (nombre && !matchesAllTokens(r.nombreCompleto, nombre)) return false;
    if (rut && !r.rut.replace(/\./g, "").includes(rut)) return false;
    if (f.idTipoUsuario !== null && r.idTipoUsuario !== f.idTipoUsuario) return false;
    if (quick && !matchesAllTokens(r.nombreCompleto, quick) && !r.rut.includes(quick) &&
        !matchesAllTokens(r.emailUsuario ?? "", quick)) return false;
    return true;
  });
}

export function sortRows(rows: UsuarioDto[], s: Sort): UsuarioDto[] {
  return [...rows].sort((a, b) => {
    const va = a[s.key]; const vb = b[s.key];
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb : String(va ?? "").localeCompare(String(vb ?? ""));
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

export function toCsv(rows: UsuarioDto[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["RUT", "Nombre", "Tipo", "Email", "Nº", "Cognito", "Estado"].map(esc).join(";");
  const lines = rows.map((r) => [
    r.rut, r.nombreCompleto, r.nomTipoUsuario, r.emailUsuario ?? "", r.numUsuario || "",
    r.tieneCognito ? "Sí" : "No", r.idEstado === ESTADO_ACTIVO ? "Activo" : "Inactivo",
  ].map(esc).join(";"));
  return [header, ...lines].join("\r\n");
}

export function computeStats(all: UsuarioDto[], filtered: UsuarioDto[]) {
  return {
    total: all.length,
    tipos: new Set(all.map((u) => u.idTipoUsuario)).size,
    conCognito: all.filter((u) => u.tieneCognito).length,
    filtrados: filtered.length === all.length ? null : filtered.length,
  };
}
