import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LocalCreateSchema, LocalUpdateSchema, type LocalDto, type LocalLookupsDto } from "@serfel/shared";
import { emptyLocalForm, dtoToForm, formToInput, type LocalFormModel } from "./locales-logic";

export type LocalSavePayload = { mode: "create" | "update"; data: unknown };

@Component({
  selector: "app-local-form",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="local-editor">
      <button class="btn-cancel" style="margin-bottom:12px" (click)="back.emit()">‹ Volver a locales</button>
      <h3>{{ local ? 'Editar local: ' + local.nombre : 'Nuevo local' }}</h3>
      @if (serverError(); as e) { <div class="login-error">{{ e }}</div> }
      <div class="form-grid">
        <div class="form-field full">
          <label for="l-nom">Nombre *</label>
          <input id="l-nom" type="text" [(ngModel)]="m.nombre" />
          @if (errors().nombre; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
        </div>
        <div class="form-field"><label for="l-fono">Teléfono</label>
          <input id="l-fono" type="text" [(ngModel)]="m.telefono" /></div>
        <div class="form-field"><label for="l-email">Email</label>
          <input id="l-email" type="email" [(ngModel)]="m.email" />
          @if (errors().email; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field full"><label for="l-dir">Dirección *</label>
          <input id="l-dir" type="text" [(ngModel)]="m.direccion" />
          @if (errors().direccion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field"><label for="l-comuna">Comuna</label>
          <input id="l-comuna" type="text" [(ngModel)]="m.comuna" /></div>
        <div class="form-field"><label for="l-giro">Giro</label>
          <input id="l-giro" type="text" [(ngModel)]="m.giro" /></div>
        <div class="form-field"><label for="l-fp">Forma de pago *</label>
          <select id="l-fp" [(ngModel)]="m.idFormaPago">
            @for (f of lookups.formasPago; track f.id) { <option [ngValue]="f.id">{{ f.nombre }}</option> }
          </select>
          @if (errors().idFormaPago; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field"><label for="l-vend">Vendedor *</label>
          <select id="l-vend" [(ngModel)]="m.idVendedor">
            @for (v of lookups.vendedores; track v.id) { <option [ngValue]="v.id">{{ v.nombre }}</option> }
          </select>
          @if (errors().idVendedor; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field"><label for="l-tv">Tope venta</label>
          <input id="l-tv" type="number" [(ngModel)]="m.topeVenta" /></div>
        <div class="form-field"><label for="l-tc">Tope crédito</label>
          <input id="l-tc" type="number" [(ngModel)]="m.topeCredito" /></div>
        <div class="form-field"><label for="l-cn">Contacto</label>
          <input id="l-cn" type="text" [(ngModel)]="m.nomContacto" /></div>
        <div class="form-field"><label for="l-cap">Apellido paterno contacto</label>
          <input id="l-cap" type="text" [(ngModel)]="m.apellPatContacto" /></div>
        <div class="form-field"><label for="l-cam">Apellido materno contacto</label>
          <input id="l-cam" type="text" [(ngModel)]="m.apellMatContacto" /></div>
        <div class="form-field"><label for="l-cf">Teléfono contacto</label>
          <input id="l-cf" type="text" [(ngModel)]="m.telefonoContacto" /></div>
        <div class="form-field"><label for="l-ce">Email contacto</label>
          <input id="l-ce" type="email" [(ngModel)]="m.emailContacto" />
          @if (errors().emailContacto; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }</div>
        <div class="form-field full"><label for="l-obs">Observaciones</label>
          <input id="l-obs" type="text" [(ngModel)]="m.observaciones" /></div>
        <div class="form-field full"><label class="checkbox-row">
          <input type="checkbox" [(ngModel)]="m.permiteVentaTopeMensual" /> Permite venta sobre tope mensual
        </label></div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" (click)="back.emit()">Cancelar</button>
        <button class="btn-save" (click)="onSave()" [disabled]="busy()">
          {{ busy() ? 'Guardando…' : 'Guardar Local' }}
        </button>
      </div>
    </div>
  `,
})
export class LocalFormComponent implements OnInit {
  @Input() local: LocalDto | null = null;
  @Input({ required: true }) lookups!: LocalLookupsDto;
  @Output() save = new EventEmitter<LocalSavePayload>();
  @Output() back = new EventEmitter<void>();

  m: LocalFormModel = emptyLocalForm();
  readonly errors = signal<{
    nombre?: string;
    direccion?: string;
    email?: string;
    emailContacto?: string;
    idFormaPago?: string;
    idVendedor?: string;
  }>({});
  readonly serverError = signal<string | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.local) this.m = dtoToForm(this.local);
    else {
      this.m = emptyLocalForm();
      this.m.idFormaPago = this.lookups.formasPago[0]?.id ?? null;
      this.m.idVendedor = this.lookups.vendedores[0]?.id ?? null;
    }
  }

  onSave(): void {
    const data = formToInput(this.m);
    const schema = this.local ? LocalUpdateSchema : LocalCreateSchema;
    // create needs rutCliente, injected server-side from the URL, so validate with a stub for create.
    const toValidate = this.local ? data : { ...(data as object), rutCliente: 1 };
    const parsed = schema.safeParse(toValidate);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[0]);
        if (k === "nombre") e["nombre"] = "Nombre es obligatorio";
        else if (k === "direccion") e["direccion"] = "Dirección es obligatoria";
        else if (k === "email") e["email"] = "Email inválido";
        else if (k === "emailContacto") e["emailContacto"] = "Email de contacto inválido";
        else if (k === "idFormaPago") e["idFormaPago"] = "Selecciona una forma de pago";
        else if (k === "idVendedor") e["idVendedor"] = "Selecciona un vendedor";
      }
      this.errors.set(e);
      return;
    }
    this.errors.set({});
    this.serverError.set(null);
    this.busy.set(true);
    this.save.emit({ mode: this.local ? "update" : "create", data });
  }

  setServerError(msg: string): void { this.busy.set(false); this.serverError.set(msg); }
  resetBusy(): void { this.busy.set(false); }
}
