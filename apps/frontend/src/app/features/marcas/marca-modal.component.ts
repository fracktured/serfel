import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MarcaInputSchema, type MarcaDto, type MarcaInput } from "@serfel/shared";

interface FieldErrors { nombre?: string; descripcion?: string }

@Component({
  selector: "app-marca-modal",
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ marca ? 'Editar Marca' : 'Nueva Marca' }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="form-grid">
          <div class="form-field full">
            <label for="mk-name">Nombre de la Marca *</label>
            <input id="mk-name" type="text" placeholder="SOPROLE" [(ngModel)]="nombre" />
            @if (errors().nombre; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
          <div class="form-field full">
            <label for="mk-desc">Descripción</label>
            <input id="mk-desc" type="text" placeholder="Opcional" [(ngModel)]="descripcion" />
            @if (errors().descripcion; as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar Marca' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MarcaModalComponent implements OnInit {
  @Input() marca: MarcaDto | null = null;
  @Output() save = new EventEmitter<MarcaInput>();
  @Output() cancel = new EventEmitter<void>();

  nombre = "";
  descripcion = "";
  readonly errors = signal<FieldErrors>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    if (this.marca) {
      this.nombre = this.marca.nomMarca;
      this.descripcion = this.marca.descMarca;
    }
  }

  onSave(): void {
    const parsed = MarcaInputSchema.safeParse({ nomMarca: this.nombre, descMarca: this.descripcion });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "nomMarca") errs.nombre = "El nombre es obligatorio (máx. 50)";
        if (issue.path[0] === "descMarca") errs.descripcion = "La descripción admite máx. 200 caracteres";
      }
      this.errors.set(errs);
      return;
    }
    this.errors.set({});
    this.busy.set(true);
    this.save.emit(parsed.data);
  }

  /** Called by the parent when the API returns a 409 name clash. */
  setServerError(message: string): void {
    this.busy.set(false);
    this.errors.set({ nombre: message });
  }
}
