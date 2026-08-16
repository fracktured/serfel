import { describe, it, expect } from "vitest";
import type { ModuleName } from "@serfel/shared";
import { NAV_GROUPS, visibleGroups } from "./nav";

const ALL: ModuleName[] = ["productos", "rutas", "usuarios", "ventas", "clientes"];

describe("visibleGroups", () => {
  it("admin with every module sees all three groups with expected leaves", () => {
    const groups = visibleGroups(ALL);
    expect(groups.map((g) => g.label)).toEqual(["Mantenedores", "Logística", "Ventas"]);
    const mantenedores = groups.find((g) => g.label === "Mantenedores")!;
    expect(mantenedores.children.map((l) => l.module)).toEqual(["usuarios", "clientes", "productos"]);
  });

  it("a user with only productos sees just Mantenedores with one leaf", () => {
    const groups = visibleGroups(["productos"]);
    expect(groups.map((g) => g.label)).toEqual(["Mantenedores"]);
    expect(groups[0].children.map((l) => l.module)).toEqual(["productos"]);
  });

  it("a user with no modules sees no groups", () => {
    expect(visibleGroups([])).toEqual([]);
  });

  it("does not mutate NAV_GROUPS", () => {
    const before = NAV_GROUPS.map((g) => g.children.length);
    visibleGroups(["productos"]);
    expect(NAV_GROUPS.map((g) => g.children.length)).toEqual(before);
  });

  it("every leaf path is well-formed and modules are unique", () => {
    const modules = NAV_GROUPS.flatMap((g) => g.children.map((l) => l.module));
    expect(new Set(modules).size).toBe(modules.length);
    for (const g of NAV_GROUPS)
      for (const l of g.children) expect(l.path.startsWith("/")).toBe(true);
  });
});
