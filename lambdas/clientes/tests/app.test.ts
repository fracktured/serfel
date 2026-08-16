import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Db } from "@serfel/db";
import type { AppDeps } from "../types";

const mocks = vi.hoisted(() => ({
  getUserTipo: vi.fn(),
  getClienteLookups: vi.fn(),
  listClientes: vi.fn(),
  createCliente: vi.fn(),
  updateCliente: vi.fn(),
  activateCliente: vi.fn(),
  deactivateCliente: vi.fn(),
  getLocalLookups: vi.fn(),
  listLocales: vi.fn(),
  createLocal: vi.fn(),
  updateLocal: vi.fn(),
  deactivateLocal: vi.fn(),
  activateLocal: vi.fn(),
}));
vi.mock("../service", () => mocks);

const { createApp } = await import("../app");
const fakeDb = {} as Db;

function makeApp(overrides: Partial<AppDeps> = {}) {
  return createApp({ getDb: async () => fakeDb, getIdUsuario: () => 1, ...overrides });
}
function postJson(body: unknown) {
  return { method: "POST" as const, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
const validCreate = {
  rut: "12345678-5", razonSocial: "Comercial Uno SpA", nomFantasia: "Uno",
  telefono: "111", direccion: "Calle 1", comuna: "Prov", ciudad: "Stgo",
  email: "uno@serfel.cl", idListaPrecio: 1, permiteVentaDeuda: false,
};
const validLocal = {
  nombre: "Sucursal Centro", direccion: "Av. Siempre Viva 123", idVendedor: 1, idFormaPago: 1,
};

beforeEach(() => { vi.clearAllMocks(); mocks.getUserTipo.mockResolvedValue(1); });

describe("clientes app", () => {
  it("403s when there is no id_usuario claim", async () => {
    const app = makeApp({ getIdUsuario: () => null });
    const res = await app.request("/api/clientes?estado=activos");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
  });

  it("403 PROHIBIDO when a non-admin hits /clientes", async () => {
    mocks.getUserTipo.mockResolvedValue(2);
    const res = await makeApp().request("/api/clientes?estado=activos");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("PROHIBIDO");
  });

  it("lists clientes", async () => {
    mocks.listClientes.mockResolvedValue([{ rutCliente: 1 }]);
    const res = await makeApp().request("/api/clientes?estado=activos");
    expect(res.status).toBe(200);
    expect(mocks.listClientes).toHaveBeenCalledWith(fakeDb, "activos");
  });

  it("400s an invalid estado", async () => {
    const res = await makeApp().request("/api/clientes?estado=foo");
    expect(res.status).toBe(400);
  });

  it("creates a cliente", async () => {
    mocks.createCliente.mockResolvedValue({ kind: "created", dto: { rutCliente: 12345678 } });
    const res = await makeApp().request("/api/clientes", postJson(validCreate));
    expect(res.status).toBe(201);
  });

  it("returns 409 RUT_INACTIVO with the rut in the body", async () => {
    mocks.createCliente.mockResolvedValue({ kind: "inactive", rut: 12345678 });
    const res = await makeApp().request("/api/clientes", postJson(validCreate));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("RUT_INACTIVO");
    expect(body.rut).toBe(12345678);
  });

  it("400s a create with an invalid RUT", async () => {
    const res = await makeApp().request("/api/clientes", postJson({ ...validCreate, rut: "12345678-9" }));
    expect(res.status).toBe(400);
  });

  it("updates a cliente by rut", async () => {
    mocks.updateCliente.mockResolvedValue({ rutCliente: 12345678 });
    const { rut, ...updateBody } = validCreate;
    const res = await makeApp().request("/api/clientes/12345678", { ...postJson(updateBody), method: "PUT" });
    expect(res.status).toBe(200);
    expect(mocks.updateCliente).toHaveBeenCalledWith(fakeDb, 12345678, expect.objectContaining({ razonSocial: "Comercial Uno SpA" }), 1);
  });

  it("activates (restores) a cliente by rut", async () => {
    mocks.activateCliente.mockResolvedValue({ rutCliente: 12345678, idEstado: 1 });
    const { rut, ...updateBody } = validCreate;
    const res = await makeApp().request("/api/clientes/12345678/activate", postJson(updateBody));
    expect(res.status).toBe(200);
  });

  it("deactivates a cliente by rut", async () => {
    mocks.deactivateCliente.mockResolvedValue({ rutCliente: 12345678, idEstado: 0 });
    const res = await makeApp().request("/api/clientes/12345678/deactivate", postJson({}));
    expect(res.status).toBe(200);
  });

  it("400s an invalid rut param", async () => {
    const res = await makeApp().request("/api/clientes/abc/deactivate", postJson({}));
    expect(res.status).toBe(400);
  });

  it("GET /api/locales/lookups returns lookups", async () => {
    mocks.getLocalLookups.mockResolvedValue({ formasPago: [], vendedores: [] });
    const res = await makeApp().request("/api/locales/lookups");
    expect(res.status).toBe(200);
    expect(mocks.getLocalLookups).toHaveBeenCalledWith(fakeDb);
  });

  it("GET /api/clientes/:rut/locales lists the client's locales", async () => {
    mocks.listLocales.mockResolvedValue([{ idLocalCliente: 1 }]);
    const res = await makeApp().request("/api/clientes/12345678/locales?estado=activos");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(mocks.listLocales).toHaveBeenCalledWith(fakeDb, 12345678, "activos");
  });

  it("400s an invalid estado on locales list", async () => {
    const res = await makeApp().request("/api/clientes/12345678/locales?estado=foo");
    expect(res.status).toBe(400);
    expect(mocks.listLocales).not.toHaveBeenCalled();
  });

  it("POST /api/clientes/:rut/locales creates a local", async () => {
    mocks.createLocal.mockResolvedValue({ idLocalCliente: 1, rutCliente: 12345678 });
    const res = await makeApp().request("/api/clientes/12345678/locales", postJson(validLocal));
    expect(res.status).toBe(201);
    expect(mocks.createLocal).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({ rutCliente: 12345678, nombre: "Sucursal Centro" }),
      1,
    );
  });

  it("400s a local create missing required fields", async () => {
    const res = await makeApp().request("/api/clientes/12345678/locales", postJson({ nombre: "X" }));
    expect(res.status).toBe(400);
    expect(mocks.createLocal).not.toHaveBeenCalled();
  });

  it("updates a local by id", async () => {
    mocks.updateLocal.mockResolvedValue({ idLocalCliente: 5 });
    const res = await makeApp().request("/api/locales/5", { ...postJson(validLocal), method: "PUT" });
    expect(res.status).toBe(200);
    expect(mocks.updateLocal).toHaveBeenCalledWith(fakeDb, 5, expect.objectContaining({ nombre: "Sucursal Centro" }), 1);
  });

  it("deactivates a local by id", async () => {
    mocks.deactivateLocal.mockResolvedValue({ idLocalCliente: 5, idEstado: 0 });
    const res = await makeApp().request("/api/locales/5", { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(mocks.deactivateLocal).toHaveBeenCalledWith(fakeDb, 5, 1);
  });

  it("activates a local by id", async () => {
    mocks.activateLocal.mockResolvedValue({ idLocalCliente: 5, idEstado: 1 });
    const res = await makeApp().request("/api/locales/5/activate", postJson(validLocal));
    expect(res.status).toBe(200);
    expect(mocks.activateLocal).toHaveBeenCalledWith(fakeDb, 5, expect.objectContaining({ nombre: "Sucursal Centro" }), 1);
  });

  it("400s an invalid id param", async () => {
    const res = await makeApp().request("/api/locales/abc", { method: "DELETE" });
    expect(res.status).toBe(400);
  });
});
