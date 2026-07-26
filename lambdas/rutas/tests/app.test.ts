import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { createApp } from "../app";

let db: Db;
let teardown: () => Promise<void>;
let currentUser: number | null = SEED.usuarioAdmin;

const appPromise = (async () => {
  ({ db, teardown } = await setupTestDb("serfel_rutas_app"));
  return createApp({ getDb: async () => db, getIdUsuario: () => currentUser });
})();

afterAll(async () => {
  await teardown();
});

function postJson(body: unknown) {
  return {
    method: "POST" as const,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("rutas app", () => {
  it("403 NO_AUTORIZADO when there is no id_usuario claim", async () => {
    const app = await appPromise;
    currentUser = null;
    try {
      const res = await app.request("/api/routes");
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("NO_AUTORIZADO");
    } finally {
      currentUser = SEED.usuarioAdmin;
    }
  });

  it("403 PROHIBIDO when a vendedor hits routes", async () => {
    const app = await appPromise;
    currentUser = SEED.usuarioVendedor;
    try {
      const res = await app.request("/api/routes");
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("PROHIBIDO");
    } finally {
      currentUser = SEED.usuarioAdmin;
    }
  });

  it("GET /api/routes returns only active routes for admin", async () => {
    const app = await appPromise;
    const res = await app.request("/api/routes");
    expect(res.status).toBe(200);
    const rutas = await res.json();
    expect(rutas.map((r: { nomRuta: string }) => r.nomRuta)).toEqual(["Ruta Norte", "Ruta Sur"]);
  });

  it("POST /api/routes/cargoList 400s on an empty selection", async () => {
    const app = await appPromise;
    const res = await app.request("/api/routes/cargoList", postJson([]));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDACION");
  });

  it("POST /api/routes/cargoList returns a PDF for a valid selection", async () => {
    const app = await appPromise;
    const res = await app.request(
      "/api/routes/cargoList",
      postJson([{ idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" }])
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});
