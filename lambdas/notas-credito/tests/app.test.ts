import { describe, it, expect, beforeAll } from "vitest";
import type { Db } from "@serfel/db";
import type { EmisorEvent, EmisorResult } from "@serfel/shared";
import { makeTestDb, seedVenta, seedNota, SEED } from "./helpers";

// "notas_credito" is now registered in @serfel/shared's MODULE_ROLES, so this
// app-level test runs through the real requireModule("notas_credito", ...) gate
// (no authz mock) to exercise both routing/service wiring and authorization.
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

  it("200s for an admin (tipo 1) through the real requireModule gate", async () => {
    const res = await appFor(SEED.usuarioAdmin).request("/api/notas-credito");
    expect(res.status).toBe(200);
  });

  it("403s PROHIBIDO for a non-admin (vendedor, tipo 2) through the real requireModule gate", async () => {
    const res = await appFor(SEED.usuarioVendedor).request("/api/notas-credito");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("PROHIBIDO");
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
