import { Component, computed, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { NAV_ITEMS } from "./nav";

/**
 * Shared top bar: logo, a menu with one link per module the signed-in user can
 * access (from the session), an optional projected slot for page-specific
 * controls, and the logout avatar. On narrow screens (<= 900px) the inline
 * menu is replaced by a hamburger that toggles a dropdown of the same links.
 * Used by every feature page.
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
          @for (item of items(); track item.path) {
            <a class="nav-item" [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>
        <div class="header-spacer"></div>
        <ng-content />
        <button
          class="nav-toggle"
          type="button"
          aria-label="Menú"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(!menuOpen())"
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
        <nav class="nav-mobile">
          @for (item of items(); track item.path) {
            <a class="nav-item" [routerLink]="item.path" routerLinkActive="active" (click)="menuOpen.set(false)">{{ item.label }}</a>
          }
        </nav>
      }
    </header>
  `,
  styles: [`
    .nav-item { text-decoration: none; }

    /* Hamburger: hidden on desktop, shown when the inline menu is hidden. */
    .nav-toggle {
      display: none;
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      line-height: 0;
    }
    .nav-toggle:hover { background: rgba(255,255,255,.12); }
    .nav-toggle svg { width: 24px; height: 24px; display: block; }

    /* Dropdown lives inside the sticky .header so it stays attached on scroll. */
    .nav-mobile {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--grad);
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 40px 16px;
      box-shadow: 0 12px 24px rgba(0,0,0,.22);
    }
    .nav-mobile .nav-item { padding: 10px 14px; }

    @media (max-width: 900px) {
      .nav-toggle { display: inline-flex; }
    }
    /* Failsafe: never show the dropdown once the inline menu is back. */
    @media (min-width: 901px) {
      .nav-mobile { display: none; }
    }
  `],
})
export class NavbarComponent {
  readonly session = inject(SessionService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly menuOpen = signal(false);

  /** Menu entries for the modules the signed-in user can access. */
  readonly items = computed(() =>
    (this.session.me()?.modulos ?? []).map((m) => NAV_ITEMS[m])
  );

  async logout(): Promise<void> {
    this.session.clear();
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
