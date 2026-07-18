/**
 * The single source of which id_tipo_usuario values may access each module.
 * Imported by both the Lambda authorization check and the Angular guard/nav
 * so the API and UI can never disagree. Extend by adding a module key or a
 * tipo to an existing list.
 */
export const MODULE_ROLES = {
  productos: [1], // 1 = Administrador
} as const;

export type ModuleName = keyof typeof MODULE_ROLES;

export function tipoCanAccess(module: ModuleName, tipo: number): boolean {
  return (MODULE_ROLES[module] as readonly number[]).includes(tipo);
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
