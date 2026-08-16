# Design: Topbar mega-menu navigation

Date: 2026-08-15

## Goal

Implement the topbar mega-menu from `docs/prototypes/navigation/option-2-topbar-mega.html`
as the real navigation of the new Angular frontend, on every page.

## Context

- Every feature page already renders the shared `NavbarComponent`
  (`apps/frontend/src/app/core/navbar.component.ts`) via `<app-navbar>`, with a
  projected `<ng-content>` slot for page-specific controls (e.g. the Productos
  search box) and a logout avatar.
- Today `NavbarComponent` renders a **flat** list: one `.nav-item` link per
  module the signed-in user can access, sourced from `NAV_ITEMS` in
  `core/nav.ts` and filtered by `session.me().modulos`.
- Only five modules exist: `productos`, `rutas` (Listado Carga), `usuarios`,
  `ventas` (Prefacturación), `clientes`. `ModuleName` / `MODULE_ROLES` are the
  single source of truth in `packages/shared/src/authz.ts`.

Because all pages share this one component, rewriting it delivers the mega-menu
everywhere with no per-page edits.

## Scope decision

**Show only real, accessible items.** The menu renders only the five implemented
modules, grouped. Groups with no accessible leaves are hidden. Unbuilt leaves
from the prototype (Marcas, Guías de Despacho, Vehículos, Facturación, Notas de
Crédito, Reportes, Configuración) do **not** appear. Adding one later is a single
entry in `nav.ts` once its route exists.

## Menu structure

Extend `core/nav.ts` from the flat `NAV_ITEMS` record into an ordered list of
groups. Each leaf maps to exactly one `ModuleName`:

- **Mantenedores** ▸ Usuarios (`usuarios`) · Clientes (`clientes`) · Productos (`productos`)
- **Logística** ▸ Listado Carga (`rutas`)
- **Ventas** ▸ Prefacturación (`ventas`)

Data shapes:

```ts
interface NavLeaf { module: ModuleName; label: string; path: string; icon: string; } // icon = inline SVG markup
interface NavGroup { label: string; icon: string; children: NavLeaf[]; }
export const NAV_GROUPS: NavGroup[];
```

The existing `NAV_ITEMS` record can be kept (derived) or replaced; the leaf
`label`/`path` values must stay identical to today's routes.

### Access filtering (pure, testable)

```ts
export function visibleGroups(modulos: ModuleName[]): NavGroup[];
```

Returns `NAV_GROUPS` with each group's `children` filtered to leaves whose
`module` is in `modulos`, dropping any group left with zero children. This is the
one piece with real logic and gets unit tests.

## Component behavior

`NavbarComponent` renders `visibleGroups(session.me()?.modulos ?? [])`.

- **Single-leaf groups stay dropdowns** (Logística, Ventas today) for visual
  uniformity and painless growth.
- **Open/close:** a signal `openGroup` holds the label of the open group (or
  null). Clicking a group toggles it; clicking another group switches; a
  document-level click listener closes any open panel. Carets rotate on open.
- **Active state:** the leaf whose `path` matches the current route gets
  `.m-link.active`; its parent group button gets an active tint (via
  `RouterLinkActive` on leaves + a computed "which group contains the active
  route" for the button), so location is visible with the menu closed.
- Projected `<ng-content>` search slot and the logout avatar are preserved
  unchanged.

## Styles

Mega-panel CSS (`.mega`, `.mega-host`, `.m-link`, arrow, caret) lives in the
component's scoped `styles:` block, alongside the existing hamburger/mobile CSS.
Reuse global tokens (`--grad`, `--border`, `--accent`, `--radius`). Group and
leaf icons are inline SVG ported from the prototype.

## Mobile (≤ 900px)

Keep the existing hamburger. The dropdown becomes an accordion: tapping a group
header expands its leaves inline; tapping a leaf navigates and closes the menu.
Preserves current responsive behavior.

## Testing

- Unit-test `visibleGroups` in `core/nav.spec.ts` (or extend an existing spec):
  - admin (`['productos','rutas','usuarios','ventas','clientes']`) → all three
    groups with expected leaves;
  - user with only `['productos']` → single group Mantenedores with one leaf;
  - user with `[]` → no groups.
- Interactive open/close is thin view logic exercised manually / by existing
  component smoke coverage.

## Out of scope

- No new routes, pages, or `MODULE_ROLES` changes.
- No changes to the prototype files.
