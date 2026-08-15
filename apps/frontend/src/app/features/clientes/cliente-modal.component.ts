import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ClienteCreateSchema, ClienteUpdateSchema, rutValido,
  type ClienteCreateInput, type ClienteDto, type ClienteLookupsDto, type ClienteUpdateInput,
} from "@serfel/shared";

interface FieldErrors {
  rut?: string; razonSocial?: string; nomFantasia?: string;
  telefono?: string; direccion?: string; comuna?: string; ciudad?: string; email?: string;
}
export type ClienteSavePayload =
  | { mode: "create"; data: ClienteCreateInput }
  | { mode: "update"; data: ClienteUpdateInput };

@Component({
  selector: "app-cliente-modal",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ cliente ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="c-rut">RUT *</label>
            <input id="c-rut" type="text" placeholder="12345678-5" [(ngModel)]="rut" [disabled]="!!cliente" />
            @if (errors().rut; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-lp">Lista de Precio *</label>
            <select id="c-lp" [(ngModel)]="idListaPrecio">
              @for (l of lookups.listasPrecio; track l.id) { <option [ngValue]="l.id">{{ l.nombre }}</option> }
            </select>
          </div>
          <div class="form-field full">
            <label for="c-rs">Razón Social *</label>
            <input id="c-rs" type="text" [(ngModel)]="razonSocial" />
            @if (errors().razonSocial; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="c-nf">Nombre Fantasía</label>
            <input id="c-nf" type="text" [(ngModel)]="nomFantasia" />
            @if (errors().nomFantasia; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-fono">Teléfono</label>
            <input id="c-fono" type="text" [(ngModel)]="telefono" />
            @if (errors().telefono; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-email">Email</label>
            <input id="c-email" type="email" [(ngModel)]="email" />
            @if (errors().email; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="c-dir">Dirección *</label>
            <input id="c-dir" type="text" [(ngModel)]="direccion" />
            @if (errors().direccion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-comuna">Comuna</label>
            <input id="c-comuna" type="text" [(ngModel)]="comuna" />
            @if (errors().comuna; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field">
            <label for="c-ciudad">Ciudad</label>
            <input id="c-ciudad" type="text" [(ngModel)]="ciudad" />
            @if (errors().ciudad; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="permiteVentaDeuda" />
              Permite venta a deuda
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Cliente' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ClienteModalComponent implements OnInit {
  @Input() cliente: ClienteDto | null = null;
  @Input({ required: true }) lookups!: ClienteLookupsDto;
  @Output() save = new EventEmitter<ClienteSavePayload>();
  @Output() cancel = new EventEmitter<void>();

  rut = ""; razonSocial = ""; nomFantasia = "";
  telefono = ""; direccion = ""; comuna = ""; ciudad = ""; email = "";
  idListaPrecio: number | null = null; permiteVentaDeuda = false;

  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.cliente) {
      this.rut = this.cliente.rut;
      this.razonSocial = this.cliente.razonSocial;
      this.nomFantasia = this.cliente.nomFantasia;
      this.telefono = this.cliente.telefono ?? "";
      this.direccion = this.cliente.direccion;
      this.comuna = this.cliente.comuna;
      this.ciudad = this.cliente.ciudad;
      this.email = this.cliente.email ?? "";
      this.idListaPrecio = this.cliente.idListaPrecio;
      this.permiteVentaDeuda = this.cliente.permiteVentaDeuda;
    } else {
      this.idListaPrecio = this.lookups.listasPrecio[0]?.id ?? null;
    }
  }

  onSave(): void {
    const common = {
      razonSocial: this.razonSocial, nomFantasia: this.nomFantasia,
      telefono: this.telefono.trim() || null, direccion: this.direccion,
      comuna: this.comuna, ciudad: this.ciudad, email: this.email.trim() || null,
      idListaPrecio: this.idListaPrecio, permiteVentaDeuda: this.permiteVentaDeuda,
    };
    if (this.cliente) {
      const parsed = ClienteUpdateSchema.safeParse(common);
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "update", data: parsed.data });
    } else {
      if (!rutValido(this.rut)) return this.errors.set({ rut: "RUT inválido (dígito verificador no coincide)" });
      const parsed = ClienteCreateSchema.safeParse({ ...common, rut: this.rut });
      if (!parsed.success) return this.applyErrors(parsed.error.issues);
      this.emit({ mode: "create", data: parsed.data });
    }
  }

  private emit(p: ClienteSavePayload): void {
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(p);
  }

  private applyErrors(issues: { path: PropertyKey[]; message: string }[]): void {
    const e: FieldErrors = {};
    for (const i of issues) {
      const k = i.path[0];
      if (k === "rut") e.rut = i.message;
      else if (k === "razonSocial") e.razonSocial = "Razón social es obligatoria";
      else if (k === "nomFantasia") e.nomFantasia = "Nombre de fantasía inválido";
      else if (k === "telefono") e.telefono = "Teléfono inválido";
      else if (k === "direccion") e.direccion = "Dirección es obligatoria";
      else if (k === "comuna") e.comuna = "Comuna inválida";
      else if (k === "ciudad") e.ciudad = "Ciudad inválida";
      else if (k === "email") e.email = "Email inválido";
    }
    this.errors.set(e);
  }

  /** Called by the parent on a 409 from the API. */
  setServerError(code: "RUT_EN_USO" | "RAZON_SOCIAL_EN_USO", message: string): void {
    this.busy.set(false);
    if (code === "RUT_EN_USO") this.errors.set({ rut: message });
    else this.errors.set({ razonSocial: message });
  }

  /** Re-enable the save button after a failed submit the parent handled via toast. */
  resetBusy(): void { this.busy.set(false); }
}
