import { Hono } from "hono";
import { RutaSelectionSchema, type ApiErrorBody } from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { getCargoListData, listActiveRutas } from "./service";
import { renderCargoListPdf } from "./pdf";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
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

  const rutas = requireModule("rutas", deps);
  app.use("/routes", rutas);
  app.use("/routes/*", rutas);

  app.get("/routes", async (c) => c.json(await listActiveRutas(await deps.getDb())));

  app.post("/routes/cargoList", async (c) => {
    const raw = await c.req.json().catch(() => {
      throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
    });
    const parsed = RutaSelectionSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "Debe enviar al menos una ruta");
    }
    const data = await getCargoListData(await deps.getDb(), parsed.data);
    const pdf = await renderCargoListPdf(data);
    // application/pdf is treated as binary by hono/aws-lambda (base64-encoded,
    // isBase64Encoded=true), and HTTP API decodes it for the browser.
    return new Response(pdf as BodyInit, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  });

  return app;
}
