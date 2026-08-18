import { FechaLocalPipe } from './fecha-local.pipe';

describe('FechaLocalPipe', () => {
  const pipe = new FechaLocalPipe();

  it('formats a summer (UTC-3) naive-UTC datetime in Santiago', () => {
    expect(pipe.transform('2026-01-15 12:00:00', 'dd/MM/yyyy HH:mm')).toBe('15/01/2026 09:00');
  });

  it('applies DST: winter is UTC-4', () => {
    expect(pipe.transform('2026-07-15 12:00:00', 'dd/MM/yyyy HH:mm')).toBe('15/07/2026 08:00');
  });

  it('rolls the calendar day back across midnight for date-only format', () => {
    expect(pipe.transform('2026-01-15 02:00:00', 'dd/MM/yyyy')).toBe('14/01/2026');
  });

  it("returns '' for empty input", () => {
    expect(pipe.transform('', 'dd/MM/yyyy HH:mm')).toBe('');
  });
});
