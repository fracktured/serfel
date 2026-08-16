import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t10MCliente, t10MLocalCliente, type Db } from "@serfel/db";
import { eq } from "drizzle-orm";
import { setupTestDb, SEED } from "./helpers";
import {
  getClienteLookups, listClientes, createCliente,
  updateCliente, deactivateCliente, activateCliente,
  getLocalLookups, listLocales, createLocal,
  updateLocal, deactivateLocal, activateLocal,
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

describe("locales lookups + list", () => {
  it("getLocalLookups returns forma_pago and vendedores (only tipo 2 & activos)", async () => {
    const lk = await getLocalLookups(db);
    expect(lk.formasPago.map((f) => f.id)).toContain(SEED.idFormaPago);
    expect(lk.vendedores.map((v) => v.id)).toContain(SEED.idVendedor);
    // admin (tipo 1) must NOT be listed as a vendedor
    expect(lk.vendedores.map((v) => v.id)).not.toContain(SEED.idAdmin);
  });

  it("listLocales returns the seeded local for the client with joins", async () => {
    const rows = await listLocales(db, SEED.rutClienteConVenta, "activos");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].idLocalCliente).toBe(SEED.idLocalConVenta);
    expect(rows[0].nombre).toBe("Local Principal");
  });
});

describe("createLocal", () => {
  it("auto-assigns the id, writes comuna to both columns, returns the DTO", async () => {
    const input = {
      rutCliente: SEED.rutClienteConVenta, nombre: "Sucursal Norte",
      telefono: "911112222", direccion: "Calle 9 #9", comuna: "Quilpue",
      email: null, giro: "Kiosko", nomContacto: "Ana", apellPatContacto: "Rojas",
      apellMatContacto: "Diaz", telefonoContacto: null, emailContacto: null,
      topeVenta: 0, topeCredito: 0, idVendedor: SEED.idVendedor,
      idFormaPago: SEED.idFormaPago, observaciones: "", permiteVentaTopeMensual: false,
    };
    const dto = await createLocal(db, input, SEED.idAdmin);
    // seeded row has explicit id 10, so the auto-increment counter yields 11 next
    expect(dto.idLocalCliente).toBe(SEED.idLocalConVenta + 1);
    expect(dto.nombre).toBe("Sucursal Norte");
    expect(dto.comuna).toBe("Quilpue");
    expect(dto.nomFormaPago).toBe("CREDITO");
    // legacy column kept in sync
    const raw = await db.select({ c: t10MLocalCliente.comunaLocalCliente })
      .from(t10MLocalCliente).where(eq(t10MLocalCliente.idLocalCliente, dto.idLocalCliente));
    expect(raw[0].c).toBe("Quilpue");
  });
});

describe("update/deactivate/activate local", () => {
  it("updates fields and syncs comuna", async () => {
    const dto = await updateLocal(db, SEED.idLocalConVenta, {
      nombre: "Local Renombrado", telefono: null, direccion: "Nueva Dir 1",
      comuna: "Concon", email: null, giro: "", nomContacto: "", apellPatContacto: "",
      apellMatContacto: "", telefonoContacto: null, emailContacto: null,
      topeVenta: 0, topeCredito: 0, idVendedor: SEED.idVendedor,
      idFormaPago: SEED.idFormaPago, observaciones: "", permiteVentaTopeMensual: true,
    }, SEED.idAdmin);
    expect(dto.nombre).toBe("Local Renombrado");
    expect(dto.comuna).toBe("Concon");
    expect(dto.permiteVentaTopeMensual).toBe(true);
  });

  it("deactivate then activate flips id_estado", async () => {
    const off = await deactivateLocal(db, SEED.idLocalConVenta, SEED.idAdmin);
    expect(off.idEstado).toBe(0);
    const on = await activateLocal(db, SEED.idLocalConVenta, {
      nombre: off.nombre, telefono: off.telefono, direccion: off.direccion,
      comuna: off.comuna, email: off.email, giro: off.giro, nomContacto: off.nomContacto,
      apellPatContacto: off.apellPatContacto, apellMatContacto: off.apellMatContacto,
      telefonoContacto: off.telefonoContacto, emailContacto: off.emailContacto,
      topeVenta: off.topeVenta, topeCredito: off.topeCredito, idVendedor: off.idVendedor,
      idFormaPago: off.idFormaPago, observaciones: off.observaciones,
      permiteVentaTopeMensual: off.permiteVentaTopeMensual,
    }, SEED.idAdmin);
    expect(on.idEstado).toBe(1);
  });
});
