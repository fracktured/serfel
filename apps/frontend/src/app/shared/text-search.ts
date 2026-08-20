/**
 * Normaliza texto para búsqueda: minúsculas, sin tildes, puntuación → espacio.
 * Así "YOG.BATIDO SOPR 165grs" se compara como "yog batido sopr 165grs".
 */
export function normalizeSearch(text: string): string {
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
export function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
