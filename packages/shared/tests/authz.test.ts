import { describe, it, expect } from "vitest";
import { MODULE_ROLES, tipoCanAccess, modulesForTipo } from "../src/authz";

describe("MODULE_ROLES", () => {
  it("grants productos to tipo 1 only", () => {
    expect(MODULE_ROLES.productos).toEqual([1]);
  });
});

describe("tipoCanAccess", () => {
  it("is true for an allowed tipo, false otherwise", () => {
    expect(tipoCanAccess("productos", 1)).toBe(true);
    expect(tipoCanAccess("productos", 2)).toBe(false);
    expect(tipoCanAccess("productos", 0)).toBe(false);
  });
});

describe("modulesForTipo", () => {
  it("lists the modules a tipo can access", () => {
    expect(modulesForTipo(1)).toEqual(["productos"]);
    expect(modulesForTipo(2)).toEqual([]);
  });
});
