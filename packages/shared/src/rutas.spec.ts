import { describe, it, expect } from "vitest";
import { CargoListRequestSchema } from "./rutas";

describe("CargoListRequestSchema", () => {
  const rutas = [{ idRuta: 1, nomRuta: "Ruta Norte" }];

  it("defaults tipo to ventas when omitted", () => {
    const parsed = CargoListRequestSchema.parse({ rutas });
    expect(parsed.tipo).toBe("ventas");
    expect(parsed.rutas).toEqual(rutas);
  });

  it("accepts an explicit pedidos tipo", () => {
    const parsed = CargoListRequestSchema.parse({ tipo: "pedidos", rutas });
    expect(parsed.tipo).toBe("pedidos");
  });

  it("rejects an unknown tipo", () => {
    expect(CargoListRequestSchema.safeParse({ tipo: "otros", rutas }).success).toBe(false);
  });

  it("rejects an empty rutas array", () => {
    expect(CargoListRequestSchema.safeParse({ tipo: "ventas", rutas: [] }).success).toBe(false);
  });
});
