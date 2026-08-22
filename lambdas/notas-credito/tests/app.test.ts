import { describe, it, expect, beforeAll, vi } from "vitest";
import { createMiddleware } from "hono/factory";
import type { Db } from "@serfel/db";
import type { EmisorEvent, EmisorResult } from "@serfel/shared";
import { makeTestDb, seedVenta, seedNota, SEED } from "./helpers";

// "notas_credito" is not yet registered in @serfel/shared's MODULE_ROLES — that
// lands in a later task (registering the module + updating the ripple fixtures
// in lambdas/products and the frontend nav). Until then requireModule("notas_credito", ...)
// can never authorize any tipo, so this app-level test stubs the local authz gate
// to a no-op pass-through: it exercises the routing/service wiring this task delivers,
// not the not-yet-done module registration. Swap back to the real requireModule once
// that task lands and MODULE_ROLES.notas_credito exists.
vi.mock("../authz", () => ({
  requireModule: () => createMiddleware(async (c, next) => {
    c.set("idTipoUsuario", 1);
    await next();
  }),
}));

const { createApp } = await import("../app");

let db: Db;

beforeAll(async () => {
  db = await makeTestDb("serfel_notas_credito_app");
});

const emisorOk = async (_e: EmisorEvent): Promise<EmisorResult> => ({
  ok: true, folio: 500, urlPdfOriginal: "o", urlPdfCedible: "c",
});

function appFor(idUsuario: number | null) {
  return createApp({ getDb: async () => db, getIdUsuario: () => idUsuario, invokeEmisor: emisorOk });
}

describe("authz", () => {
  it("403s when there is no id_usuario mapping", async () => {
    const res = await appFor(null).request("/api/notas-credito");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/notas-credito", () => {
  it("returns the issued NCs list for an admin", async () => {
    const idVenta = await seedVenta(db, { idTipoDoctoEmitido: 9, idFolio: 600, precioTotal: 1190 });
    await seedNota(db, { idVenta, precioTotal: 1190, esNotaCredElectronica: 1, idFolio: 601 });

    const res = await appFor(SEED.usuarioAdmin).request("/api/notas-credito");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { idFolio: number }[];
    expect(body.some((n) => n.idFolio === 601)).toBe(true);
  });
});

describe("POST /api/notas-credito", () => {
  it("400s on an invalid body", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/notas-credito", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idVenta: "not-a-number" }),
    });
    expect(res.status).toBe(400);
  });
});
