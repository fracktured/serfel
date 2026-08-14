/**
 * Chilean RUT check digit (módulo 11). Returns "0"-"9" or "K".
 * The multiplier cycles 2..7 over the digits from right to left.
 */
export function computeDv(rut: number): string {
  let sum = 0;
  let mul = 2;
  let n = Math.trunc(rut);
  while (n > 0) {
    sum += (n % 10) * mul;
    n = Math.floor(n / 10);
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}

/** Parses "12.345.678-5" / "12345678-5" / "6371526-k" into its parts, or null. */
export function parseRut(input: string): { rut: number; dv: string } | null {
  const clean = input.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  const m = clean.match(/^(\d+)-?([\dK])$/);
  if (!m) return null;
  const rut = Number(m[1]);
  if (!Number.isInteger(rut) || rut <= 0) return null;
  return { rut, dv: m[2] };
}

export function rutValido(input: string): boolean {
  const p = parseRut(input);
  return p !== null && computeDv(p.rut) === p.dv;
}

export function formatRut(rut: number, dv: string): string {
  return `${rut}-${dv}`;
}
