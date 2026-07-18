import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { SessionService } from "../../core/session.service";

@Component({
  selector: "app-sin-acceso",
  standalone: true,
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <h1>Sin acceso</h1>
        <p class="login-sub">No tienes acceso a este módulo. Contacta a un administrador.</p>
        <button class="btn-save btn-block" (click)="logout()">Cerrar sesión</button>
      </div>
    </div>
  `,
})
export class SinAccesoComponent {
  private auth = inject(AuthService);
  private session = inject(SessionService);
  private router = inject(Router);

  async logout(): Promise<void> {
    this.session.clear();
    await this.auth.logout();
    await this.router.navigate(["/login"]);
  }
}
