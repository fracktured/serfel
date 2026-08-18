import type { ModuleName } from "@serfel/shared";

/**
 * Grouped top-bar navigation. A group holds sections; a section optionally has a
 * subheading label and holds leaves. A real leaf maps to exactly one authz module
 * and a route path; a placeholder leaf (disabled: true) has neither and renders
 * greyed as "(no disponible)". `icon` is inner SVG markup rendered inside a 24x24
 * stroke svg by the navbar.
 */
export interface NavLeaf {
  module?: ModuleName;
  label: string;
  path?: string;
  icon?: string;
  disabled?: boolean;
}

export interface NavSection {
  label?: string;
  icon?: string;
  children: NavLeaf[];
}

export interface NavGroup {
  label: string;
  children: NavSection[];
}

const USERS_ICON =
  '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/>';
const CLIENT_ICON =
  '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>';
const PRODUCT_ICON =
  '<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>';
const BRAND_ICON =
  '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>';
const DOC_ICON = '<path d="M4 2h11l5 5v15H4z"/><path d="M9 8h6M9 12h6M9 16h4"/>';
const SALES_ICON =
  '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>';

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Mantenedores",
    children: [
      {
        label: "Usuarios",
        icon: USERS_ICON,
        children: [
          { module: "usuarios", label: "Usuarios", path: "/usuarios", icon: USERS_ICON },
          { label: "Empresas", disabled: true },
        ],
      },
      {
        label: "Clientes",
        icon: CLIENT_ICON,
        children: [
          { module: "clientes", label: "Clientes", path: "/clientes", icon: CLIENT_ICON },
          { label: "Post Venta", disabled: true },
        ],
      },
      {
        label: "Productos",
        icon: PRODUCT_ICON,
        children: [
          { module: "productos", label: "Productos", path: "/productos", icon: PRODUCT_ICON },
          { module: "marcas", label: "Marcas", path: "/marcas", icon: BRAND_ICON },
          { module: "precios", label: "Precios y Descuentos", path: "/precios", icon: SALES_ICON },
          { label: "Unidades de Medida", disabled: true },
          { label: "Tipos", disabled: true },
        ],
      },
    ],
  },
  {
    label: "Documentos",
    children: [
      {
        children: [
          { module: "rutas", label: "Listado Carga", path: "/listado-carga", icon: DOC_ICON },
        ],
      },
    ],
  },
  {
    label: "Ventas",
    children: [
      {
        children: [
          { module: "ventas", label: "Prefacturación", path: "/prefacturacion", icon: SALES_ICON },
        ],
      },
    ],
  },
];

/**
 * NAV_GROUPS filtered to the modules this user can access. A section is kept when
 * it has at least one accessible real leaf (a leaf with a module the user has);
 * disabled placeholders ride along with a kept section. A group is kept when it
 * has at least one kept section. Order preserved; the source constant is never
 * mutated.
 */
export function visibleGroups(modulos: ModuleName[]): NavGroup[] {
  const allowed = new Set(modulos);
  return NAV_GROUPS.map((g) => ({
    label: g.label,
    children: g.children
      .filter((s) => s.children.some((l) => l.module !== undefined && allowed.has(l.module)))
      .map((s) => ({
        label: s.label,
        icon: s.icon,
        children: s.children.filter((l) => l.disabled || (l.module !== undefined && allowed.has(l.module))),
      })),
  })).filter((g) => g.children.length > 0);
}
