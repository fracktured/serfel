import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { createApp } from "../app";

let db: Db;
let teardown: () => Promise<void>;
let currentUser: number | null = SEED.idUsuario;

const appPromise = (async () => {
  ({ db, teardown } = await setupTestDb("serfel_products_app"));
  return createApp({
    getDb: async () => db,
    getIdUsuario: () => currentUser,
  });
})();

afterAll(async () => {
  await teardown();
});

const validBody = {
  codSerfel: 900,
  nomProducto: "APP TEST",
  idMarca: SEED.marcaSoprole,
  idUm: SEED.umUni,
  idTipoProducto: SEED.tipoYogurt,
  impuesto: SEED.impSinAdicional,
  usaPorciones: 0,
};

function json(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("products app", () => {
  it("403s when there is no id_usuario claim", async () => {
    const app = await appPromise;
    currentUser = null;
    try {
      const res = await app.request("/api/products");
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
    } finally {
      currentUser = SEED.idUsuario;
    }
  });

  it("GET /api/lookups returns the three lists", async () => {
    const app = await appPromise;
    const res = await app.request("/api/lookups");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.marcas.length).toBeGreaterThan(0);
    expect(body.tiposProducto.length).toBeGreaterThan(0);
    expect(body.unidadesMedida.length).toBeGreaterThan(0);
  });

  it("POST /api/products creates (201) and GET lists it", async () => {
    const app = await appPromise;
    const created = await app.request("/api/products", json(validBody));
    expect(created.status).toBe(201);
    const dto = await created.json();
    expect(dto.codSerfel).toBe(900);

    const list = await app.request("/api/products?estado=activos");
    expect(list.status).toBe(200);
    expect((await list.json()).some((p: { codSerfel: number }) => p.codSerfel === 900)).toBe(true);
  });

  it("400s on invalid body and invalid estado", async () => {
    const app = await appPromise;
    const bad = await app.request("/api/products", json({ ...validBody, codSerfel: -1 }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("VALIDACION");

    const badEstado = await app.request("/api/products?estado=zzz");
    expect(badEstado.status).toBe(400);
  });

  it("409s with the machine-readable code on duplicate codigo", async () => {
    const app = await appPromise;
    const dup = await app.request(
      "/api/products",
      json({ ...validBody, nomProducto: "OTRO" })
    );
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("COD_SERFEL_EN_USO");
  });

  it("PUT / DELETE / restore round-trip", async () => {
    const app = await appPromise;
    const created = await app.request(
      "/api/products",
      json({ ...validBody, codSerfel: 901, nomProducto: "ROUNDTRIP" })
    );
    const { idProducto } = await created.json();

    const put = await app.request(`/api/products/${idProducto}`, {
      ...json({ ...validBody, codSerfel: 901, nomProducto: "ROUNDTRIP 2" }),
      method: "PUT",
    });
    expect(put.status).toBe(200);
    expect((await put.json()).nomProducto).toBe("ROUNDTRIP 2");

    const del = await app.request(`/api/products/${idProducto}`, { method: "DELETE" });
    expect(del.status).toBe(200);
    expect((await del.json()).idEstado).toBe(0);

    const restore = await app.request(`/api/products/${idProducto}/restore`, {
      method: "POST",
    });
    expect(restore.status).toBe(200);
    expect((await restore.json()).idEstado).toBe(1);
  });

  it("404s on unknown ids and 400s on non-numeric ids", async () => {
    const app = await appPromise;
    const notFound = await app.request("/api/products/999999", { method: "DELETE" });
    expect(notFound.status).toBe(404);
    const badId = await app.request("/api/products/abc", { method: "DELETE" });
    expect(badId.status).toBe(400);
  });
});

describe("role-based access", () => {
  it("GET /api/me works for any authenticated user (admin)", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuario;
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      idUsuario: SEED.idUsuario,
      idTipoUsuario: SEED.tipoAdmin,
      modulos: ["productos"],
    });
  });

  it("GET /api/me works for a vendedor and reports no modules", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuarioVendedor;
    const res = await app.request("/api/me");
    expect(res.status).toBe(200);
    expect((await res.json()).modulos).toEqual([]);
    currentUser = SEED.idUsuario;
  });

  it("403 PROHIBIDO when a vendedor hits products or lookups", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuarioVendedor;
    try {
      const prods = await app.request("/api/products");
      expect(prods.status).toBe(403);
      expect((await prods.json()).error.code).toBe("PROHIBIDO");

      const looks = await app.request("/api/lookups");
      expect(looks.status).toBe(403);
      expect((await looks.json()).error.code).toBe("PROHIBIDO");
    } finally {
      currentUser = SEED.idUsuario;
    }
  });

  it("admin still gets 200 on products and lookups", async () => {
    const app = await appPromise;
    currentUser = SEED.idUsuario;
    expect((await app.request("/api/products")).status).toBe(200);
    expect((await app.request("/api/lookups")).status).toBe(200);
  });
});
