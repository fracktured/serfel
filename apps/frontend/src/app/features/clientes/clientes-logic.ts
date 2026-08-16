import { ESTADO_ACTIVO, type ClienteDto } from "@serfel/shared";

export interface Filters {
  rut: string;
  razonSocial: string;
  direccion: string;
}

export type SortKey = "rut" | "razonSocial" | "ultFactura" | "ultNotaCredito";
export interface Sort { key: SortKey; asc: boolean; }

/** Weekday columns L·M·M·J·V ↔ num_dia 1..5. */
export const WEEKDAYS: { dia: number; label: string }[] = [
  { dia: 1, label: "L" }, { dia: 2, label: "M" }, { dia: 3, label: "M" },
  { dia: 4, label: "J" }, { dia: 5, label: "V" },
];

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
