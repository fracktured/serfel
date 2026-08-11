import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  UsuarioCreateSchema, UsuarioUpdateSchema, rutValido,
  type UsuarioCreateInput, type UsuarioDto, type UsuarioLookupsDto, type UsuarioUpdateInput,
} from "@serfel/shared";

interface FieldErrors {
  rut?: string; nombres?: string; apPat?: string; apMat?: string;
  telefono?: string; direccion?: string; email?: string; numero?: string; password?: string;
}
export type UsuarioSavePayload =
  | { mode: "create"; data: UsuarioCreateInput }
  | { mode: "update"; data: UsuarioUpdateInput };

@Component({
  selector: "app-usuario-modal",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ usuario ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="u-rut">RUT *</label>
            <input id="u-rut" type="text" placeholder="12345678-5" [(ngModel)]="rut" [disabled]="!!usuario" />
            @if (errors().rut; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-num">Nº (opcional)</label>
            <input id="u-num" type="number" [(ngModel)]="numero" />
            @if (errors().numero; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-nom">Nombres *</label>
            <input id="u-nom" type="text" [(ngModel)]="nombres" />
            @if (errors().nombres; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-pat">Apellido Paterno *</label>
            <input id="u-pat" type="text" [(ngModel)]="apPat" />
            @if (errors().apPat; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-mat">Apellido Materno *</label>
            <input id="u-mat" type="text" [(ngModel)]="apMat" />
            @if (errors().apMat; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-tipo">Tipo *</label>
            <select id="u-tipo" [(ngModel)]="idTipoUsuario">
              @for (t of lookups.tiposUsuario; track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
            </select>
          </div>
          <div class="form-field">
            <label for="u-fono">Teléfono *</label>
            <input id="u-fono" type="text" [(ngModel)]="telefono" />
            @if (errors().telefono; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="u-dir">Dirección *</label>
            <input id="u-dir" type="text" [(ngModel)]="direccion" />
            @if (errors().direccion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="u-email">Email *</label>
            <input id="u-email" type="email" [(ngModel)]="email" />
            @if (errors().email; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-pass">Contraseña {{ usuario ? '(dejar vacío para mantener)' : '*' }}</label>
            <input id="u-pass" type="password" [(ngModel)]="password" />
            @if (errors().password; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="u-pass2">Confirmar Contraseña {{ usuario ? '' : '*' }}</label>
            <input id="u-pass2" type="password" [(ngModel)]="password2" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Usuario' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UsuarioModalComponent implements OnInit {
  @Input() usuario: UsuarioDto | null = null;
  @Input({ required: true }) lookups!: UsuarioLookupsDto;
  @Output() save = new EventEmitter<UsuarioSavePayload>();
  @Output() cancel = new EventEmitter<void>();

  rut = ""; nombres = ""; apPat = ""; apMat = "";
  idTipoUsuario: number | null = null; telefono = ""; direccion = ""; email = "";
  numero: number | null = null; password = ""; password2 = "";

  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.usuario) {
      this.rut = this.usuario.rut;
      this.nombres = this.usuario.nomUsuario;
      this.apPat = this.usuario.apellPatUsuario;
      this.apMat = this.usuario.apellMatUsuario;
      this.idTipoUsuario = this.usuario.idTipoUsuario;
      this.telefono = this.usuario.telefonoUsuario ?? "";
      this.direccion = this.usuario.direccionUsuario;
      this.email = this.usuario.emailUsuario ?? "";
      this.numero = this.usuario.numUsuario || null;
    } else {
      this.idTipoUsuario = this.lookups.tiposUsuario[0]?.id ?? null;
    }
  }

  onSave(): void {
    // Frontend-only: confirm-password must match when a password is entered.
    if (this.password && this.password !== this.password2) {
      this.errors.set({ password: "Las contraseñas no coinciden" });
      return;
    }
    const common = {
      nomUsuario: this.nombres, apellPatUsuario: this.apPat, apellMatUsuario: this.apMat,
      idTipoUsuario: this.idTipoUsuario, telefonoUsuario: this.telefono,
      direccionUsuario: this.direccion, emailUsuario: this.email,
      numUsuario: this.numero === null || Number.isNaN(this.numero) ? null : this.numero,
    };
    if (this.usuario) {
      const parsed = UsuarioUpdateSchema.safeParse({ ...common, password: this.password || undefined });
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "update", data: parsed.data });
    } else {
      if (!rutValido(this.rut)) return this.errors.set({ rut: "RUT inválido (dígito verificador no coincide)" });
      const parsed = UsuarioCreateSchema.safeParse({ ...common, rut: this.rut, password: this.password });
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "create", data: parsed.data });
    }
  }

  private emit(p: UsuarioSavePayload): void {
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(p);
  }

  private applyErrors(issues: { path: PropertyKey[]; message: string }[]): void {
    const e: FieldErrors = {};
    for (const i of issues) {
      const k = i.path[0];
      if (k === "rut") e.rut = i.message;
      else if (k === "nomUsuario") e.nombres = "Nombres es obligatorio";
      else if (k === "apellPatUsuario") e.apPat = "Apellido paterno es obligatorio";
      else if (k === "apellMatUsuario") e.apMat = "Apellido materno es obligatorio";
      else if (k === "telefonoUsuario") e.telefono = "Teléfono es obligatorio";
      else if (k === "direccionUsuario") e.direccion = "Dirección es obligatoria";
      else if (k === "emailUsuario") e.email = "Email inválido";
      else if (k === "numUsuario") e.numero = "Número inválido";
      else if (k === "password") e.password = "Mínimo 4 caracteres";
    }
    this.errors.set(e);
  }

  /** Called by the parent on a 409 from the API. */
  setServerError(code: "RUT_EN_USO" | "NUM_EN_USO" | "EMAIL_EN_USO", message: string): void {
    this.busy.set(false);
    if (code === "RUT_EN_USO") this.errors.set({ rut: message });
    else if (code === "NUM_EN_USO") this.errors.set({ numero: message });
    else this.errors.set({ email: message });
  }
}
