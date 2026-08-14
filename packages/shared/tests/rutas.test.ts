import { describe, it, expect } from "vitest";
import { RutaSelectionSchema } from "../src/rutas";
import { MODULE_ROLES, tipoCanAccess, modulesForTipo } from "../src/authz";

describe("RutaSelectionSchema", () => {
  it("accepts a non-empty array of {idRuta, nomRuta}", () => {
    const r = RutaSelectionSchema.safeParse([{ idRuta: 1, nomRuta: "Ruta Norte" }]);
    expect(r.success).toBe(true);
  });
  it("rejects an empty array", () => {
    expect(RutaSelectionSchema.safeParse([]).success).toBe(false);
  });
  it("rejects a non-positive idRuta or empty nomRuta", () => {
    expect(RutaSelectionSchema.safeParse([{ idRuta: 0, nomRuta: "x" }]).success).toBe(false);
    expect(RutaSelectionSchema.safeParse([{ idRuta: 1, nomRuta: "" }]).success).toBe(false);
  });
});

describe("rutas module role", () => {
  it("grants rutas to tipo 1 (admin) only", () => {
    expect(MODULE_ROLES.rutas).toEqual([1]);
    expect(tipoCanAccess("rutas", 1)).toBe(true);
    expect(tipoCanAccess("rutas", 3)).toBe(false);
  });
  it("admin modules include productos, rutas, and usuarios", () => {
    expect(modulesForTipo(1)).toEqual(["productos", "rutas", "usuarios", "ventas", "clientes"]);
  });
});
