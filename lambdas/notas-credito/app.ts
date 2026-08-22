import { Hono } from "hono";
import { EmitirNcInputSchema, type ApiErrorBody, type ModuleName } from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { searchVentasCreditables, listNotasCredito, emitirNotaCredito, getPdfLinks } from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json(errorBody(err.code, err.message), err.status);
    if (isDbUnreachable(err)) return c.json(errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible."), 503);
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) throw new AppError("NO_AUTORIZADO", 403, "Usuario sin mapeo interno");
    c.set("idUsuario", idUsuario);
    await next();
  });

  // "notas_credito" is not yet registered in @serfel/shared's MODULE_ROLES (a later
  // task adds it); cast is intentional so this gate compiles and is wired ahead of that.
  const gate = requireModule("notas_credito" as ModuleName, deps);
  app.use("/notas-credito", gate);
  app.use("/notas-credito/*", gate);

  app.get("/notas-credito/ventas", async (c) =>
    c.json(await searchVentasCreditables(await deps.getDb(), c.req.query("q") ?? "")));
  app.get("/notas-credito", async (c) => c.json(await listNotasCredito(await deps.getDb())));
  app.post("/notas-credito", async (c) => {
    const raw = await c.req.json().catch(() => { throw new AppError("VALIDACION", 400, "JSON inválido"); });
    const parsed = EmitirNcInputSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new AppError("VALIDACION", 400, detail);
    }
    return c.json(await emitirNotaCredito(await deps.getDb(), deps.invokeEmisor, parsed.data, c.get("idUsuario")));
  });
  app.get("/notas-credito/:id/pdf", async (c) =>
    c.json(await getPdfLinks(await deps.getDb(), deps.invokeEmisor, Number(c.req.param("id")))));

  return app;
}
