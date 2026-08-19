import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { DisponibilidadFilter, PorcionDto } from '@serfel/shared';
import { ProductosApi } from './productos-api.service';
import { apiError } from './productos-store';
import { formatQty } from './productos-logic';
import { buildPorcionesQuery, disponibilidadLabel } from './porciones-logic';

@Component({
  selector: 'app-porciones-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>Porciones{{ nomProducto ? ' · ' + nomProducto : '' }}</h2>
          <button class="modal-close-btn" (click)="closed.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="filter-dropdowns" style="margin:12px 16px">
          <div class="fd-field"><label>Nº</label>
            <input type="number" style="width:90px" [(ngModel)]="fNumero" (ngModelChange)="reload()" /></div>
          <div class="fd-field"><label>Factura</label>
            <input type="number" style="width:120px" [(ngModel)]="fFactura" (ngModelChange)="reload()" /></div>
          <div class="fd-field"><label>Disponibilidad</label>
            <select [(ngModel)]="fDisp" (ngModelChange)="reload()">
              <option value="todas">Todas</option>
              <option value="disponible">Disponibles</option>
              <option value="asignado">Asignadas</option>
            </select></div>
        </div>

        <div class="porcion-add" style="display:flex;gap:8px;align-items:end;margin:0 16px 12px">
          <div class="fd-field"><label>Nº nueva</label>
            <input type="number" min="1" max="100" style="width:90px" [(ngModel)]="nuevoNumero" /></div>
          <div class="fd-field"><label>Cantidad</label>
            <input type="number" step="0.001" min="0" style="width:120px" [(ngModel)]="nuevaCantidad" /></div>
          <button class="btn-save" (click)="add()" [disabled]="saving()">Agregar</button>
          @if (addError(); as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
        </div>

        @if (loading()) {
          <p style="padding:24px">Cargando…</p>
        } @else if (error()) {
          <div class="login-error" style="margin:16px">{{ error() }}</div>
        } @else {
          <div class="table-wrap" style="margin:0 16px 16px">
            <table>
              <thead><tr><th>Nº</th><th>Grupo</th><th>Cantidad</th><th>Estado</th><th>Factura</th><th></th></tr></thead>
              <tbody>
                @for (p of porciones(); track p.idPorcion) {
                  <tr>
                    <td class="t-num">{{ p.numero }}</td>
                    <td>{{ p.grupo }}</td>
                    <td>{{ qty(p.cantidad) }}</td>
                    <td>{{ label(p.disponibilidad) }}</td>
                    <td class="t-muted">{{ p.numDoctoEmitido ?? '—' }}</td>
                    <td>
                      @if (p.disponibilidad === 'disponible') {
                        <button class="t-btn t-btn-del" (click)="remove(p)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (porciones().length === 0) { <p style="padding:16px">Sin porciones para este filtro.</p> }
          </div>
        }

        <div class="modal-footer"><button class="btn-cancel" (click)="closed.emit()">Cerrar</button></div>
      </div>
    </div>
  `,
})
export class PorcionesModalComponent implements OnInit {
  @Input({ required: true }) idProducto!: number;
  @Input() nomProducto?: string;
  @Output() closed = new EventEmitter<void>();

  private api = inject(ProductosApi);

  readonly porciones = signal<PorcionDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly addError = signal<string | null>(null);

  fNumero = '';
  fFactura = '';
  fDisp: DisponibilidadFilter = 'todas';
  nuevoNumero: number | null = null;
  nuevaCantidad: number | null = null;

  qty = formatQty;
  label = disponibilidadLabel;

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const query = buildPorcionesQuery({ numero: this.fNumero, factura: this.fFactura, disponibilidad: this.fDisp });
    this.api.listPorciones(this.idProducto, query).subscribe({
      next: (res) => {
        this.porciones.set(res.porciones);
        if (this.nuevoNumero === null) this.nuevoNumero = res.nextNumero;
        this.loading.set(false);
      },
      error: () => { this.error.set('No se pudieron cargar las porciones'); this.loading.set(false); },
    });
  }

  add(): void {
    const numero = this.nuevoNumero;
    const cantidad = this.nuevaCantidad;
    this.addError.set(null);
    if (numero === null || numero < 1 || numero > 100 || !Number.isInteger(numero)) {
      this.addError.set('Nº debe ser un entero entre 1 y 100'); return;
    }
    if (cantidad === null || cantidad <= 0 || !Number.isFinite(cantidad)) {
      this.addError.set('Ingresa una cantidad válida (> 0)'); return;
    }
    this.saving.set(true);
    this.api.createPorcion(this.idProducto, { numero, cantidad }).subscribe({
      next: () => { this.saving.set(false); this.nuevoNumero = null; this.nuevaCantidad = null; this.reload(); },
      error: (err) => { this.saving.set(false); this.addError.set(apiError(err)?.message ?? 'No se pudo crear la porción'); },
    });
  }

  remove(p: PorcionDto): void {
    if (!confirm(`¿Eliminar la porción Nº ${p.numero} (grupo ${p.grupo})?`)) return;
    this.api.deletePorcion(p.idPorcion).subscribe({
      next: () => this.reload(),
      error: (err) => this.error.set(apiError(err)?.message ?? 'No se pudo eliminar la porción'),
    });
  }
}
