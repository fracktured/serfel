import { createMiddleware } from "hono/factory";
import { tipoCanAccess, type ModuleName } from "@serfel/shared";
import { AppError } from "./errors";
import { getUserTipo } from "./service";
import type { AppDeps, AppEnv } from "./types";

export function requireModule(module: ModuleName, deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const idUsuario = c.get("idUsuario");
    const tipo = await getUserTipo(await deps.getDb(), idUsuario);
    if (tipo === null) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no existe en el sistema");
    if (!tipoCanAccess(module, tipo)) throw new AppError("PROHIBIDO", 403, "No tienes acceso a este módulo");
    c.set("idTipoUsuario", tipo);
    await next();
  });
}
