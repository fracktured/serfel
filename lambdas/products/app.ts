import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema,
  ProductoInputSchema,
  type ApiErrorBody,
} from "@serfel/shared";
import type { Db } from "@serfel/db";
import { AppError, isDbUnreachable } from "./errors";
import {
  createProduct,
  deactivateProduct,
  getLookups,
  listProducts,
  restoreProduct,
  updateProduct,
} from "./service";

export interface AppDeps {
  getDb: () => Promise<Db>;
  /** Extracts the legacy user id from the request (JWT claim in prod). */
  getIdUsuario: (c: Context) => number | null;
}

type Env = { Variables: { idUsuario: number } };

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDACION", 400, "id de producto inválido");
  }
  return id;
}

async function parseInput(c: Context) {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = ProductoInputSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<Env>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message), err.status);
    }
    if (isDbUnreachable(err)) {
      return c.json(
        errorBody(
          "DB_NO_DISPONIBLE",
          "La base de datos no está disponible en este momento. Intenta más tarde."
        ),
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

  app.get("/lookups", async (c) => c.json(await getLookups(await deps.getDb())));

  app.get("/products", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    }
    return c.json(await listProducts(await deps.getDb(), parsed.data));
  });

  app.post("/products", async (c) => {
    const input = await parseInput(c);
    const dto = await createProduct(await deps.getDb(), input, c.get("idUsuario"));
    return c.json(dto, 201);
  });

  app.put("/products/:id", async (c) => {
    const id = parseId(c);
    const input = await parseInput(c);
    return c.json(await updateProduct(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.delete("/products/:id", async (c) => {
    const id = parseId(c);
    return c.json(await deactivateProduct(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.post("/products/:id/restore", async (c) => {
    const id = parseId(c);
    return c.json(await restoreProduct(await deps.getDb(), id, c.get("idUsuario")));
  });

  return app;
}
