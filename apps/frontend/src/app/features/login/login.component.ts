import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <h1>Serfel</h1>
        <p class="login-sub">Ingresa a tu cuenta para continuar</p>

        @if (error()) {
          <div class="login-error">{{ error() }}</div>
        }

        @if (!needsNewPassword()) {
          <form (ngSubmit)="onLogin()">
            <div class="form-field">
              <label for="email">Email</label>
              <input id="email" type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
            </div>
            <div class="form-field">
              <label for="password">Contraseña</label>
              <input id="password" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
            </div>
            <button class="btn-save btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Ingresando…' : 'Ingresar' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="onNewPassword()">
            <p class="login-sub">Debes definir una contraseña nueva.</p>
            <div class="form-field">
              <label for="newPassword">Nueva contraseña</label>
              <input id="newPassword" type="password" name="newPassword" [(ngModel)]="newPassword" required autocomplete="new-password" />
            </div>
            <button class="btn-save btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Guardando…' : 'Guardar y entrar' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  newPassword = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly needsNewPassword = signal(false);

  async onLogin(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.auth.login(this.email, this.password);
      if (result === 'new-password') {
        this.needsNewPassword.set(true);
      } else {
        await this.router.navigate(['/productos']);
      }
    } catch {
      this.error.set('Email o contraseña incorrectos.');
    } finally {
      this.busy.set(false);
    }
  }

  async onNewPassword(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.completeNewPassword(this.newPassword);
      await this.router.navigate(['/productos']);
    } catch {
      this.error.set('La contraseña no cumple la política (mínimo 12, mayúsculas, minúsculas y números).');
    } finally {
      this.busy.set(false);
    }
  }
}
