import { Pipe, PipeTransform } from "@angular/core";

const TZ = "America/Santiago";

/** Parse a naive UTC string ("YYYY-MM-DD HH:MM:SS") or Date/ISO into a UTC instant. */
function toUtcDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = value.trim().replace(" ", "T");
  // Append 'Z' only if the string carries no timezone designator.
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s += "Z";
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

@Pipe({ name: "fechaLocal", standalone: true })
export class FechaLocalPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: "dd/MM/yyyy HH:mm" | "dd/MM/yyyy" = "dd/MM/yyyy HH:mm",
  ): string {
    const d = toUtcDate(value);
    if (!d) return "";
    const withTime = format.includes("HH");
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    }).formatToParts(d);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const date = `${g("day")}/${g("month")}/${g("year")}`;
    return withTime ? `${date} ${g("hour")}:${g("minute")}` : date;
  }
}
