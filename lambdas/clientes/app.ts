import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema, ClienteCreateSchema, ClienteUpdateSchema, type ApiErrorBody,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { requireModule } from "./authz";
import {
  activateCliente, createCliente, deactivateCliente, getClienteLookups,
  listClientes, updateCliente,
} from "./service";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseRutParam(c: Context): number {
  const rut = Number(c.req.param("rut"));
  if (!Number.isInteger(rut) || rut <= 0) throw new AppError("VALIDACION", 400, "rut de cliente inválido");
  return rut;
}

async function parseBody<T>(c: Context, schema: { safeParse: (v: unknown) => any }): Promise<T> {
  const raw = await c.req.json().catch(() => { throw new AppError("VALIDACION", 400, "El cuerpo debe ser JSON válido"); });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AppError("VALIDACION", 400, detail);
  }
  return parsed.data as T;
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json(errorBody(err.code, err.message), err.status);
    if (isDbUnreachable(err)) return c.json(errorBody("DB_NO_DISPONIBLE", "La base de datos no está disponible en este momento. Intenta más tarde."), 503);
    console.error("unhandled error", { message: err instanceof Error ? err.message : String(err), code: (err as { code?: string }).code });
    return c.json(errorBody("ERROR_INTERNO", "Error interno del servidor"), 500);
  });

  app.use("*", async (c, next) => {
    const idUsuario = deps.getIdUsuario(c);
    if (idUsuario === null) throw new AppError("NO_AUTORIZADO", 403, "El usuario autenticado no tiene mapeo a un usuario interno (custom:id_usuario)");
    c.set("idUsuario", idUsuario);
    await next();
  });

  const gate = requireModule("clientes", deps);
  app.use("/clientes", gate);
  app.use("/clientes/*", gate);

  app.get("/clientes/lookups", async (c) => c.json(await getClienteLookups(await deps.getDb())));

  app.get("/clientes", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    return c.json(await listClientes(await deps.getDb(), parsed.data));
  });

  app.post("/clientes", async (c) => {
    const input = await parseBody<import("@serfel/shared").ClienteCreateInput>(c, ClienteCreateSchema);
    const res = await createCliente(await deps.getDb(), input, c.get("idUsuario"));
    if (res.kind === "inactive") {
      return c.json({ ...errorBody("RUT_INACTIVO", "El RUT existe pero está inactivo. ¿Deseas reactivarlo?"), rut: res.rut }, 409);
    }
    return c.json(res.dto, 201);
  });

  app.put("/clientes/:rut", async (c) => {
    const rut = parseRutParam(c);
    const input = await parseBody<import("@serfel/shared").ClienteUpdateInput>(c, ClienteUpdateSchema);
    return c.json(await updateCliente(await deps.getDb(), rut, input, c.get("idUsuario")));
  });

  app.post("/clientes/:rut/activate", async (c) => {
    const rut = parseRutParam(c);
    const input = await parseBody<import("@serfel/shared").ClienteUpdateInput>(c, ClienteUpdateSchema);
    return c.json(await activateCliente(await deps.getDb(), rut, input, c.get("idUsuario")));
  });

  app.post("/clientes/:rut/deactivate", async (c) => {
    const rut = parseRutParam(c);
    return c.json(await deactivateCliente(await deps.getDb(), rut, c.get("idUsuario")));
  });

  return app;
}
