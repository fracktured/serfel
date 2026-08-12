import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProductoDetalleDto } from '@serfel/shared';
import { ProductosApi } from './productos-api.service';
import { formatMoney, formatQty } from './productos-logic';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="modal-bg" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <h2>Detalle del Producto</h2>
          <button class="modal-close-btn" (click)="closed.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        @if (loading()) {
          <p style="padding:24px">Cargando…</p>
        } @else if (error()) {
          <div class="login-error" style="margin:16px">{{ error() }}</div>
        } @else if (detalle(); as d) {
          <div class="detail-grid">
            <div class="detail-field"><span class="detail-lbl">Código</span><span class="detail-val">{{ d.codSerfel }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Nombre</span><span class="detail-val">{{ d.nomProducto }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Marca</span><span class="detail-val">{{ d.nomMarca }}</span></div>
            <div class="detail-field"><span class="detail-lbl">UM</span><span class="detail-val">{{ d.nomUm }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Tipo Producto Padre</span><span class="detail-val">{{ d.tipoProductoPadre ?? '—' }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Tipo Producto</span><span class="detail-val">{{ d.tipoProducto }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Costo</span><span class="detail-val">\${{ money(d.costoProm, 2) }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Fecha Últ. Compra</span><span class="detail-val">{{ d.ultFechaCompra ?? '—' }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Costo c/IVA</span><span class="detail-val">\${{ money(d.costoConIva) }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Costo Total Stock</span><span class="detail-val">\${{ money(d.costoTotalStock) }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Precio Neto Venta</span><span class="detail-val">\${{ money(d.precioNeto) }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Precio Venta Cliente</span><span class="detail-val">\${{ money(d.precioVentaCliente) }}</span></div>
            <div class="detail-field"><span class="detail-lbl">% Margen Utilidad</span><span class="detail-val">{{ qty(d.porcenMargen) }}%</span></div>
            <div class="detail-field"><span class="detail-lbl">Valor Margen</span><span class="detail-val">\${{ money(d.valorMargen) }}</span></div>
            @if (d.impuestoAdicional; as imp) {
              <div class="detail-field"><span class="detail-lbl">{{ imp.nombre }}</span><span class="detail-val">\${{ money(imp.monto) }}</span></div>
              <div class="detail-field"><span class="detail-lbl">% Impuesto</span><span class="detail-val">{{ imp.porcentaje }}%</span></div>
            }
            <div class="detail-field"><span class="detail-lbl">Proveedor Últ. Compra</span><span class="detail-val">{{ d.proveedorUltCompra?.rut ?? '—' }}</span></div>
            <div class="detail-field"><span class="detail-lbl">Razón Social</span><span class="detail-val">{{ d.proveedorUltCompra?.razonSocial ?? '—' }}</span></div>

            <div class="detail-field full">
              <span class="detail-lbl">Cantidad Stock</span>
              @if (!editingStock()) {
                <span class="detail-val">
                  {{ qty(d.cantidadStock) }}
                  <button class="t-btn t-btn-edit" (click)="startEdit(d.cantidadStock)">Modificar</button>
                </span>
              } @else {
                <div class="stock-edit">
                  <input type="number" step="0.001" min="0" [(ngModel)]="nuevaCantidad" />
                  @if (stockError(); as e) { <span class="login-error" style="padding:6px 10px">{{ e }}</span> }
                  <button class="btn-cancel" (click)="cancelEdit()" [disabled]="saving()">Cancelar</button>
                  <button class="btn-save" (click)="saveStock()" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
                </div>
              }
            </div>
          </div>
        }

        <div class="modal-footer">
          <button class="btn-cancel" (click)="closed.emit()">Cerrar</button>
        </div>
      </div>
    </div>
  `,
})
export class ProductDetailModalComponent implements OnInit {
  @Input({ required: true }) idProducto!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() stockChanged = new EventEmitter<void>();

  private api = inject(ProductosApi);

  readonly detalle = signal<ProductoDetalleDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editingStock = signal(false);
  readonly saving = signal(false);
  readonly stockError = signal<string | null>(null);
  nuevaCantidad: number | null = null;

  money = formatMoney;
  qty = formatQty;

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.detalle(this.idProducto).subscribe({
      next: (d) => { this.detalle.set(d); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar el detalle'); this.loading.set(false); },
    });
  }

  startEdit(current: number): void {
    this.nuevaCantidad = current;
    this.stockError.set(null);
    this.editingStock.set(true);
  }

  cancelEdit(): void {
    this.editingStock.set(false);
    this.stockError.set(null);
  }

  saveStock(): void {
    const cantidad = this.nuevaCantidad;
    if (cantidad === null || cantidad < 0 || !Number.isFinite(cantidad)) {
      this.stockError.set('Ingresa una cantidad válida (>= 0)');
      return;
    }
    this.saving.set(true);
    this.api.setStock(this.idProducto, cantidad).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.saving.set(false);
        this.editingStock.set(false);
        this.stockChanged.emit();
      },
      error: () => { this.saving.set(false); this.stockError.set('No se pudo modificar el stock'); },
    });
  }
}
