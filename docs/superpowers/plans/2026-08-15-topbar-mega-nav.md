# Topbar Mega-Menu Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat shared navbar with the click-to-open topbar mega-menu from the prototype, on every page.

**Architecture:** Every feature page already renders the shared `NavbarComponent` (`<app-navbar>`). We (1) turn `core/nav.ts` from a flat module→link record into an ordered list of grouped leaves plus a pure `visibleGroups()` access filter, then (2) rewrite `NavbarComponent` to render those groups as mega-dropdowns (desktop) / accordion (mobile) while preserving the projected search slot and logout avatar.

**Tech Stack:** Angular 20 (standalone components, signals), TypeScript, Vitest, `@serfel/shared` (`ModuleName`).

## Global Constraints

- Node >= 22; run all commands from the repo root.
- Frontend package filter: `@serfel/frontend`. Tests run under Vitest (`pnpm --filter @serfel/frontend test`).
- `ModuleName` and `MODULE_ROLES` live in `packages/shared/src/authz.ts` and are the single source of truth — do NOT redefine module names in the frontend.
- The five existing modules and their routes are fixed; leaf `path` values MUST stay exactly: `usuarios`→`/usuarios`, `clientes`→`/clientes`, `productos`→`/productos`, `rutas`→`/listado-carga`, `ventas`→`/prefacturacion`.
- Only real, accessible items appear. Groups with zero accessible leaves are hidden. No unbuilt/placeholder leaves.
- Reuse existing global CSS tokens (`--grad`, `--border`, `--accent`, `--radius`); mega-panel CSS goes in the component's scoped `styles:` block.
- Do not modify the prototype files under `docs/prototypes/`.

---

### Task 1: Grouped nav model + `visibleGroups` access filter

**Files:**
- Modify: `apps/frontend/src/app/core/nav.ts` (replace entire file)
- Test: `apps/frontend/src/app/core/nav.spec.ts` (create)

