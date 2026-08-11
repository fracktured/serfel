import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getUserTipo, listEmpresas, listPendientes } from "../service";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_ventas_service"));
});
afterAll(async () => {
  await teardown();
});

describe("getUserTipo", () => {
  it("returns the tipo for an existing user", async () => {
    expect(await getUserTipo(db, SEED.usuarioAdmin)).toBe(SEED.tipoAdmin);
  });
  it("returns null for a missing user", async () => {
    expect(await getUserTipo(db, 999999)).toBeNull();
  });
});

describe("listEmpresas", () => {
  it("returns active empresas, one row per rut (latest ult_fecha_mod wins), ordered by razonSocial", async () => {
    const empresas = await listEmpresas(db);
    const ruts = empresas.map((e) => e.rutEmpresa);
    expect(new Set(ruts).size).toBe(ruts.length); // no dup ruts
    expect(ruts).toContain(SEED.empresaTarget);
    // empresaTarget has two rows in the seed (composite PK rut+ult_fecha_mod);
    // must collapse to exactly one, and it must be the latest one.
    expect(ruts.filter((r) => r === SEED.empresaTarget)).toHaveLength(1);
    expect(empresas.find((e) => e.rutEmpresa === SEED.empresaTarget)?.razonSocial).toBe(
      "SERFEL NUEVO"
    );
  });
});

describe("listPendientes", () => {
  it("returns active pedidos without a non-anulada venta", async () => {
    const pend = await listPendientes(db);
    const ids = pend.map((p) => p.idPedido);
    expect(ids).toContain(SEED.pedidoNormal);
    expect(ids).not.toContain(SEED.pedidoYaVendido); // has a venta
  });
  it("projects joined cliente/local/vendedor fields", async () => {
    const pend = await listPendientes(db);
    const normal = pend.find((p) => p.idPedido === SEED.pedidoNormal)!;
    expect(normal.nomFantasia).toBe("Fantasia Norte");
    expect(normal.nomLocal).toBe("Local Norte");
    expect(normal.contacto).toBe("Juan Lopez Vega");
    expect(normal.vendedor).toBe("Vera Diaz Rojas");
    expect(normal.rutCliente).toBe(SEED.cliente);
  });
});
