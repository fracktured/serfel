import { Hono, type Context } from "hono";
import {
  ListaPrecioInputSchema, PrecioProductoInputSchema, BulkInputSchema,
  type ApiErrorBody, type ApiErrorCode,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import {
  listListas, createLista, updateLista, deactivateLista,
  getGrid, upsertPrecioProducto, bulkApply,
} from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorCode, message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseIntParam(c: Context, name: string, label: string): number {
  const v = Number(c.req.param(name));
  if (!Number.isInteger(v) || v <= 0) {
    throw new AppError("VALIDACION", 400, `${label} inválido`);
  }
  return v;
}

async function parseBody<T>(c: Context, schema: { safeParse: (x: unknown) => any }): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data as T;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json(errorBody(err.code, err.message), err.status);
    if (isDbUnreachable(err)) {
      return c.json(errorBody("DB_NO_DISPONIBLE",
        "La base de datos no está disponible en este momento. Intenta más tarde."), 503);
    }
    console.error("unhandled error", err);
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) {
      throw new AppError("NO_AUTORIZADO", 403,
        "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)");
    }
    c.set("idUsuario", idUsuario);
    await next();
  });

  const gate = requireModule("precios", deps);
  app.use("/listas-precio", gate);
  app.use("/listas-precio/*", gate);

  app.get("/listas-precio", async (c) =>
    c.json(await listListas(await deps.getDb())));

  app.post("/listas-precio", async (c) => {
    const input = await parseBody(c, ListaPrecioInputSchema);
    return c.json(await createLista(await deps.getDb(), input as any, c.get("idUsuario")), 201);
  });

  app.patch("/listas-precio/:id", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    const input = await parseBody(c, ListaPrecioInputSchema);
    return c.json(await updateLista(await deps.getDb(), id, input as any, c.get("idUsuario")));
  });

  app.delete("/listas-precio/:id", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    return c.json(await deactivateLista(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.get("/listas-precio/:id/productos", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    return c.json(await getGrid(await deps.getDb(), id));
  });

  app.patch("/listas-precio/:id/productos/:idProducto", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    const idProducto = parseIntParam(c, "idProducto", "id de producto");
    const input = await parseBody(c, PrecioProductoInputSchema);
    return c.json(await upsertPrecioProducto(await deps.getDb(), id, idProducto, input as any));
  });

  app.post("/listas-precio/:id/productos/bulk", async (c) => {
    const id = parseIntParam(c, "id", "id de lista");
    const input = await parseBody(c, BulkInputSchema);
    return c.json(await bulkApply(await deps.getDb(), id, input as any));
  });

  return app;
}
