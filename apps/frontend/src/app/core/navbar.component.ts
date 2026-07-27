import { Component, computed, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { NAV_ITEMS } from "./nav";

/**
 * Shared top bar: logo, a menu with one link per module the signed-in user can
 * access (from the session), an optional projected slot for page-specific
 * controls, and the logout avatar. Used by every feature page.
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
        <div class="header-avatar" (click)="logout()" [title]="(session.me()?.nomUsuario ?? '') + ' — Cerrar sesión'">⎋</div>
      </div>
    </header>
  `,
  styles: [`
    .nav-item { text-decoration: none; }
  `],
})
export class NavbarComponent {
  readonly session = inject(SessionService);
  private auth = inject(AuthService);
  private router = inject(Router);

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
