import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t10MCliente, type Db } from "@serfel/db";
import { eq } from "drizzle-orm";
import { setupTestDb, SEED } from "./helpers";
import {
  getClienteLookups, listClientes, createCliente,
  updateCliente, deactivateCliente, activateCliente,
} from "../service";

let db: Db; let pool: Pool; let teardown: () => Promise<void>;
beforeAll(async () => { ({ db, pool, teardown } = await setupTestDb("serfel_clientes_svc")); });
afterAll(async () => { await teardown(); });

const baseInput = {
  rut: "12345678-5", razonSocial: "Comercial Uno SpA", nomFantasia: "Uno",
  telefono: "+56 9 1111 1111", direccion: "Calle 1", comuna: "Providencia",
  ciudad: "Santiago", email: "uno@serfel.cl", idListaPrecio: SEED.idListaPrecio,
  permiteVentaDeuda: false,
};

describe("createCliente", () => {
  it("inserts a new active cliente with parsed rut/dv", async () => {
    const res = await createCliente(db, baseInput, SEED.idAdmin);
    expect(res.kind).toBe("created");
    if (res.kind !== "created") return;
    expect(res.dto.rutCliente).toBe(12345678);
    expect(res.dto.dvCliente).toBe("5");
    expect(res.dto.rut).toBe("12345678-5");
    expect(res.dto.nomListaPrecio).toBe("Base");
    expect(res.dto.idEstado).toBe(1);
  });

  it("rejects a duplicate active RUT with RUT_EN_USO", async () => {
    await expect(createCliente(db, { ...baseInput, razonSocial: "Otra SpA", email: "x@serfel.cl" }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "RUT_EN_USO" });
  });

  it("rejects a duplicate razon social with RAZON_SOCIAL_EN_USO", async () => {
    await expect(createCliente(db, { ...baseInput, rut: "6371526-K", email: "y@serfel.cl" }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "RAZON_SOCIAL_EN_USO" });
  });

  it("returns kind inactive when the RUT exists but is inactive", async () => {
    const c = await createCliente(db, { ...baseInput, rut: "6371526-K", razonSocial: "Inactiva SpA", email: "i@serfel.cl" }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error("expected created");
    await deactivateCliente(db, c.dto.rutCliente, SEED.idAdmin);
    const again = await createCliente(db, { ...baseInput, rut: "6371526-K", razonSocial: "Inactiva SpA", email: "i@serfel.cl" }, SEED.idAdmin);
    expect(again.kind).toBe("inactive");
    if (again.kind === "inactive") expect(again.rut).toBe(6371526);
  });
});

describe("updateCliente", () => {
  it("updates fields and keeps the rut", async () => {
    const dto = await updateCliente(db, 12345678, { ...baseInput, razonSocial: "Comercial Uno Renombrada SpA", permiteVentaDeuda: true }, SEED.idAdmin);
    expect(dto.razonSocial).toBe("Comercial Uno Renombrada SpA");
    expect(dto.permiteVentaDeuda).toBe(true);
  });

  it("404s CLIENTE_NO_ENCONTRADO for an unknown rut", async () => {
    await expect(updateCliente(db, 99999999, baseInput, SEED.idAdmin))
      .rejects.toMatchObject({ code: "CLIENTE_NO_ENCONTRADO" });
  });

  it("allows re-submitting the client's own current razon social (excludes self from the uniqueness check)", async () => {
    const created = await createCliente(
      db,
      { ...baseInput, rut: "9999999-3", razonSocial: "Dueño De Su Propio Nombre SpA", email: "self@serfel.cl" },
      SEED.idAdmin,
    );
    if (created.kind !== "created") throw new Error("expected created");

    const dto = await updateCliente(
      db,
      created.dto.rutCliente,
      { ...baseInput, razonSocial: "Dueño De Su Propio Nombre SpA", email: "self@serfel.cl", ciudad: "Valparaíso" },
      SEED.idAdmin,
    );
    expect(dto.razonSocial).toBe("Dueño De Su Propio Nombre SpA");
    expect(dto.ciudad).toBe("Valparaíso");
  });
});

describe("activateCliente", () => {
  it("restores an inactive cliente applying the provided data", async () => {
    const { rut, ...updateData } = baseInput; // ClienteUpdateInput has no rut
    const dto = await activateCliente(db, 6371526, { ...updateData, razonSocial: "Reactivada SpA", email: "r@serfel.cl" }, SEED.idAdmin);
    expect(dto.idEstado).toBe(1);
    expect(dto.razonSocial).toBe("Reactivada SpA");
  });
});

describe("deactivateCliente", () => {
  it("blocks deactivation when the client has a venta pending payment", async () => {
    await expect(deactivateCliente(db, SEED.rutClienteConVenta, SEED.idAdmin))
      .rejects.toMatchObject({ code: "CLIENTE_CON_VENTAS_PENDIENTES" });
  });

  it("soft-deletes a client with no pending ventas", async () => {
    const dto = await deactivateCliente(db, 12345678, SEED.idAdmin);
    expect(dto.idEstado).toBe(0);
    const row = await db.select().from(t10MCliente).where(eq(t10MCliente.rutCliente, 12345678));
    expect(row[0].idEstado).toBe(0);
  });
});

describe("listClientes derived columns", () => {
  it("reports route weekdays and last factura/NC for the seeded client", async () => {
    const rows = await listClientes(db, "todos");
    const seeded = rows.find((r) => r.rutCliente === SEED.rutClienteConVenta);
    expect(seeded).toBeDefined();
    expect(seeded!.dias).toEqual([1, 3]);            // lunes + miércoles seeded
    expect(seeded!.ultFactura).toBe(1050);           // MAX num_docto_emitido, id_estado > 0
    expect(seeded!.ultNotaCredito).toBe(77);         // MAX num_nota_credito via venta
  });

  it("filters by estado", async () => {
    const activos = await listClientes(db, "activos");
    expect(activos.every((r) => r.idEstado === 1)).toBe(true);
  });

  it("getClienteLookups returns the price lists", async () => {
    const lk = await getClienteLookups(db);
    expect(lk.listasPrecio).toEqual([{ id: SEED.idListaPrecio, nombre: "Base" }]);
  });
});
