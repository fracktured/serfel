import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { createApp } from "../app";
import { setupTestDb, SEED } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;
let app: ReturnType<typeof createApp>;

function makeApp(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario });
}

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_test_marcas_app"));
  app = makeApp(SEED.idUsuario);
});
afterAll(async () => { await teardown(); });

describe("marcas app", () => {
  it("POST then GET /api/marcas round-trips", async () => {
    const post = await app.request("/api/marcas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomMarca: "SOPROLE", descMarca: "Lacteos" }),
    });
    expect(post.status).toBe(201);

    const get = await app.request("/api/marcas?estado=activos");
    expect(get.status).toBe(200);
    const list = (await get.json()) as { nomMarca: string }[];
    expect(list.map((m) => m.nomMarca)).toContain("SOPROLE");
  });

  it("rejects invalid body with 400 VALIDACION", async () => {
    const res = await app.request("/api/marcas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomMarca: "" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDACION");
  });

  it("DELETE soft-deletes and returns idEstado 0", async () => {
    const post = await app.request("/api/marcas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nomMarca: "WATTS" }),
    });
    const created = (await post.json()) as { idMarca: number };
    const del = await app.request(`/api/marcas/${created.idMarca}`, { method: "DELETE" });
    expect(del.status).toBe(200);
    expect(((await del.json()) as { idEstado: number }).idEstado).toBe(0);
  });

  it("403 when the user is not mapped (idUsuario null)", async () => {
    const anon = makeApp(null);
    const res = await anon.request("/api/marcas?estado=activos");
    expect(res.status).toBe(403);
  });

  it("403 PROHIBIDO for a non-admin tipo", async () => {
    const vendedor = makeApp(SEED.idUsuarioVendedor);
    const res = await vendedor.request("/api/marcas?estado=activos");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("PROHIBIDO");
  });
});
