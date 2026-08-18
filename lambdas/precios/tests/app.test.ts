import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { createApp } from "../app";
import { setupPreciosTestDb, seedLista, SEED } from "./helpers";

let db: Db;
let teardown: () => Promise<void>;

function makeApp(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario });
}

beforeAll(async () => {
  ({ db, teardown } = await setupPreciosTestDb("serfel_test_precios_app"));
  await seedLista(db, 70, "AppLista");
});
afterAll(async () => { await teardown(); });

describe("precios app", () => {
  const app = () => makeApp(SEED.idUsuario);

  it("POST then GET /api/listas-precio round-trips", async () => {
    const post = await app().request("/api/listas-precio", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Nueva" }),
    });
    expect(post.status).toBe(201);
    const get = await app().request("/api/listas-precio");
    const list = (await get.json()) as { nombre: string }[];
    expect(list.map((l) => l.nombre)).toContain("Nueva");
  });

  it("GET grid returns rows", async () => {
    const res = await app().request("/api/listas-precio/70/productos");
    expect(res.status).toBe(200);
    expect(((await res.json()) as unknown[]).length).toBe(2);
  });

  it("PATCH a product upserts pricing", async () => {
    const res = await app().request(`/api/listas-precio/70/productos/${SEED.prodBarato}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        precioNeto: 1000, maxPorcenDesc: 10,
        tramos: [{ cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }, { cantidad: 0, maxPorcen: 0 }],
      }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { precioBase: number }).precioBase).toBe(1190);
  });

  it("POST bulk validates body (400 on missing valor)", async () => {
    const res = await app().request("/api/listas-precio/70/productos/bulk", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "setPrecioNeto", idProductos: [SEED.prodBarato] }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDACION");
  });

  it("403 when user is not mapped", async () => {
    const res = await makeApp(null).request("/api/listas-precio");
    expect(res.status).toBe(403);
  });

  it("403 PROHIBIDO for a non-admin tipo", async () => {
    const res = await makeApp(SEED.idUsuarioVendedor).request("/api/listas-precio");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("PROHIBIDO");
  });
});
