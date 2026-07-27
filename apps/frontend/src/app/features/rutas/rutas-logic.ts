import type { ApiErrorBody, RutaDto, RutaSelection } from "@serfel/shared";

export function toggleSelection(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function allSelected(routes: RutaDto[], selected: ReadonlySet<number>): boolean {
  return routes.length > 0 && routes.every((r) => selected.has(r.idRuta));
}

export function selectedRutas(routes: RutaDto[], selected: ReadonlySet<number>): RutaSelection {
  return routes
    .filter((r) => selected.has(r.idRuta))
    .map((r) => ({ idRuta: r.idRuta, nomRuta: r.nomRuta }));
}

/** Parses an API error JSON string (from a blob error body) into its error field, or null. */
export function parseApiErrorText(text: string): ApiErrorBody["error"] | null {
  try {
    const body = JSON.parse(text);
    return body?.error?.code && body?.error?.message ? (body.error as ApiErrorBody["error"]) : null;
  } catch {
    return null;
  }
}
