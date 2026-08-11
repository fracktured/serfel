import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "mysql2/promise";
import { t10MUsuario, t30MPedido, t40MVenta, type Db } from "@serfel/db";
import { eq } from "drizzle-orm";
import { setupTestDb, SEED } from "./helpers";
import {
  getUsuarioLookups, listUsuarios, createUsuario, activateUsuario,
  updateUsuario, deactivateUsuario, md5hex,
} from "../service";

let db: Db; let pool: Pool; let teardown: () => Promise<void>;
beforeAll(async () => { ({ db, pool, teardown } = await setupTestDb("serfel_usuarios_svc")); });
afterAll(async () => { await teardown(); });

const baseInput = {
  rut: "12345678-5", nomUsuario: "Juan", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
  idTipoUsuario: 2, telefonoUsuario: "+56 9 1234 5678", direccionUsuario: "Calle 1",
  emailUsuario: "juan@serfel.cl", numUsuario: 10, password: "secret1",
};

describe("createUsuario", () => {
  it("inserts a new active user with md5 password and auto id", async () => {
    const res = await createUsuario(db, baseInput, SEED.idAdmin);
    expect(res.kind).toBe("created");
    if (res.kind !== "created") return;
    expect(res.dto.idUsuario).toBeGreaterThan(1);
    expect(res.dto.rut).toBe("12345678-5");
    expect(res.dto.nombreCompleto).toBe("Perez Soto Juan");
    expect(res.dto.idEstado).toBe(1);
    const row = await db.select().from(t10MUsuario).where(eq(t10MUsuario.idUsuario, res.dto.idUsuario));
    expect(row[0].password).toBe(md5hex("secret1"));
  });

  it("rejects duplicate active RUT with RUT_EN_USO", async () => {
    await expect(createUsuario(db, { ...baseInput, emailUsuario: "otro@serfel.cl", numUsuario: 11 }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "RUT_EN_USO" });
  });

  it("rejects duplicate num_usuario with NUM_EN_USO", async () => {
    await expect(createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "z@serfel.cl", numUsuario: 10 }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "NUM_EN_USO" });
  });

  it("rejects duplicate email with EMAIL_EN_USO", async () => {
    await expect(createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "juan@serfel.cl", numUsuario: 12 }, SEED.idAdmin))
      .rejects.toMatchObject({ code: "EMAIL_EN_USO" });
  });

  it("returns inactive when RUT exists but is deactivated", async () => {
    const created = await createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "re@serfel.cl", numUsuario: 20 }, SEED.idAdmin);
    if (created.kind !== "created") throw new Error("expected created");
    await deactivateUsuario(db, created.dto.idUsuario, SEED.idAdmin);
    const again = await createUsuario(db, { ...baseInput, rut: "6371526-K", emailUsuario: "re@serfel.cl", numUsuario: 20 }, SEED.idAdmin);
    expect(again).toEqual({ kind: "inactive", idUsuario: created.dto.idUsuario });
  });
});

describe("activateUsuario", () => {
  it("reactivates and applies the submitted form data", async () => {
    const rows = await db.select().from(t10MUsuario).where(eq(t10MUsuario.idEstado, 0));
    const target = rows[0];
    const dto = await activateUsuario(db, target.idUsuario, {
      rut: "6371526-K", nomUsuario: "Nuevo", apellPatUsuario: "Nombre", apellMatUsuario: "Aca",
      idTipoUsuario: 1, telefonoUsuario: "999", direccionUsuario: "Nueva dir",
      emailUsuario: "re@serfel.cl", numUsuario: 20, password: "fresh1",
    }, SEED.idAdmin);
    expect(dto.idEstado).toBe(1);
    expect(dto.nomUsuario).toBe("Nuevo");
    expect(dto.idTipoUsuario).toBe(1);
  });
});

describe("updateUsuario", () => {
  it("updates fields and keeps password when omitted", async () => {
    const c = await createUsuario(db, { ...baseInput, rut: "15155155-1", emailUsuario: "u@serfel.cl", numUsuario: 31 }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error();
    const before = (await db.select().from(t10MUsuario).where(eq(t10MUsuario.idUsuario, c.dto.idUsuario)))[0];
    const dto = await updateUsuario(db, c.dto.idUsuario, {
      nomUsuario: "Cambiado", apellPatUsuario: "Perez", apellMatUsuario: "Soto",
      idTipoUsuario: 2, telefonoUsuario: "1", direccionUsuario: "d", emailUsuario: "u@serfel.cl", numUsuario: 31,
    }, SEED.idAdmin);
    expect(dto.nomUsuario).toBe("Cambiado");
    const after = (await db.select().from(t10MUsuario).where(eq(t10MUsuario.idUsuario, c.dto.idUsuario)))[0];
    expect(after.password).toBe(before.password);
  });
});

describe("deactivateUsuario", () => {
  it("blocks deactivation when the user has a pending-payment venta", async () => {
    const c = await createUsuario(db, { ...baseInput, rut: "18000000-2", emailUsuario: "p@serfel.cl", numUsuario: 40 }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error();
    // minimal pedido + venta rows in id_estado=2 (pendiente de pago) for this user
    await db.insert(t30MPedido).values({
      idPedido: 5001, fechaPedido: "2026-01-01 00:00:00", idLocalCliente: SEED.idLocalCliente,
      precioTotal: 0, idUsuario: c.dto.idUsuario, idListaPrecio: SEED.idListaPrecio,
      idEstado: SEED.idEstadoPendiente,
    });
    await db.insert(t40MVenta).values({
      idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: c.dto.idUsuario, precioTotal: 0,
      numDoctoEmitido: 1, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutCliente, idLocalCliente: SEED.idLocalCliente, idPedido: 5001,
      fechaVenta: "2026-01-01 00:00:00", idUsuarioMod: c.dto.idUsuario,
      ultFechaMod: "2026-01-01 00:00:00", idEstado: SEED.idEstadoPendiente,
    });
    await expect(deactivateUsuario(db, c.dto.idUsuario, SEED.idAdmin))
      .rejects.toMatchObject({ code: "USUARIO_CON_VENTAS_PENDIENTES" });
  });

  it("soft-deletes a user with no pending sales", async () => {
    const c = await createUsuario(db, { ...baseInput, rut: "19000000-7", emailUsuario: "q@serfel.cl", numUsuario: 41 }, SEED.idAdmin);
    if (c.kind !== "created") throw new Error();
    const dto = await deactivateUsuario(db, c.dto.idUsuario, SEED.idAdmin);
    expect(dto.idEstado).toBe(0);
  });
});

describe("getUsuarioLookups", () => {
  it("returns tipos ordered by name", async () => {
    const lk = await getUsuarioLookups(db);
    expect(lk.tiposUsuario).toEqual([
      { id: 1, nombre: "Admin" },
      { id: 2, nombre: "Vendedor" },
    ]);
  });
});
