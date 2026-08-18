import { Pipe, PipeTransform } from '@angular/core';

const TZ = 'America/Santiago';

function toUtcDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = String(value).trim().replace(' ', 'T');
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

@Pipe({ name: 'fechaLocal' })
export class FechaLocalPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: 'dd/MM/yyyy HH:mm' | 'dd/MM/yyyy' = 'dd/MM/yyyy HH:mm',
  ): string {
    const d = toUtcDate(value);
    if (!d) return '';
    const withTime = format.indexOf('HH') !== -1;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    }).formatToParts(d);
    const g = (t: string) => (parts.find((p) => p.type === t) || ({} as any)).value || '';
    const date = `${g('day')}/${g('month')}/${g('year')}`;
    return withTime ? `${date} ${g('hour')}:${g('minute')}` : date;
  }
}
