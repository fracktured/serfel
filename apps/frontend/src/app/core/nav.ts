import type { ModuleName } from "@serfel/shared";

/**
 * Grouped top-bar navigation. Each leaf maps to exactly one authz module, so a
 * user only ever sees leaves they can access (see visibleGroups). `icon` is the
 * inner SVG markup (paths/circles) rendered inside a 24x24 stroke svg by the
 * navbar. Typed off ModuleName so leaves stay in sync with MODULE_ROLES.
 */
export interface NavLeaf {
  module: ModuleName;
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  children: NavLeaf[];
}

const USERS_ICON =
  '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/>';
const CLIENT_ICON =
  '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>';
const PRODUCT_ICON =
  '<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>';
const DOC_ICON = '<path d="M4 2h11l5 5v15H4z"/><path d="M9 8h6M9 12h6M9 16h4"/>';
const SALES_ICON =
  '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>';

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Mantenedores",
    children: [
      { module: "usuarios", label: "Usuarios", path: "/usuarios", icon: USERS_ICON },
      { module: "clientes", label: "Clientes", path: "/clientes", icon: CLIENT_ICON },
      { module: "productos", label: "Productos", path: "/productos", icon: PRODUCT_ICON },
    ],
  },
  {
    label: "Logística",
    children: [
      { module: "rutas", label: "Listado Carga", path: "/listado-carga", icon: DOC_ICON },
    ],
  },
  {
    label: "Ventas",
    children: [
      { module: "ventas", label: "Prefacturación", path: "/prefacturacion", icon: SALES_ICON },
    ],
  },
];

/**
 * NAV_GROUPS filtered to the modules this user can access: each group keeps only
 * accessible leaves, and groups left empty are dropped. Order preserved; the
 * source constant is never mutated.
 */
export function visibleGroups(modulos: ModuleName[]): NavGroup[] {
  const allowed = new Set(modulos);
  return NAV_GROUPS.map((g) => ({
    label: g.label,
    children: g.children.filter((l) => allowed.has(l.module)),
  })).filter((g) => g.children.length > 0);
}
