import { Hono, type Context } from "hono";
import { PrefacturaBatchInputSchema, type ApiErrorBody } from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { listPendientes, listEmpresas, prefacturarBatch } from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

async function parseBatch(c: Context) {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = PrefacturaBatchInputSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (isDbUnreachable(err)) {
      return c.json(
        errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible en este momento. Intenta más tarde."),
        503
      );
    }
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) {
      throw new AppError(
        "NO_AUTORIZADO",
        403,
        "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)"
      );
    }
    c.set("idUsuario", idUsuario);
    await next();
  });

  const ventas = requireModule("ventas", deps);
  app.use("/prefacturacion", ventas);
  app.use("/prefacturacion/*", ventas);

  app.get("/prefacturacion/pendientes", async (c) => c.json(await listPendientes(await deps.getDb())));
  app.get("/prefacturacion/empresas", async (c) => c.json(await listEmpresas(await deps.getDb())));
  app.post("/prefacturacion", async (c) => {
    const input = await parseBatch(c);
    return c.json(await prefacturarBatch(await deps.getDb(), input, c.get("idUsuario")));
  });

  return app;
}
