import { describe, it, expect } from "vitest";
import type { ModuleName } from "@serfel/shared";
import { NAV_GROUPS, visibleGroups } from "./nav";

const ALL: ModuleName[] = ["productos", "rutas", "usuarios", "ventas", "clientes", "marcas", "precios", "notas_credito"];

describe("visibleGroups", () => {
  it("admin with every module sees all three groups with expected leaves", () => {
    const groups = visibleGroups(ALL);
    expect(groups.map((g) => g.label)).toEqual(["Mantenedores", "Documentos", "Ventas"]);
    const mantenedores = groups.find((g) => g.label === "Mantenedores")!;
    expect(mantenedores.children.flatMap((s) => s.children.filter((l) => l.module).map((l) => l.module)).sort()).toEqual(["clientes", "marcas", "precios", "productos", "usuarios"]);
  });

  it("a user with only productos sees just Mantenedores with one leaf", () => {
    const groups = visibleGroups(["productos"]);
    expect(groups.map((g) => g.label)).toEqual(["Mantenedores"]);
    expect(groups[0].children.flatMap((s) => s.children.filter((l) => l.module).map((l) => l.module))).toEqual(["productos"]);
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
    const modules = NAV_GROUPS.flatMap((g) => g.children.flatMap((s) => s.children.map((l) => l.module).filter((m) => m !== undefined)));
    expect(new Set(modules).size).toBe(modules.length);
    for (const g of NAV_GROUPS)
      for (const s of g.children)
        for (const l of s.children) if (l.path) expect(l.path.startsWith("/")).toBe(true);
  });

  it("pins each leaf to its exact mandated route", () => {
    const paths: Record<string, string> = {};
    for (const g of NAV_GROUPS) for (const s of g.children) for (const l of s.children) if (l.module) paths[l.module] = l.path;
    expect(paths).toEqual({
      usuarios: "/usuarios",
      clientes: "/clientes",
      productos: "/productos",
      marcas: "/marcas",
      precios: "/precios",
      rutas: "/listado-carga",
      ventas: "/prefacturacion",
      notas_credito: "/notas-credito",
    });
  });
});
