import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema, MarcaInputSchema, type ApiErrorBody,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import {
  createMarca, deactivateMarca, listMarcas, restoreMarca, updateMarca,
} from "./service";
import { requireModule } from "./authz";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDACION", 400, "id de marca inválido");
  }
  return id;
}

async function parseInput(c: Context) {
  const raw = await c.req.json().catch(() => {
    throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido");
  });
  const parsed = MarcaInputSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
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
        errorBody("DB_NO_DISPONIBLE",
          "La base de datos no está disponible en este momento. Intenta más tarde."),
        503
      );
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

  const marcas = requireModule("marcas", deps);
  app.use("/marcas", marcas);
  app.use("/marcas/*", marcas);

  app.get("/marcas", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) {
      throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    }
    return c.json(await listMarcas(await deps.getDb(), parsed.data));
  });

  app.post("/marcas", async (c) => {
    const input = await parseInput(c);
    return c.json(await createMarca(await deps.getDb(), input), 201);
  });

  app.put("/marcas/:id", async (c) => {
    const id = parseId(c);
    const input = await parseInput(c);
    return c.json(await updateMarca(await deps.getDb(), id, input));
  });

  app.delete("/marcas/:id", async (c) => {
    const id = parseId(c);
    return c.json(await deactivateMarca(await deps.getDb(), id));
  });

  app.post("/marcas/:id/restore", async (c) => {
    const id = parseId(c);
    return c.json(await restoreMarca(await deps.getDb(), id));
  });

  return app;
}
