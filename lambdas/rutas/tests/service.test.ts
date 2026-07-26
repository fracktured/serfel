import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Db } from "@serfel/db";
import { setupTestDb, SEED } from "./helpers";
import { listActiveRutas, getCargoListData, assembleCargoList } from "../service";

let db: Db;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await setupTestDb("serfel_rutas_service"));
});
afterAll(async () => {
  await teardown();
});

describe("listActiveRutas", () => {
  it("returns only active routes, ordered by nombre", async () => {
    const rutas = await listActiveRutas(db);
    expect(rutas.map((r) => r.nomRuta)).toEqual(["Ruta Norte", "Ruta Sur"]);
    expect(rutas.every((r) => r.idEstado === 1)).toBe(true);
  });
});

describe("getCargoListData", () => {
  it("aggregates per product across finalized, undelivered ventas in the routes", async () => {
    const data = await getCargoListData(db, [
      { idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte" },
      { idRuta: SEED.rutaSur, nomRuta: "Ruta Sur" },
    ]);

    expect(data.nomRutas).toBe("Ruta Norte, Ruta Sur");
    // ordered by tipo (BEBIDAS < LACTEOS) then nombre
    expect(data.rows.map((r) => r.nomProducto)).toEqual(["Agua", "Leche"]);

    const agua = data.rows[0];
    expect(agua.sumCantidad).toBe("5.00"); // 2.000 + 3.000 -> "5.000" -> chop
    expect(agua.subtotal).toBe(2500); // 2*500 + 3*500
    expect(agua.obs).toEqual([]);

    const leche = data.rows[1];
    expect(leche.sumCantidad).toBe("1.00");
    expect(leche.subtotal).toBe(720); // 1*(800 - 10%)
    expect(leche.obs).toEqual([5]); // porcion numero from V1

    // V3 (entregado=1) and V4 (id_estado=1) are excluded
    expect(data.totals.numFacturas).toBe(2);
    expect(data.totals.total).toBe(3000); // 1000 + 2000
  });
});

describe("assembleCargoList", () => {
  it("chops the last char of sumCantidad and maps porcion numeros to obs", () => {
    const data = assembleCargoList(
      [{ idRuta: 1, nomRuta: "R1" }],
      [{ idProducto: 7, codSerfel: 100, nomProducto: "X", nomUm: "UNI", nomTipoProducto: "T", sumCantidad: "5.000", subtotal: "2500.000000" }],
      [{ idProducto: 7, numero: 2 }, { idProducto: 7, numero: 9 }],
      { numFacturas: 2, total: "3000" }
    );
    expect(data.rows[0].sumCantidad).toBe("5.00");
    expect(data.rows[0].subtotal).toBe(2500);
    expect(data.rows[0].obs).toEqual([2, 9]);
    expect(data.totals).toEqual({ numFacturas: 2, total: 3000 });
  });

  it("treats a null total as 0", () => {
    const data = assembleCargoList([{ idRuta: 1, nomRuta: "R1" }], [], [], {
      numFacturas: 0,
      total: null,
    });
    expect(data.totals).toEqual({ numFacturas: 0, total: 0 });
  });
});
