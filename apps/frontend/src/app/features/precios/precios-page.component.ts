import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import type { PrecioProductoInput, PrecioProductoRowDto } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { PreciosStore, apiError } from "./precios-store";
import { PrecioProductoDrawerComponent } from "./precio-producto-drawer.component";

@Component({
  selector: "app-precios-page",
  standalone: true,
  imports: [FormsModule, DecimalPipe, NavbarComponent, ToastComponent, PrecioProductoDrawerComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Precios de Productos</h1>
          <p>Gestiona las listas de precio y los precios de venta</p>
        </div>
        <div class="hero-actions">
          <select [ngModel]="store.selectedListaId()" (ngModelChange)="onSelectLista($event)">
            @for (l of store.listas(); track l.idListaPrecio) {
              <option [ngValue]="l.idListaPrecio">{{ l.nombre }}</option>
            }
          </select>
          <button class="hero-btn hero-btn-white" (click)="onNewLista()">+ Nueva</button>
          <button class="hero-btn hero-btn-outline" (click)="onRenameLista()" [disabled]="!store.selectedLista()">Renombrar</button>
          <button class="hero-btn hero-btn-outline" (click)="onDeleteLista()" [disabled]="!store.selectedLista()">Eliminar</button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="toolbar">
        <input type="search" placeholder="Buscar producto…"
               [ngModel]="store.filter()" (ngModelChange)="store.setFilter($event)" />
        @if (store.selectedIds().size > 0) {
          <div class="bulk-bar">
            <span>{{ store.selectedIds().size }} seleccionados</span>
            <select [(ngModel)]="bulkAction">
              <option value="setPrecioNeto">Precio Neto</option>
              <option value="setMaxDesc">Máx. % Desc.</option>
              <option value="clearMaxDesc">Borrar Máx. %</option>
            </select>
            @if (bulkAction !== 'clearMaxDesc') {
              <input type="number" min="0" [(ngModel)]="bulkValor" placeholder="valor" />
            }
            <button class="btn-save" (click)="onBulk()">Aplicar</button>
          </div>
        }
      </div>

      @if (store.loading()) { <p>Cargando…</p> }
      @else {
        <table class="grid">
          <thead>
            <tr>
              <th><input type="checkbox" (change)="toggleAll($event)" /></th>
              <th>N</th><th>Producto</th><th>Costo</th><th>Neto</th><th>Base</th>
              <th>Máx%</th><th>Margen</th><th>Precio Venta</th>
            </tr>
          </thead>
          <tbody>
            @for (r of store.filteredRows(); track r.idProducto) {
              <tr [class.bajo-costo]="r.bajoCosto">
                <td><input type="checkbox"
                      [checked]="store.selectedIds().has(r.idProducto)"
                      (change)="store.toggleRow(r.idProducto)" /></td>
                <td>{{ r.codSerfel }}</td>
                <td><button class="link" (click)="openDrawer(r)">{{ r.nomProducto }}</button></td>
                <td>{{ r.costoProm | number:'1.0-0' }}</td>
                <td>{{ r.precioNeto | number:'1.0-0' }}</td>
                <td>{{ r.precioBase | number:'1.0-0' }}</td>
                <td>{{ r.maxPorcenDesc }}%</td>
                <td [class.neg]="r.margenBase !== null && r.margenBase <= 0">
                  {{ r.margenBase === null ? '—' : (r.margenBase + '%') }}
                </td>
                <td>
                  <ul class="pv">
                    @for (v of r.preciosVenta; track v.etiqueta) {
                      <li><span class="badge">{{ v.etiqueta }}</span>
                        {{ v.precioVenta | number:'1.0-0' }}
                        <em [class.neg]="v.margen !== null && v.margen <= 0">
                          ({{ v.margen === null ? '—' : (v.margen + '%') }})</em>
                      </li>
                    }
                  </ul>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <app-toast></app-toast>

    @if (drawerRow(); as r) {
      <app-precio-producto-drawer #drawer [row]="r"
        (save)="onSaveProducto(r.idProducto, $event)" (cancel)="drawerRow.set(null)">
      </app-precio-producto-drawer>
    }
  `,
  styles: [`
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .bulk-bar { display: flex; gap: 8px; align-items: center; }
    table.grid { width: 100%; border-collapse: collapse; }
    .grid th, .grid td { padding: 8px 10px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
    tr.bajo-costo { background: #fee2e2; }
    .neg { color: #dc2626; font-weight: 600; }
    .link { background: none; border: none; color: #2563eb; cursor: pointer; padding: 0; font: inherit; text-align: left; }
    ul.pv { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
    ul.pv .badge { display: inline-block; min-width: 40px; padding: 1px 6px; border-radius: 999px;
      background: #eff6ff; color: #2563eb; font-weight: 600; text-align: center; margin-right: 6px; font-size: 12px; }
    ul.pv em { color: #16a34a; font-style: normal; }
  `],
})
export class PreciosPageComponent implements OnInit {
  readonly store = inject(PreciosStore);
  private toast = inject(ToastService);
  readonly drawer = viewChild(PrecioProductoDrawerComponent);

  readonly drawerRow = signal<PrecioProductoRowDto | null>(null);
  bulkAction: "setPrecioNeto" | "setMaxDesc" | "clearMaxDesc" = "setPrecioNeto";
  bulkValor: number | null = null;

  async ngOnInit(): Promise<void> {
    await this.store.loadListas();
  }

  async onSelectLista(id: number): Promise<void> { await this.store.selectLista(id); }

  openDrawer(r: PrecioProductoRowDto): void { this.drawerRow.set(r); }

  async onSaveProducto(idProducto: number, input: PrecioProductoInput): Promise<void> {
    try {
      await this.store.saveProducto(idProducto, input);
      this.toast.show("Precio guardado");
      this.drawerRow.set(null);
    } catch (err) {
      this.drawer()?.setServerError(apiError(err)?.message ?? "No se pudo guardar.");
    }
  }

  toggleAll(ev: Event): void {
    (ev.target as HTMLInputElement).checked ? this.store.selectAll() : this.store.clearSelection();
  }

  async onBulk(): Promise<void> {
    const ids = [...this.store.selectedIds()];
    if (ids.length === 0) return;
    try {
      await this.store.applyBulk({
        action: this.bulkAction,
        valor: this.bulkAction === "clearMaxDesc" ? undefined : Number(this.bulkValor ?? 0),
        idProductos: ids,
      });
      this.toast.show("Cambios aplicados");
      this.bulkValor = null;
    } catch (err) {
      this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo aplicar el cambio.");
    }
  }

  async onNewLista(): Promise<void> {
    const nombre = prompt("Nombre de la nueva lista (máx. 15):")?.trim();
    if (!nombre) return;
    try { await this.store.createLista({ nombre }); this.toast.show("Lista creada"); }
    catch (err) { this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo crear la lista."); }
  }

  async onRenameLista(): Promise<void> {
    const lista = this.store.selectedLista();
    if (!lista) return;
    const nombre = prompt("Nuevo nombre:", lista.nombre)?.trim();
    if (!nombre) return;
    try { await this.store.renameLista(lista.idListaPrecio, { nombre }); this.toast.show("Lista renombrada"); }
    catch (err) { this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo renombrar."); }
  }

  async onDeleteLista(): Promise<void> {
    const lista = this.store.selectedLista();
    if (!lista) return;
    if (!confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return;
    try { await this.store.deleteLista(lista.idListaPrecio); this.toast.show("Lista eliminada"); }
    catch (err) { this.store.errorMsg.set(apiError(err)?.message ?? "No se pudo eliminar."); }
  }
}
