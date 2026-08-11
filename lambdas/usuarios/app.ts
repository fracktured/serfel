import { Hono, type Context } from "hono";
import {
  EstadoFilterSchema, UsuarioCreateSchema, UsuarioUpdateSchema, type ApiErrorBody,
} from "@serfel/shared";
import { AppError, isDbUnreachable } from "./errors";
import { requireModule } from "./authz";
import {
  activateUsuario, createUsuario, deactivateUsuario, getMe, getUsuarioForCognito,
  getUsuarioLookups, listUsuarios, updateUsuario,
} from "./service";
import type { AppDeps, AppEnv } from "./types";

function errorBody(code: ApiErrorBody["error"]["code"], message: string): ApiErrorBody {
  return { error: { code, message } };
}

function parseId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new AppError("VALIDACION", 400, "id de usuario inválido");
  return id;
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

  const gate = requireModule("usuarios", deps);
  app.use("/usuarios", gate);
  app.use("/usuarios/*", gate);

  // Not wired in infra (products serves /api/me); kept for pattern parity + tests.
  app.get("/me", async (c) => c.json(await getMe(await deps.getDb(), c.get("idUsuario"))));

  app.get("/usuarios/lookups", async (c) => c.json(await getUsuarioLookups(await deps.getDb())));

  app.get("/usuarios", async (c) => {
    const parsed = EstadoFilterSchema.safeParse(c.req.query("estado"));
    if (!parsed.success) throw new AppError("VALIDACION", 400, "estado debe ser activos, inactivos o todos");
    const [rows, enrolled] = await Promise.all([
      listUsuarios(await deps.getDb(), parsed.data),
      deps.listEnrolledIds(),
    ]);
    return c.json(rows.map((r) => ({ ...r, tieneCognito: enrolled.has(r.idUsuario) })));
  });

  app.post("/usuarios", async (c) => {
    const input = await parseBody<import("@serfel/shared").UsuarioCreateInput>(c, UsuarioCreateSchema);
    const res = await createUsuario(await deps.getDb(), input, c.get("idUsuario"));
    if (res.kind === "inactive") {
      return c.json({ ...errorBody("RUT_INACTIVO", "El RUT existe pero está inactivo. ¿Deseas reactivarlo?"), idUsuario: res.idUsuario }, 409);
    }
    return c.json(res.dto, 201);
  });

  app.put("/usuarios/:id", async (c) => {
    const id = parseId(c);
    const input = await parseBody<import("@serfel/shared").UsuarioUpdateInput>(c, UsuarioUpdateSchema);
    return c.json(await updateUsuario(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.post("/usuarios/:id/activate", async (c) => {
    const id = parseId(c);
    const input = await parseBody<import("@serfel/shared").UsuarioCreateInput>(c, UsuarioCreateSchema);
    return c.json(await activateUsuario(await deps.getDb(), id, input, c.get("idUsuario")));
  });

  app.post("/usuarios/:id/deactivate", async (c) => {
    const id = parseId(c);
    return c.json(await deactivateUsuario(await deps.getDb(), id, c.get("idUsuario")));
  });

  app.post("/usuarios/:id/cognito", async (c) => {
    const id = parseId(c);
    const { email } = await getUsuarioForCognito(await deps.getDb(), id);
    await deps.enrollCognito(email, id);
    return c.json({ ok: true });
  });

  return app;
}
