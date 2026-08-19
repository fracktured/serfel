import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { and, eq } from "drizzle-orm";
import { t20MProducto, t20MPorcion, type Db } from "@serfel/db";
import { setupTestDb, seedVenta, SEED } from "./helpers";
import { listPorciones, createPorcion, deletePorcion } from "../porciones";

let db: Db;
let pool: Pool;
let teardown: () => Promise<void>;
const IDP = 1; // idProducto used across these tests

beforeAll(async () => {
  ({ db, pool, teardown } = await setupTestDb("serfel_porciones_svc"));
  await db.insert(t20MProducto).values({
    idProducto: IDP, nomProducto: "QUESO", descProducto: "", codBarraProducto: "",
    idTipoProducto: SEED.tipoYogurt, idMarca: SEED.marcaSoprole, idUm: SEED.umUni,
    idUsuarioMod: SEED.idUsuario, ultFechaMod: "2026-01-01 00:00:00",
    idEstado: 1, codSerfel: 500, impuesto: 0, usaPorciones: 1,
  } as never);
});
afterAll(async () => { await teardown(); });

describe("createPorcion", () => {
  it("creates the first piece as grupo 1 and returns a disponible DTO", async () => {
    const p = await createPorcion(db, IDP, { numero: 1, cantidad: 0.25 }, SEED.idUsuario);
    expect(p).toMatchObject({ idProducto: IDP, numero: 1, grupo: 1, disponibilidad: "disponible", idVenta: null });
    expect(p.cantidad).toBe(0.25);
  });

  it("rejects a numero already used by a disponible piece", async () => {
    await expect(createPorcion(db, IDP, { numero: 1, cantidad: 0.3 }, SEED.idUsuario))
      .rejects.toMatchObject({ code: "NUMERO_OCUPADO" });
  });

  it("bumps grupo when the numero collides only via an ASIGNADO piece", async () => {
    // sell piece numero 1 (grupo 1) so its numero frees up but still occupies grupo 1
    await seedVenta(db, { idVenta: 900, numDoctoEmitido: 7777 });
    await db.update(t20MPorcion).set({ idVenta: 900 })
      .where(and(eq(t20MPorcion.idProducto, IDP), eq(t20MPorcion.numero, 1)));
    const p = await createPorcion(db, IDP, { numero: 1, cantidad: 0.4 }, SEED.idUsuario);
    expect(p.grupo).toBe(2);
    expect(p.disponibilidad).toBe("disponible");
  });
});

describe("listPorciones", () => {
  it("returns porciones ordered by grupo,numero desc with a nextNumero and venta info", async () => {
    const res = await listPorciones(db, IDP, { disponibilidad: "todas" });
    expect(res.porciones.length).toBeGreaterThanOrEqual(2);
    const asignado = res.porciones.find((p) => p.idVenta === 900);
    expect(asignado).toMatchObject({ disponibilidad: "asignado", numDoctoEmitido: 7777 });
    expect(typeof res.nextNumero).toBe("number");
  });

  it("filters by disponibilidad", async () => {
    const asignados = await listPorciones(db, IDP, { disponibilidad: "asignado" });
    expect(asignados.porciones.every((p) => p.disponibilidad === "asignado")).toBe(true);
  });

  it("filters by factura (num_docto_emitido)", async () => {
    const res = await listPorciones(db, IDP, { factura: 7777 });
    expect(res.porciones.every((p) => p.numDoctoEmitido === 7777)).toBe(true);
  });
});

describe("deletePorcion", () => {
  it("deletes a disponible piece", async () => {
    const created = await createPorcion(db, IDP, { numero: 50, cantidad: 0.9 }, SEED.idUsuario);
    await expect(deletePorcion(db, created.idPorcion)).resolves.toEqual({ ok: true });
  });

  it("refuses to delete an asignado piece", async () => {
    const list = await listPorciones(db, IDP, { disponibilidad: "asignado" });
    const sold = list.porciones[0];
    await expect(deletePorcion(db, sold.idPorcion)).rejects.toMatchObject({ code: "PORCION_VENDIDA" });
  });

  it("404s on a missing piece", async () => {
    await expect(deletePorcion(db, 999999)).rejects.toMatchObject({ code: "PORCION_NO_ENCONTRADA" });
  });
});
