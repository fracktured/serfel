/** Normaliza texto: minúsculas, sin tildes, puntuación → espacio. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** true si cada palabra de la consulta aparece como substring, en cualquier orden. */
export function matchesAllTokens(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
