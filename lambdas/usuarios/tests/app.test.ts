import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Db } from "@serfel/db";
import type { AppDeps } from "../types";

const mocks = vi.hoisted(() => ({
  getUserTipo: vi.fn(),
  getMe: vi.fn(),
  getUsuarioLookups: vi.fn(),
  listUsuarios: vi.fn(),
  createUsuario: vi.fn(),
  updateUsuario: vi.fn(),
  activateUsuario: vi.fn(),
  deactivateUsuario: vi.fn(),
  getUsuarioForCognito: vi.fn(),
}));

vi.mock("../service", () => mocks);

const { createApp } = await import("../app");

const fakeDb = {} as Db;

function makeApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    getDb: async () => fakeDb,
    getIdUsuario: () => 1,
    listEnrolledIds: async () => new Set<number>(),
    enrollCognito: vi.fn(async () => {}),
    ...overrides,
  });
}

function postJson(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

const validCreateBody = {
  rut: "12345678-5", nomUsuario: "Juan", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
  idTipoUsuario: 2, telefonoUsuario: "+56 9 1234 5678", direccionUsuario: "Calle 1",
  emailUsuario: "juan@serfel.cl", numUsuario: 10, password: "secret1",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserTipo.mockResolvedValue(1); // admin: passes the usuarios module gate
});

describe("usuarios app", () => {
  it("403s when there is no id_usuario claim", async () => {
    const app = makeApp({ getIdUsuario: () => null });
    const res = await app.request("/api/usuarios?estado=activos");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
  });

  it("403 PROHIBIDO when a non-admin hits /usuarios", async () => {
    mocks.getUserTipo.mockResolvedValue(2); // vendedor: not in MODULE_ROLES.usuarios
    const app = makeApp();
    const res = await app.request("/api/usuarios?estado=activos");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("PROHIBIDO");
  });

  it("GET /api/usuarios merges tieneCognito from listEnrolledIds", async () => {
    mocks.listUsuarios.mockResolvedValue([
      { idUsuario: 1, tieneCognito: false },
      { idUsuario: 2, tieneCognito: false },
    ]);
    const app = makeApp({ listEnrolledIds: async () => new Set([1]) });
    const res = await app.request("/api/usuarios?estado=activos");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.find((u: any) => u.idUsuario === 1).tieneCognito).toBe(true);
    expect(body.find((u: any) => u.idUsuario === 2).tieneCognito).toBe(false);
  });

  it("GET /api/usuarios 400s on an invalid estado", async () => {
    const app = makeApp();
    const res = await app.request("/api/usuarios?estado=zzz");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });

  it("GET /api/usuarios/lookups delegates to the service", async () => {
    mocks.getUsuarioLookups.mockResolvedValue({ tiposUsuario: [{ id: 1, nombre: "Admin" }] });
    const app = makeApp();
    const res = await app.request("/api/usuarios/lookups");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tiposUsuario: [{ id: 1, nombre: "Admin" }] });
  });

  it("GET /api/me returns the caller's profile", async () => {
    mocks.getMe.mockResolvedValue({ idUsuario: 1, idTipoUsuario: 1, nomUsuario: "Admin", modulos: ["usuarios"] });
    const app = makeApp();
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    expect((await res.json()).nomUsuario).toBe("Admin");
  });

  it("POST /api/usuarios 201s and returns the dto on success", async () => {
    mocks.createUsuario.mockResolvedValue({ kind: "created", dto: { idUsuario: 5 } });
    const app = makeApp();
    const res = await app.request("/api/usuarios", postJson(validCreateBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ idUsuario: 5 });
  });

  it("POST /api/usuarios returns 409 RUT_INACTIVO with idUsuario when the service reports an inactive RUT", async () => {
    mocks.createUsuario.mockResolvedValue({ kind: "inactive", idUsuario: 42 });
    const app = makeApp();
    const res = await app.request("/api/usuarios", postJson(validCreateBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("RUT_INACTIVO");
    expect(body.idUsuario).toBe(42);
  });

  it("POST /api/usuarios surfaces RUT_EN_USO/NUM_EN_USO/EMAIL_EN_USO from the service", async () => {
    const { AppError } = await import("../errors");
    mocks.createUsuario.mockRejectedValue(new AppError("NUM_EN_USO", 409, "en uso"));
    const app = makeApp();
    const res = await app.request("/api/usuarios", postJson(validCreateBody));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("NUM_EN_USO");
  });

  it("POST /api/usuarios 400s on an invalid body", async () => {
    const app = makeApp();
    const res = await app.request("/api/usuarios", postJson({ ...validCreateBody, rut: "not-a-rut" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });

  it("PUT /api/usuarios/:id updates via the service", async () => {
    mocks.updateUsuario.mockResolvedValue({ idUsuario: 7, nomUsuario: "Cambiado" });
    const app = makeApp();
    const res = await app.request("/api/usuarios/7", {
      ...postJson({
        nomUsuario: "Cambiado", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
        idTipoUsuario: 2, telefonoUsuario: "1", direccionUsuario: "d",
        emailUsuario: "u@serfel.cl", numUsuario: 31,
      }),
      method: "PUT",
    });
    expect(res.status).toBe(200);
    expect((await res.json()).nomUsuario).toBe("Cambiado");
    expect(mocks.updateUsuario).toHaveBeenCalledWith(fakeDb, 7, expect.any(Object), 1);
  });

  it("PUT /api/usuarios/:id 400s on a non-numeric id", async () => {
    const app = makeApp();
    const res = await app.request("/api/usuarios/abc", {
      ...postJson({
        nomUsuario: "X", apellPatUsuario: "P", apellMatUsuario: "S",
        idTipoUsuario: 2, telefonoUsuario: "1", direccionUsuario: "d",
        emailUsuario: "u@serfel.cl", numUsuario: 31,
      }),
      method: "PUT",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });

  it("POST /api/usuarios/:id/activate reactivates via the service", async () => {
    mocks.activateUsuario.mockResolvedValue({ idUsuario: 8, idEstado: 1 });
    const app = makeApp();
    const res = await app.request("/api/usuarios/8/activate", postJson(validCreateBody));
    expect(res.status).toBe(200);
    expect((await res.json()).idEstado).toBe(1);
  });

  it("POST /api/usuarios/:id/deactivate soft-deletes via the service", async () => {
    mocks.deactivateUsuario.mockResolvedValue({ idUsuario: 9, idEstado: 0 });
    const app = makeApp();
    const res = await app.request("/api/usuarios/9/deactivate", { method: "POST" });
    expect(res.status).toBe(200);
    expect((await res.json()).idEstado).toBe(0);
  });

  it("POST /api/usuarios/:id/cognito calls enrollCognito with the user's email and returns 200", async () => {
    mocks.getUsuarioForCognito.mockResolvedValue({ email: "x@serfel.cl" });
    const enrollCognito = vi.fn(async () => {});
    const app = makeApp({ enrollCognito });
    const res = await app.request("/api/usuarios/5/cognito", { method: "POST" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(enrollCognito).toHaveBeenCalledWith("x@serfel.cl", 5);
  });
});
