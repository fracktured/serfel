import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import {
  PrecioProductoInputSchema, computePreciosVenta, computePrecioBase,
  type PrecioProductoRowDto, type PrecioProductoInput, type Tramo,
} from "@serfel/shared";

@Component({
  selector: "app-precio-producto-drawer",
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="modal-bg" (click)="cancel.emit()">
      <aside class="drawer" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>{{ row.nomProducto }}</h2>
          <button class="modal-close-btn" (click)="cancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="form-grid">
          <div class="form-field">
            <label>Precio Neto</label>
            <input type="number" min="0" [(ngModel)]="precioNeto" (ngModelChange)="touch()" />
          </div>
          <div class="form-field">
            <label>Máx. % Descuento</label>
            <input type="number" min="0" max="100" [(ngModel)]="maxPorcenDesc" (ngModelChange)="touch()" />
          </div>
          <div class="form-field full">
            <label>Precio Base (con impuestos {{ row.impuestosPorcen }}%)</label>
            <div class="readout">{{ preview().base | number:'1.0-0' }}</div>
          </div>

          <div class="form-field full"><strong>Tramos por volumen</strong></div>
          @for (t of tramos; track $index) {
            <div class="form-field">
              <label>Tramo {{ $index + 1 }} — cantidad desde</label>
              <input type="number" min="0" [(ngModel)]="t.cantidad" (ngModelChange)="touch()" />
            </div>
            <div class="form-field">
              <label>Máx. % en tramo {{ $index + 1 }}</label>
              <input type="number" min="0" max="100" [(ngModel)]="t.maxPorcen" (ngModelChange)="touch()" />
            </div>
          }

          <div class="form-field full">
            <label>Precio Venta (preview)</label>
            <ul class="preview-list">
              @for (v of preview().values; track v.etiqueta) {
                <li>
                  <span class="badge">{{ v.etiqueta }}</span>
                  {{ v.precioVenta | number:'1.0-0' }}
                  <em [class.neg]="v.margen !== null && v.margen <= 0">
                    ({{ v.margen === null ? '—' : (v.margen + '%') }})
                  </em>
                </li>
              }
            </ul>
          </div>

          @if (tramoWarning(); as w) { <span class="soft-warn full">{{ w }}</span> }
          @if (error(); as e) { <span class="login-error full" style="padding:6px 10px">{{ e }}</span> }
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="cancel.emit()">Cancelar</button>
          <button class="btn-save" (click)="onSave()" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .drawer { position: fixed; top: 0; right: 0; height: 100vh; width: min(480px, 92vw);
      background: #fff; box-shadow: -8px 0 24px rgba(0,0,0,.15); overflow-y: auto; padding: 20px; }
    .readout { font-weight: 700; font-size: 18px; }
    .preview-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .preview-list .badge { display: inline-block; min-width: 44px; padding: 2px 8px; border-radius: 999px;
      background: #eff6ff; color: #2563eb; font-weight: 600; text-align: center; margin-right: 8px; }
    .preview-list em { color: #16a34a; font-style: normal; }
    .preview-list em.neg { color: #dc2626; }
    .soft-warn { color: #b45309; background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 8px; padding: 6px 10px; font-size: 13px; }
    .form-field.full, .full { grid-column: 1 / -1; }
  `],
})
export class PrecioProductoDrawerComponent implements OnInit {
  @Input({ required: true }) row!: PrecioProductoRowDto;
  @Output() save = new EventEmitter<PrecioProductoInput>();
  @Output() cancel = new EventEmitter<void>();

  precioNeto = 0;
  maxPorcenDesc = 0;
  tramos: Tramo[] = [];
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  private readonly rev = signal(0);

  readonly preview = computed(() => {
    this.rev();
    const base = computePrecioBase(this.num(this.precioNeto), this.row.impuestosPorcen);
    const values = computePreciosVenta({
      precioNeto: this.num(this.precioNeto),
      maxPorcenDesc: this.num(this.maxPorcenDesc),
      tramos: this.tramos.map((t) => ({ cantidad: this.num(t.cantidad), maxPorcen: this.num(t.maxPorcen) })),
      costoProm: this.row.costoProm,
      impuestosPorcen: this.row.impuestosPorcen,
    });
    return { base, values };
  });

  // Soft, non-blocking: deeper volume tiers should give an equal-or-larger
  // discount than shallower ones. Warn, but never prevent saving.
  readonly tramoWarning = computed(() => {
    this.rev();
    const pcts = [this.num(this.maxPorcenDesc)];
    for (const t of this.tramos) if (this.num(t.cantidad) > 0) pcts.push(this.num(t.maxPorcen));
    for (let i = 1; i < pcts.length; i++) {
      if (pcts[i] < pcts[i - 1]) {
        return "Un tramo de mayor volumen tiene un % de descuento menor que uno anterior.";
      }
    }
    return null;
  });

  ngOnInit(): void {
    this.precioNeto = this.row.precioNeto;
    this.maxPorcenDesc = this.row.maxPorcenDesc;
    this.tramos = this.row.tramos.map((t) => ({ ...t }));
  }

  private num(v: number): number { return Number.isFinite(+v) ? Math.trunc(+v) : 0; }
  touch(): void { this.rev.update((n) => n + 1); }

  onSave(): void {
    const payload = {
      precioNeto: this.num(this.precioNeto),
      maxPorcenDesc: this.num(this.maxPorcenDesc),
      tramos: this.tramos.map((t) => ({ cantidad: this.num(t.cantidad), maxPorcen: this.num(t.maxPorcen) })),
    };
    const parsed = PrecioProductoInputSchema.safeParse(payload);
    if (!parsed.success) {
      this.error.set(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    this.save.emit(parsed.data);
  }

  setServerError(message: string): void { this.busy.set(false); this.error.set(message); }
}
