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
