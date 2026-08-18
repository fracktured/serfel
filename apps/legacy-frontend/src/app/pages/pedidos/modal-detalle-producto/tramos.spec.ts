import { getTechoEfectivo, getTramosActivos, getTramoActivoCant, TramoPricing } from './tramos';

const conTramos: TramoPricing = {
  maxPorcenDesc: 3,
  cantTramo1: 10, maxPorcenTramo1: 5,
  cantTramo2: 50, maxPorcenTramo2: 8,
  cantTramo3: 100, maxPorcenTramo3: 10,
};

const sinTramos: TramoPricing = {
  maxPorcenDesc: 4,
  cantTramo1: 0, maxPorcenTramo1: 0,
  cantTramo2: 0, maxPorcenTramo2: 0,
  cantTramo3: 0, maxPorcenTramo3: 0,
};

describe('tramos helpers', () => {
  it('lists only active tramos, ascending', () => {
    expect(getTramosActivos(conTramos)).toEqual([
      { cant: 10, max: 5 },
      { cant: 50, max: 8 },
      { cant: 100, max: 10 },
    ]);
    expect(getTramosActivos(sinTramos)).toEqual([]);
  });

  it('returns base ceiling below the first tramo', () => {
    expect(getTechoEfectivo(conTramos, 0)).toBe(3);
    expect(getTechoEfectivo(conTramos, 9)).toBe(3);
  });

  it('returns the highest reached tramo ceiling', () => {
    expect(getTechoEfectivo(conTramos, 10)).toBe(5);
    expect(getTechoEfectivo(conTramos, 49)).toBe(5);
    expect(getTechoEfectivo(conTramos, 50)).toBe(8);
    expect(getTechoEfectivo(conTramos, 100)).toBe(10);
    expect(getTechoEfectivo(conTramos, 999)).toBe(10);
  });

  it('falls back to base ceiling when no tramos are active', () => {
    expect(getTechoEfectivo(sinTramos, 500)).toBe(4);
  });

  it('reports the active tramo cant, or null at base', () => {
    expect(getTramoActivoCant(conTramos, 9)).toBeNull();
    expect(getTramoActivoCant(conTramos, 10)).toBe(10);
    expect(getTramoActivoCant(conTramos, 60)).toBe(50);
    expect(getTramoActivoCant(sinTramos, 60)).toBeNull();
  });
});
