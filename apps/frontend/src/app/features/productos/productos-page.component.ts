import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { EstadoFilter, ProductoDto, ProductoInput } from '@serfel/shared';
import { AuthService } from '../../core/auth.service';
import { ProductosStore, apiError } from './productos-store';
import { ProductModalComponent } from './product-modal.component';
import { ToastComponent } from '../../core/toast.component';
import { ToastService } from '../../core/toast.service';
import { brandBadgeStyle, toCsv, type SortKey } from './productos-logic';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [FormsModule, ProductModalComponent, ToastComponent],
  template: `
    <header class="header">
      <div class="header-inner">
        <div class="header-logo">
          <div class="logo-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          Serfel
        </div>
        <nav class="header-nav">
          <div class="nav-item active">Productos</div>
        </nav>
        <div class="header-spacer"></div>
        <div class="header-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Buscar en catálogo…"
                 [ngModel]="store.filters().quick"
                 (ngModelChange)="store.setFilter({ quick: $event })" />
        </div>
        <div class="header-avatar" (click)="logout()" title="Cerrar sesión">⎋</div>
      </div>
    </header>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Catálogo de Productos</h1>
          <p>Gestiona, filtra y actualiza todos los productos del sistema</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo Producto
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) {
        <div class="login-error">{{ msg }}</div>
      }

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div>
            <div class="stat-lbl">Productos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#2563eb">{{ store.stats().marcas }}</div>
            <div class="stat-lbl">Marcas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#059669">{{ store.stats().tipos }}</div>
            <div class="stat-lbl">Tipos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#d97706">{{ store.stats().filtrados ?? '—' }}</div>
            <div class="stat-lbl">Filtrados</div>
          </div>
        </div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field">
          <label for="f-code">Nº</label>
          <input id="f-code" type="text" placeholder="311" style="width:130px"
                 [ngModel]="store.filters().codigo"
                 (ngModelChange)="store.setFilter({ codigo: $event })" />
        </div>
        <div class="fd-field" style="flex:1">
          <label for="f-name">Nombre del Producto</label>
          <input id="f-name" type="text" placeholder="Buscar por nombre…"
                 [ngModel]="store.filters().nombre"
                 (ngModelChange)="store.setFilter({ nombre: $event })" />
        </div>
        <div class="fd-field">
          <label for="f-brand">Marca</label>
          <select id="f-brand" style="min-width:160px"
                  [ngModel]="store.filters().idMarca"
                  (ngModelChange)="store.setFilter({ idMarca: $event })">
            <option [ngValue]="null">Todas las marcas</option>
            @for (m of store.lookups()?.marcas ?? []; track m.id) {
              <option [ngValue]="m.id">{{ m.nombre }}</option>
            }
          </select>
        </div>
        <div class="fd-field">
          <label for="f-estado">Estado</label>
          <select id="f-estado" [ngModel]="store.estadoFilter()" (ngModelChange)="setEstado($event)">
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <button class="btn-clear" (click)="store.clearFilters()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          Limpiar
        </button>
      </div>

      <div class="toolbar">
        <span class="result-count">
          {{ store.filtered().length }} producto{{ store.filtered().length === 1 ? '' : 's' }} encontrado{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th (click)="store.toggleSort('codSerfel')" [class.sorted]="store.sort().key === 'codSerfel'">
                  Nº <span class="sort-ind">{{ sortInd('codSerfel') }}</span>
                </th>
                <th (click)="store.toggleSort('nomProducto')" [class.sorted]="store.sort().key === 'nomProducto'">
                  Nombre Producto <span class="sort-ind">{{ sortInd('nomProducto') }}</span>
                </th>
                <th (click)="store.toggleSort('nomMarca')" [class.sorted]="store.sort().key === 'nomMarca'">
                  Marca <span class="sort-ind">{{ sortInd('nomMarca') }}</span>
                </th>
                <th (click)="store.toggleSort('nomUm')" [class.sorted]="store.sort().key === 'nomUm'">
                  UM <span class="sort-ind">{{ sortInd('nomUm') }}</span>
                </th>
                <th (click)="store.toggleSort('nomTipoProducto')" [class.sorted]="store.sort().key === 'nomTipoProducto'">
                  Tipo <span class="sort-ind">{{ sortInd('nomTipoProducto') }}</span>
                </th>
                <th style="width:150px; text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of store.paged().slice; track p.idProducto) {
                <tr>
                  <td class="t-num">{{ p.codSerfel }}</td>
                  <td class="t-name">{{ p.nomProducto }}</td>
                  <td>
                    <span class="brand-badge"
                          [style.background]="badge(p.idMarca).background"
                          [style.color]="badge(p.idMarca).color">{{ p.nomMarca }}</span>
                  </td>
                  <td><span class="um-badge">{{ p.nomUm }}</span></td>
                  <td class="t-muted">{{ p.nomTipoProducto }}</td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (p.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(p)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(p)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          Eliminar
                        </button>
                      } @else {
                        <button class="t-btn t-btn-edit" (click)="restore(p)" title="Restaurar">↩ Restaurar</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <div class="per-page-wrap">
              Mostrar
              <select [ngModel]="store.perPage()" (ngModelChange)="store.perPage.set(+$event); store.page.set(1)">
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
              </select>
              por página
            </div>
            <span class="pag-info">{{ store.paged().from }}–{{ store.paged().to }} de {{ store.filtered().length }}</span>
            <div class="pag-controls">
              <button class="pag-btn" [disabled]="store.paged().page === 1" (click)="goPage(store.paged().page - 1)">‹</button>
              @for (n of pageNumbers(); track n) {
                <button class="pag-btn" [class.active]="n === store.paged().page" (click)="goPage(n)">{{ n }}</button>
              }
              <button class="pag-btn" [disabled]="store.paged().page === store.paged().totalPages" (click)="goPage(store.paged().page + 1)">›</button>
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
    @if (modalOpen()) {
      <app-product-modal
        [product]="editing()"
        [lookups]="store.lookups()!"
        (save)="onSave($event)"
        (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class ProductosPageComponent implements OnInit {
  readonly store = inject(ProductosStore);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toasts = inject(ToastService);
  readonly modalOpen = signal(false);
  readonly editing = signal<ProductoDto | null>(null);
  private modal = viewChild(ProductModalComponent);

  ngOnInit(): void {
    void this.store.load();
  }

  badge = brandBadgeStyle;

  sortInd(key: SortKey): string {
    const s = this.store.sort();
    return s.key === key ? (s.asc ? '↑' : '↓') : '↕';
  }

  goPage(n: number): void {
    this.store.page.set(n);
  }

  /** Windowed page numbers (max 7 buttons). */
  pageNumbers(): number[] {
    const total = this.store.paged().totalPages;
    const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6));
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  setEstado(estado: EstadoFilter): void {
    void this.store.setEstado(estado);
  }

  async restore(p: ProductoDto): Promise<void> {
    try {
      await this.store.restore(p.idProducto);
      this.toasts.show('Producto restaurado');
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? 'No se pudo restaurar', 'error');
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'productos.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  openModal(product: ProductoDto | null): void {
    if (!this.store.lookups()) return; // still loading
    this.editing.set(product);
    this.modalOpen.set(true);
  }

  async onSave(input: ProductoInput): Promise<void> {
    const current = this.editing();
    try {
      if (current) {
        await this.store.update(current.idProducto, input);
        this.toasts.show('Producto actualizado exitosamente');
      } else {
        await this.store.create(input);
        this.toasts.show('Producto creado exitosamente');
      }
      this.modalOpen.set(false);
    } catch (err) {
      const known = apiError(err);
      if (known && (known.code === 'COD_SERFEL_EN_USO' || known.code === 'NOMBRE_EN_USO')) {
        this.modal()?.setServerError(known.code, known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? 'Error al guardar el producto', 'error');
      }
    }
  }

  async confirmDelete(product: ProductoDto): Promise<void> {
    if (!confirm(`¿Eliminar "${product.nomProducto}" del catálogo? Podrás restaurarlo desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(product.idProducto);
      this.toasts.show('Producto eliminado', 'error');
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? 'Error al eliminar', 'error');
    }
  }
}
