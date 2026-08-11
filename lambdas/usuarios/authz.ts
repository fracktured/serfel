import { createMiddleware } from "hono/factory";
import { tipoCanAccess, type ModuleName } from "@serfel/shared";
import { AppError } from "./errors";
import { getUserTipo } from "./service";
import type { AppDeps, AppEnv } from "./types";

/**
 * Authorization gate for a module. Assumes an earlier middleware has already
 * set `idUsuario` on the context (authenticated + mapped). Loads the user's
 * id_tipo_usuario from the DB and checks it against MODULE_ROLES.
 */
export function requireModule(module: ModuleName, deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const idUsuario = c.get("idUsuario");
    const tipo = await getUserTipo(await deps.getDb(), idUsuario);
    if (tipo === null) {
      throw new AppError(
        "NO_AUTORIZADO",
        403,
        "El usuario autenticado no existe en el sistema"
      );
    }
    if (!tipoCanAccess(module, tipo)) {
      throw new AppError(
        "PROHIBIDO",
        403,
        "No tienes acceso a este módulo"
      );
    }
    c.set("idTipoUsuario", tipo);
    await next();
  });
}
