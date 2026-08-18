import { Component, computed, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DecimalPipe } from "@angular/common";
import type { PrecioProductoInput, PrecioProductoRowDto } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { PreciosStore, apiError } from "./precios-store";
import { PrecioProductoDrawerComponent } from "./precio-producto-drawer.component";

type SortKey =
  | "codSerfel" | "nomProducto" | "costoProm" | "precioNeto"
  | "precioBase" | "maxPorcenDesc";
type ViewFilter = "todos" | "bajoCosto" | "conDescuento";

@Component({
  selector: "app-precios-page",
  standalone: true,
  imports: [FormsModule, DecimalPipe, NavbarComponent, ToastComponent, PrecioProductoDrawerComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Precios y Descuentos</h1>
          <p>Gestiona las listas de precio, precios de venta y descuentos por volumen</p>
        </div>
        <div class="hero-actions">
          <select class="hero-select" [ngModel]="store.selectedListaId()" (ngModelChange)="onSelectLista($event)">
            @for (l of store.listas(); track l.idListaPrecio) {
              <option [ngValue]="l.idListaPrecio">{{ l.nombre }}</option>
            }
          </select>
          <button class="hero-btn hero-btn-white" (click)="onNewLista()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nueva
          </button>
          <button class="hero-btn hero-btn-outline" (click)="onRenameLista()" [disabled]="!store.selectedLista()">Renombrar</button>
          <button class="hero-btn hero-btn-outline" (click)="onDeleteLista()" [disabled]="!store.selectedLista()">Eliminar</button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#7c3aed">{{ store.rows().length }}</div>
            <div class="stat-lbl">Productos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#2563eb">{{ stats().conDescuento }}</div>
            <div class="stat-lbl">Con Descuento</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fee2e2,#fecaca)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#dc2626">{{ stats().bajoCosto }}</div>
            <div class="stat-lbl">Bajo Costo</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#d97706">{{ sortedRows().length }}</div>
            <div class="stat-lbl">Filtrados</div>
          </div>
        </div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field" style="flex:1">
          <label for="f-prod">Buscar Producto</label>
          <input id="f-prod" type="text" placeholder="Nº o nombre…"
                 [ngModel]="store.filter()" (ngModelChange)="onSearch($event)" />
        </div>
        <div class="fd-field">
          <label for="f-view">Mostrar</label>
          <select id="f-view" [ngModel]="viewFilter()" (ngModelChange)="setViewFilter($event)">
            <option value="todos">Todos</option>
            <option value="conDescuento">Con descuento</option>
            <option value="bajoCosto">Bajo costo</option>
          </select>
        </div>
        <button class="btn-clear" (click)="clearFilters()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          Limpiar
        </button>
      </div>

      <div class="toolbar">
        <span class="result-count">
          {{ sortedRows().length }} producto{{ sortedRows().length === 1 ? '' : 's' }} encontrado{{ sortedRows().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
        <span class="toolbar-spacer"></span>
        @if (store.selectedIds().size > 0) {
          <div class="bulk-bar">
            <span class="bulk-count">{{ store.selectedIds().size }} seleccionados</span>
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

      @if (sortedRows().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-check"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)" /></th>
                <th (click)="toggleSort('codSerfel')" [class.sorted]="sort().key === 'codSerfel'">
                  Nº <span class="sort-ind">{{ sortInd('codSerfel') }}</span>
                </th>
                <th (click)="toggleSort('nomProducto')" [class.sorted]="sort().key === 'nomProducto'">
                  Producto <span class="sort-ind">{{ sortInd('nomProducto') }}</span>
                </th>
                <th (click)="toggleSort('costoProm')" [class.sorted]="sort().key === 'costoProm'">
                  Costo <span class="sort-ind">{{ sortInd('costoProm') }}</span>
                </th>
                <th (click)="toggleSort('precioNeto')" [class.sorted]="sort().key === 'precioNeto'">
                  Neto <span class="sort-ind">{{ sortInd('precioNeto') }}</span>
                </th>
                <th (click)="toggleSort('precioBase')" [class.sorted]="sort().key === 'precioBase'">
                  Base <span class="sort-ind">{{ sortInd('precioBase') }}</span>
                </th>
                <th (click)="toggleSort('maxPorcenDesc')" [class.sorted]="sort().key === 'maxPorcenDesc'">
                  Máx% <span class="sort-ind">{{ sortInd('maxPorcenDesc') }}</span>
                </th>
                <th class="col-static" style="text-align:center">Tramo 1</th>
                <th class="col-static" style="text-align:center">Tramo 2</th>
                <th class="col-static" style="text-align:center">Tramo 3</th>
                <th class="col-static">Precio Venta</th>
                <th class="col-static" style="width:120px; text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (r of paged().slice; track r.idProducto) {
                <tr [class.bajo-costo]="r.bajoCosto">
                  <td class="col-check"><input type="checkbox"
                        [checked]="store.selectedIds().has(r.idProducto)"
                        (change)="store.toggleRow(r.idProducto)" /></td>
                  <td class="t-num">{{ r.codSerfel }}</td>
                  <td class="t-name">{{ r.nomProducto }}</td>
                  <td class="t-muted">{{ r.costoProm | number:'1.0-0' }}</td>
                  <td>{{ r.precioNeto | number:'1.0-0' }}</td>
                  <td>{{ r.precioBase | number:'1.0-0' }}</td>
                  <td>{{ r.maxPorcenDesc }}%</td>
                  @for (t of r.tramos; track $index) {
                    <td style="text-align:center">
                      @if (t.cantidad > 0) {
                        <span class="pv-badge">{{ t.cantidad }}</span>
                      } @else {
                        <span class="t-muted">—</span>
                      }
                    </td>
                  }
                  <td>
                    <ul class="pv">
                      @for (v of r.preciosVenta; track v.etiqueta) {
                        <li><span class="pv-badge">{{ v.etiqueta }}</span>
                          {{ v.precioVenta | number:'1.0-0' }}
                          <em [class.neg]="v.margen !== null && v.margen <= 0">
                            ({{ v.margen === null ? '—' : (v.margen + '%') }})</em>
                        </li>
                      }
                    </ul>
                  </td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      <button class="t-btn t-btn-edit" (click)="openDrawer(r)" title="Editar precios">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <div class="per-page-wrap">
              Mostrar
              <select [ngModel]="perPage()" (ngModelChange)="perPage.set(+$event); page.set(1)">
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
              </select>
              por página
            </div>
            <span class="pag-info">{{ paged().from }}–{{ paged().to }} de {{ sortedRows().length }}</span>
            <div class="pag-controls">
              <button class="pag-btn" [disabled]="paged().page === 1" (click)="goPage(paged().page - 1)">‹</button>
              @for (n of pageNumbers(); track n) {
                <button class="pag-btn" [class.active]="n === paged().page" (click)="goPage(n)">{{ n }}</button>
              }
              <button class="pag-btn" [disabled]="paged().page === paged().totalPages" (click)="goPage(paged().page + 1)">›</button>
            </div>
          </div>
        </div>
      } @else if (!store.loading()) {
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">No se encontraron productos</div>
          <div class="empty-sub">Intenta con otros filtros de búsqueda</div>
        </div>
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
    .hero-select {
      padding: 9px 14px; border-radius: 10px;
      background: rgba(255,255,255,.18); color: #fff;
      border: 1.5px solid rgba(255,255,255,.35);
      font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; outline: none; min-width: 160px;
    }
    .hero-select option { color: #1e293b; }
    .bulk-bar {
      display: flex; align-items: center; gap: 8px;
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: 12px; padding: 6px 10px;
    }
    .bulk-count { font-size: 12px; font-weight: 700; color: var(--accent); }
    .bulk-bar select, .bulk-bar input {
      border: 1.5px solid var(--border); border-radius: 8px;
      padding: 5px 8px; font-size: 12px; font-family: inherit;
      background: var(--surface); outline: none;
    }
    .bulk-bar input { width: 90px; }
    .bulk-bar .btn-save { padding: 6px 14px; font-size: 12px; }
    .col-check { width: 40px; text-align: center; cursor: default; }
    .col-static { cursor: default; }
    .col-static:hover { color: var(--muted); }
    input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
    tr.bajo-costo { background: #fef2f2; }
    tr.bajo-costo:hover { background: #fee2e2; }
    .neg { color: var(--red); font-weight: 700; }
    ul.pv { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; }
    ul.pv li { font-size: 12px; font-variant-numeric: tabular-nums; }
    .pv-badge { display: inline-block; min-width: 38px; padding: 1px 7px; border-radius: 999px;
      background: #eff6ff; color: #2563eb; font-weight: 700; text-align: center; font-size: 11px; }
    ul.pv .pv-badge { margin-right: 6px; }
    ul.pv em { color: var(--green); font-style: normal; font-weight: 600; }
    ul.pv em.neg { color: var(--red); }
  `],
})
export class PreciosPageComponent implements OnInit {
  readonly store = inject(PreciosStore);
  private toast = inject(ToastService);
  readonly drawer = viewChild(PrecioProductoDrawerComponent);

  readonly drawerRow = signal<PrecioProductoRowDto | null>(null);
  bulkAction: "setPrecioNeto" | "setMaxDesc" | "clearMaxDesc" = "setPrecioNeto";
  bulkValor: number | null = null;

  readonly viewFilter = signal<ViewFilter>("todos");
  readonly sort = signal<{ key: SortKey; asc: boolean }>({ key: "codSerfel", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(25);

  readonly stats = computed(() => {
    const rows = this.store.rows();
    return {
      conDescuento: rows.filter((r) => r.maxPorcenDesc > 0).length,
      bajoCosto: rows.filter((r) => r.bajoCosto).length,
    };
  });

  /** store's text filter, then the client-side "Mostrar" view filter, then sorted. */
  readonly sortedRows = computed(() => {
    const view = this.viewFilter();
    const base = this.store.filteredRows().filter((r) => {
      if (view === "bajoCosto") return r.bajoCosto;
      if (view === "conDescuento") return r.maxPorcenDesc > 0;
      return true;
    });
    const { key, asc } = this.sort();
    const dir = asc ? 1 : -1;
    return [...base].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      // nulls always last, regardless of direction
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  });

  readonly paged = computed(() => {
    const all = this.sortedRows();
    const per = this.perPage();
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / per));
    const page = Math.min(this.page(), totalPages);
    const from = total === 0 ? 0 : (page - 1) * per + 1;
    const to = Math.min(page * per, total);
    return { slice: all.slice((page - 1) * per, page * per), from, to, page, totalPages };
  });

  readonly allSelected = computed(() => {
    const rows = this.sortedRows();
    const sel = this.store.selectedIds();
    return rows.length > 0 && rows.every((r) => sel.has(r.idProducto));
  });

  async ngOnInit(): Promise<void> {
    await this.store.loadListas();
  }

  async onSelectLista(id: number): Promise<void> {
    this.page.set(1);
    await this.store.selectLista(id);
  }

  onSearch(q: string): void {
    this.store.setFilter(q);
    this.page.set(1);
  }

  setViewFilter(v: ViewFilter): void {
    this.viewFilter.set(v);
    this.page.set(1);
  }

  clearFilters(): void {
    this.store.setFilter("");
    this.viewFilter.set("todos");
    this.page.set(1);
  }

  toggleSort(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }

  sortInd(key: SortKey): string {
    const s = this.sort();
    return s.key === key ? (s.asc ? "↑" : "↓") : "↕";
  }

  goPage(n: number): void { this.page.set(n); }

  /** Windowed page numbers (max 7 buttons). */
  pageNumbers(): number[] {
    const total = this.paged().totalPages;
    const current = this.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6));
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

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