**Interfaces:**
- Consumes: `ModuleName` from `@serfel/shared`.
- Produces:
  - `interface NavLeaf { module: ModuleName; label: string; path: string; icon: string; }` — `icon` is the inner SVG markup (paths/circles) with no `<svg>` wrapper.
  - `interface NavGroup { label: string; children: NavLeaf[]; }`
  - `export const NAV_GROUPS: NavGroup[]` — ordered: Mantenedores, Logística, Ventas.
  - `export function visibleGroups(modulos: ModuleName[]): NavGroup[]` — returns NAV_GROUPS with each group's `children` filtered to leaves whose `module` is in `modulos`, dropping groups left with no children. Order preserved. Never mutates NAV_GROUPS.

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/app/core/nav.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/core/nav.spec.ts`
Expected: FAIL — `visibleGroups`/`NAV_GROUPS` not exported (module currently exports `NAV_ITEMS`).

- [ ] **Step 3: Replace `nav.ts`**

Overwrite `apps/frontend/src/app/core/nav.ts` with:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @serfel/frontend exec vitest run src/app/core/nav.spec.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/core/nav.ts apps/frontend/src/app/core/nav.spec.ts
git commit -m "feat(nav): grouped nav model + visibleGroups access filter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Rewrite `NavbarComponent` as the mega-menu

**Files:**
- Modify: `apps/frontend/src/app/core/navbar.component.ts` (replace entire file)

**Interfaces:**
- Consumes: `NAV_GROUPS` (unused now — do not import), `visibleGroups`, `NavGroup` from `./nav`; `SessionService`, `AuthService`; Angular `Router`, `NavigationEnd`, `RouterLink`, `RouterLinkActive`; `toSignal` from `@angular/core/rxjs-interop`; `DomSanitizer`/`SafeHtml` from `@angular/platform-browser`; `filter`, `map` from `rxjs`.
- Produces: the `<app-navbar>` element (selector unchanged) with an unchanged projected `<ng-content>` slot and logout avatar — no consumer changes required.

- [ ] **Step 1: Replace `navbar.component.ts`**

Overwrite `apps/frontend/src/app/core/navbar.component.ts` with:

```ts
import { Component, HostListener, computed, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { DomSanitizer, type SafeHtml } from "@angular/platform-browser";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { filter, map } from "rxjs";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { visibleGroups, type NavGroup } from "./nav";

/**
 * Shared top bar: logo, a grouped mega-menu (one group per section, one leaf per
 * module the signed-in user can access), an optional projected slot for
 * page-specific controls, and the logout avatar. Desktop: each group opens a
 * click-to-toggle mega panel. Narrow screens (<= 900px): a hamburger reveals the
 * same groups as an accordion. Used by every feature page.
 */
@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header-inner">
        <div class="header-logo">
          <div class="logo-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          Serfel
        </div>

        <nav class="header-nav">
          @for (group of groups(); track group.label) {
            <div class="mega-host" [class.open]="openGroup() === group.label">
              <button
                type="button"
                class="nav-item"
                [class.open]="openGroup() === group.label"
                [class.active]="isGroupActive(group)"
                (click)="toggle(group.label, $event)"
              >
                {{ group.label }}
                <svg class="car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="mega">
                <div class="mega-title">{{ group.label }}</div>
                <div class="mcol">
                  @for (leaf of group.children; track leaf.path) {
                    <a class="m-link" [routerLink]="leaf.path" routerLinkActive="active" (click)="openGroup.set(null)">
                      <span class="mi" [innerHTML]="iconHtml(leaf.icon)"></span>{{ leaf.label }}
                    </a>
                  }
                </div>
              </div>
            </div>
          }
        </nav>

        <div class="header-spacer"></div>
        <ng-content />
        <button
          class="nav-toggle"
          type="button"
          aria-label="Menú"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMobile($event)"
        >
          @if (menuOpen()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          }
        </button>
        <div class="header-avatar" (click)="logout()" [title]="(session.me()?.nomUsuario ?? '') + ' — Cerrar sesión'">⎋</div>
      </div>

      @if (menuOpen()) {
        <nav class="nav-mobile" (click)="$event.stopPropagation()">
          @for (group of groups(); track group.label) {
            <div class="m-group">
              <button type="button" class="m-group-head" [class.open]="openGroup() === group.label" (click)="toggle(group.label, $event)">
                {{ group.label }}
                <svg class="car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              @if (openGroup() === group.label) {
                @for (leaf of group.children; track leaf.path) {
                  <a class="nav-item m-sub" [routerLink]="leaf.path" routerLinkActive="active" (click)="closeAll()">{{ leaf.label }}</a>
                }
              }
            </div>
          }
        </nav>
      }
    </header>
  `,
  styles: [`
    .nav-item { text-decoration: none; }
    .header-nav .nav-item {
      background: transparent; border: none; font: inherit; cursor: pointer;
      display: flex; align-items: center; gap: 6px;
    }
    .car { width: 13px; height: 13px; opacity: .85; transition: transform .2s; }
    .nav-item.open .car { transform: rotate(180deg); }

    /* Desktop mega dropdown */
    .mega-host { position: relative; }
    .mega {
      position: absolute; top: calc(100% + 10px); left: 0;
      background: #fff; border: 1px solid var(--border); border-radius: 16px;
      box-shadow: 0 20px 50px rgba(15,23,42,.18); padding: 16px; min-width: 260px;
      opacity: 0; visibility: hidden; transform: translateY(-6px);
      transition: all .18s; z-index: 120;
    }
    .mega-host.open .mega { opacity: 1; visibility: visible; transform: translateY(0); }
    .mega::before {
      content: ""; position: absolute; top: -6px; left: 26px; width: 12px; height: 12px;
      background: #fff; border-left: 1px solid var(--border); border-top: 1px solid var(--border);
      transform: rotate(45deg);
    }
    .mega-title {
      font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;
      letter-spacing: .12em; padding: 4px 12px 8px;
    }
    .mcol { display: flex; flex-direction: column; gap: 2px; }
    .m-link {
      display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 10px;
      color: #475569; font-weight: 600; font-size: 13.5px; cursor: pointer;
      transition: all .15s; white-space: nowrap; text-decoration: none;
    }
    .m-link:hover { background: #f5f3ff; color: var(--accent); }
    .m-link.active { background: var(--grad); color: #fff; }
    .m-link .mi { width: 18px; height: 18px; flex-shrink: 0; opacity: .9; }
    .m-link .mi ::ng-deep svg { width: 18px; height: 18px; display: block; }

    /* Hamburger: hidden on desktop, shown when the inline menu is hidden. */
    .nav-toggle {
      display: none; background: transparent; border: none; color: #fff;
      cursor: pointer; padding: 6px; border-radius: 8px; line-height: 0;
    }
    .nav-toggle:hover { background: rgba(255,255,255,.12); }
    .nav-toggle svg { width: 24px; height: 24px; display: block; }

    /* Mobile accordion dropdown lives inside the sticky .header. */
    .nav-mobile {
      position: absolute; top: 100%; left: 0; right: 0; background: var(--grad);
      display: flex; flex-direction: column; gap: 4px; padding: 8px 40px 16px;
      box-shadow: 0 12px 24px rgba(0,0,0,.22);
    }
    .nav-mobile .m-group-head {
      width: 100%; text-align: left; background: transparent; border: none;
      color: rgba(255,255,255,.9); font: inherit; font-weight: 700; cursor: pointer;
      padding: 10px 14px; border-radius: 8px; display: flex; align-items: center;
      justify-content: space-between; gap: 6px;
    }
    .nav-mobile .m-group-head.open { background: rgba(255,255,255,.15); color: #fff; }
    .nav-mobile .m-group-head.open .car { transform: rotate(180deg); }
    .nav-mobile .m-sub { padding: 8px 14px 8px 26px; }

    @media (max-width: 900px) {
      .header-nav { display: none; }
      .nav-toggle { display: inline-flex; }
    }
    @media (min-width: 901px) {
      .nav-mobile { display: none; }
    }
  `],
})
export class NavbarComponent {
  readonly session = inject(SessionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  /** null = no group open; otherwise the open group's label. */
  readonly openGroup = signal<string | null>(null);
  readonly menuOpen = signal(false);

  readonly groups = computed(() => visibleGroups(this.session.me()?.modulos ?? []));

  private readonly currentUrl = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  /** Trusted static SVG markup wrapped in a stroke svg for [innerHTML]. */
  iconHtml(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>`,
    );
  }

  isGroupActive(group: NavGroup): boolean {
    const url = this.currentUrl();
    return group.children.some((l) => url === l.path || url.startsWith(l.path + "/"));
  }

  toggle(label: string, ev: Event): void {
    ev.stopPropagation();
    this.openGroup.update((o) => (o === label ? null : label));
  }

  toggleMobile(ev: Event): void {
    ev.stopPropagation();
    this.openGroup.set(null);
    this.menuOpen.update((v) => !v);
  }

  closeAll(): void {
    this.openGroup.set(null);
    this.menuOpen.set(false);
  }

  /** Any click outside a group button/panel closes the open desktop panel. */
  @HostListener("document:click")
  onDocumentClick(): void {
    this.openGroup.set(null);
  }

  async logout(): Promise<void> {
    this.session.clear();
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @serfel/frontend exec tsc --noEmit -p tsconfig.app.json`
(If that tsconfig path errors, use `pnpm typecheck` from the root.)
Expected: PASS — no type errors. In particular no unresolved `NAV_ITEMS` import and no missing `SafeHtml`/`toSignal` imports.

- [ ] **Step 3: Build the frontend**

Run: `pnpm --filter @serfel/frontend build`
Expected: build succeeds. This confirms the template compiles (control flow, `[innerHTML]`, `RouterLinkActive`) and no leftover references to removed symbols exist.

- [ ] **Step 4: Run the full frontend test suite**

Run: `pnpm --filter @serfel/frontend test`
Expected: PASS, including `nav.spec.ts` from Task 1.

- [ ] **Step 5: Manual smoke (verification)**

Run: `pnpm --filter @serfel/frontend start`, sign in as an admin, then confirm:
- The bar shows three groups: Mantenedores, Logística, Ventas.
- Clicking a group opens its mega panel; clicking another switches; clicking elsewhere closes it.
- Navigating to a leaf (e.g. Productos) highlights that leaf and tints its parent group button.
- The Productos page search box still renders in the bar (projected slot) and the logout avatar still logs out.
- Narrow the window < 900px: the hamburger appears; tapping it lists the groups; tapping a group expands its leaves; tapping a leaf navigates and closes the menu.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/app/core/navbar.component.ts
git commit -m "feat(nav): topbar mega-menu navbar on every page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notes for the implementer

- `.m-link .mi ::ng-deep svg` is required because the icon SVG is injected via `[innerHTML]`, so Angular's view-encapsulation attribute is not stamped on it; `::ng-deep` lets the scoped rule reach the injected `<svg>`. This is intentional and scoped under `.mi`.
- The mega panel uses `visibility/opacity` transitions (kept in the DOM) exactly like the prototype, so the arrow/transition match. The mobile accordion instead conditionally renders leaves with `@if`.
- Do not add routes or touch `MODULE_ROLES`; unbuilt sections (Reportes, Configuración, Marcas, etc.) are intentionally absent until their routes exist — then add one leaf/group to `NAV_GROUPS`.
