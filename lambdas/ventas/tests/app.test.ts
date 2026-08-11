import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { createApp } from "../app";

let db: Db;
let teardown: () => Promise<void>;

function appFor(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario });
}

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_ventas_app"));
});
afterAll(async () => {
  await teardown();
});

describe("authz", () => {
  it("403s a vendedor (tipo without ventas access)", async () => {
    const res = await appFor(SEED.usuarioVendedor).request("/api/prefacturacion/pendientes");
    expect(res.status).toBe(403);
  });
  it("403s when there is no id_usuario mapping", async () => {
    const res = await appFor(null).request("/api/prefacturacion/pendientes");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/prefacturacion/pendientes", () => {
  it("returns the worklist for an admin", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion/pendientes");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { idPedido: number }[];
    expect(body.some((p) => p.idPedido === SEED.pedidoNormal)).toBe(true);
  });
});

describe("GET /api/prefacturacion/empresas", () => {
  it("returns active empresas", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion/empresas");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rutEmpresa: number }[];
    expect(body.some((e) => e.rutEmpresa === SEED.empresaTarget)).toBe(true);
  });
});

describe("POST /api/prefacturacion", () => {
  it("400s on an empty idPedidos array", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rutEmpresa: SEED.empresaTarget, idPedidos: [] }),
    });
    expect(res.status).toBe(400);
  });
  it("400s on duplicate ids", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoNormal, SEED.pedidoNormal] }),
    });
    expect(res.status).toBe(400);
  });
  it("200s and returns a per-pedido result array", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/prefacturacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoInterno] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resultados: { idPedido: number; status: string }[]; facturados: number };
    expect(body.facturados).toBe(1);
    expect(body.resultados[0].idPedido).toBe(SEED.pedidoInterno);
  });
});
