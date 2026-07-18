import { tipoCanAccess, type MeDto, type ModuleName } from "@serfel/shared";

/** UX-only check mirroring the API's authorization. Null session = no access. */
export function sessionCanAccess(
  me: MeDto | null,
  module: ModuleName
): boolean {
  return me !== null && tipoCanAccess(module, me.idTipoUsuario);
}
