/**
 * The single source of which id_tipo_usuario values may access each module.
 * Imported by both the Lambda authorization check and the Angular guard/nav
 * so the API and UI can never disagree. Extend by adding a module key or a
 * tipo to an existing list.
 */
export const MODULE_ROLES = {
  productos: [1], // 1 = Administrador
  rutas: [1], // 1 = Administrador
  usuarios: [1], // 1 = Administrador
  ventas: [1], // 1 = Administrador
  clientes: [1], // 1 = Administrador
  marcas: [1], // 1 = Administrador
  precios: [1], // 1 = Administrador
} as const;

export type ModuleName = keyof typeof MODULE_ROLES;

export function tipoCanAccess(module: ModuleName, tipo: number): boolean {
  // Guarded (rather than a direct cast+includes) so a module referenced ahead of its
  // MODULE_ROLES registration denies access instead of throwing — e.g. notas-credito's
  // Hono app wires requireModule("notas_credito", ...) in one task, and the corresponding
  // MODULE_ROLES entry lands in a later task.
  const roles = MODULE_ROLES[module] as readonly number[] | undefined;
  return roles ? roles.includes(tipo) : false;
}

export function modulesForTipo(tipo: number): ModuleName[] {
  return (Object.keys(MODULE_ROLES) as ModuleName[]).filter((m) =>
    tipoCanAccess(m, tipo)
  );
}

export interface MeDto {
  idUsuario: number;
  idTipoUsuario: number;
  nomUsuario: string;
  modulos: ModuleName[];
}
