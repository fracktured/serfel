import type { ModuleName } from "@serfel/shared";

/**
 * Frontend label + route for each authz module, shown in the navbar.
 * Typed as a full Record over ModuleName so adding a module to MODULE_ROLES
 * won't compile until it also gets a menu entry here.
 */
export const NAV_ITEMS: Record<ModuleName, { label: string; path: string }> = {
  productos: { label: "Productos", path: "/productos" },
  rutas: { label: "Listado Carga", path: "/listado-carga" },
  usuarios: { label: "Usuarios", path: "/usuarios" },
  ventas: { label: "Prefacturación", path: "/prefacturacion" },
};
