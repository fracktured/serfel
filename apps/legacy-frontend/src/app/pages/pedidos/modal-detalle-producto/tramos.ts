export interface TramoPricing {
  maxPorcenDesc: number;
  cantTramo1?: number;
  maxPorcenTramo1?: number;
  cantTramo2?: number;
  maxPorcenTramo2?: number;
  cantTramo3?: number;
  maxPorcenTramo3?: number;
}

export interface Tramo {
  cant: number;
  max: number;
}

function todosLosTramos(p: TramoPricing): Tramo[] {
  return [
    { cant: Number(p.cantTramo1) || 0, max: Number(p.maxPorcenTramo1) || 0 },
    { cant: Number(p.cantTramo2) || 0, max: Number(p.maxPorcenTramo2) || 0 },
    { cant: Number(p.cantTramo3) || 0, max: Number(p.maxPorcenTramo3) || 0 },
  ];
}

export function getTramosActivos(p: TramoPricing): Tramo[] {
  return todosLosTramos(p).filter(t => t.cant > 0);
}

export function getTechoEfectivo(p: TramoPricing, cantidad: number): number {
  let techo = Number(p.maxPorcenDesc) || 0;
  const qty = Number(cantidad) || 0;
  for (const t of getTramosActivos(p)) {
    if (qty >= t.cant) {
      techo = t.max;
    }
  }
  return techo;
}

export function getTramoActivoCant(p: TramoPricing, cantidad: number): number | null {
  let activo: number | null = null;
  const qty = Number(cantidad) || 0;
  for (const t of getTramosActivos(p)) {
    if (qty >= t.cant) {
      activo = t.cant;
    }
  }
  return activo;
}
