import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { getUserTipo, listEmpresas, listPendientes, prefacturarBatch } from "../service";
import { and, eq } from "drizzle-orm";
import { t40MVenta, t40MProductoVenta, t50MStock, t30MPedido } from "@serfel/db";

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

describe("prefacturarBatch", () => {
  it("facturas a normal pedido: creates venta, lines, taxes, reduces stock, finalizes pedido", async () => {
    const before = await db
      .select({ cantidad: t50MStock.cantidad })
      .from(t50MStock)
      .where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua)));

    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoNormal] },
      SEED.usuarioAdmin
    );

    expect(res.facturados).toBe(1);
    expect(res.errores).toBe(0);
    const item = res.resultados[0];
    expect(item.status).toBe("facturado");
    expect(item.idVenta).toBeGreaterThan(0);

    // venta net = agua 2*1000 + jugo 1*500 = 2500; iva = round(2500*19/100)=475
    const venta = (await db.select().from(t40MVenta).where(eq(t40MVenta.idVenta, item.idVenta!)))[0];
    expect(venta.subTotal).toBe(2500);
    expect(venta.iva).toBe(475);
    expect(venta.iaba).toBe(round(500 * 18 / 100)); // jugo ILA on its 500 line
    expect(venta.rutEmpresa).toBe(SEED.empresaTarget);
    expect(venta.idEstado).toBe(SEED.ESTADO_FINALIZADO);

    const lines = await db.select().from(t40MProductoVenta).where(eq(t40MProductoVenta.idVenta, item.idVenta!));
    expect(lines.length).toBe(2);

    // stock for agua reduced by 2
    const after = await db
      .select({ cantidad: t50MStock.cantidad })
      .from(t50MStock)
      .where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua)));
    expect(Number(before[0].cantidad) - Number(after[0].cantidad)).toBe(2);

    const pedido = (await db.select().from(t30MPedido).where(eq(t30MPedido.idPedido, SEED.pedidoNormal)))[0];
    expect(pedido.idEstado).toBe(SEED.ESTADO_FINALIZADO);
  });

  it("errors on a pedido that already has a venta, without partial writes", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoYaVendido] },
      SEED.usuarioAdmin
    );
    expect(res.errores).toBe(1);
    expect(res.resultados[0].status).toBe("error");
    expect(res.resultados[0].error).toMatch(/asociado a Venta/i);
    // no new venta for that pedido (still exactly the seeded one, idVenta 900)
    const ventas = await db.select().from(t40MVenta).where(eq(t40MVenta.idPedido, SEED.pedidoYaVendido));
    expect(ventas.length).toBe(1);
  });

  it("errors on a porcionado pedido", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoPorciones] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("error");
    expect(res.resultados[0].error).toMatch(/porcionados/i);
  });

  it("skips a line with no stock and warns, still creating the venta with 0 lines", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoSinStock] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("facturado");
    expect(res.resultados[0].mensajes.join(" ")).toMatch(/no tiene stock/i);
    const lines = await db.select().from(t40MProductoVenta).where(eq(t40MProductoVenta.idVenta, res.resultados[0].idVenta!));
    expect(lines.length).toBe(0);
  });

  it("clamps line quantity to available stock and warns", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoClamp] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("facturado");
    expect(res.resultados[0].mensajes.join(" ")).toMatch(/se altero cantidad/i);
    const stock = (await db.select().from(t50MStock).where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodJugo))))[0];
    expect(Number(stock.cantidad)).toBe(0); // clamped to the 5 available, fully consumed
  });

  it("does NOT reduce stock for an internal-company cliente", async () => {
    const before = (await db.select().from(t50MStock).where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua))))[0];
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoInterno] },
      SEED.usuarioAdmin
    );
    expect(res.resultados[0].status).toBe("facturado");
    const after = (await db.select().from(t50MStock).where(and(eq(t50MStock.idBodega, SEED.bodegaCentral), eq(t50MStock.idProducto, SEED.prodAgua))))[0];
    expect(Number(after.cantidad)).toBe(Number(before.cantidad)); // unchanged
  });

  it("processes all pedidos in a mixed batch and reports per-row", async () => {
    const res = await prefacturarBatch(
      db,
      { rutEmpresa: SEED.empresaTarget, idPedidos: [SEED.pedidoEspec, SEED.pedidoPorciones] },
      SEED.usuarioAdmin
    );
    expect(res.resultados.length).toBe(2);
    expect(res.facturados).toBe(1);
    expect(res.errores).toBe(1);
    const espec = res.resultados.find((r) => r.idPedido === SEED.pedidoEspec)!;
    expect(espec.status).toBe("facturado");
  });
});

function round(n: number): number {
  return Math.round(n);
}
