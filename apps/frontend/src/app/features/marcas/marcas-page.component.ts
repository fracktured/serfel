import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { EstadoFilter, MarcaDto, MarcaInput } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { MarcasStore, apiError } from "./marcas-store";
import { MarcaModalComponent } from "./marca-modal.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { toCsv, type SortKey } from "./marcas-logic";

@Component({
  selector: "app-marcas-page",
  standalone: true,
  imports: [FormsModule, NavbarComponent, MarcaModalComponent, ToastComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Catálogo de Marcas</h1>
          <p>Gestiona las marcas de productos del sistema</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nueva Marca
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#2563eb">{{ store.stats().total }}</div>
            <div class="stat-lbl">Marcas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#d97706">{{ store.stats().filtrados ?? '—' }}</div>
            <div class="stat-lbl">Filtradas</div>
          </div>
        </div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field" style="flex:1">
          <label for="f-name">Nombre de la Marca</label>
          <input id="f-name" type="text" placeholder="Buscar por nombre…"
                 [ngModel]="store.filters().nombre"
                 (ngModelChange)="store.setFilter({ nombre: $event })" />
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
          {{ store.filtered().length }} marca{{ store.filtered().length === 1 ? '' : 's' }} encontrada{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th (click)="store.toggleSort('nomMarca')" [class.sorted]="store.sort().key === 'nomMarca'">
                  Nombre <span class="sort-ind">{{ sortInd('nomMarca') }}</span>
                </th>
                <th (click)="store.toggleSort('descMarca')" [class.sorted]="store.sort().key === 'descMarca'">
                  Descripción <span class="sort-ind">{{ sortInd('descMarca') }}</span>
                </th>
                <th style="width:150px; text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (m of store.paged().slice; track m.idMarca) {
                <tr>
                  <td class="t-name">{{ m.nomMarca }}</td>
                  <td class="t-muted">{{ m.descMarca }}</td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (m.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(m)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(m)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          Eliminar
                        </button>
                      } @else {
                        <button class="t-btn t-btn-edit" (click)="restore(m)" title="Restaurar">↩ Restaurar</button>
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
          <div class="empty-title">No se encontraron marcas</div>
          <div class="empty-sub">Intenta con otros filtros de búsqueda</div>
        </div>
      }
    </div>
    @if (modalOpen()) {
      <app-marca-modal [marca]="editing()" (save)="onSave($event)" (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class MarcasPageComponent implements OnInit {
  readonly store = inject(MarcasStore);
  private toasts = inject(ToastService);
  readonly modalOpen = signal(false);
  readonly editing = signal<MarcaDto | null>(null);
  private modal = viewChild(MarcaModalComponent);

  ngOnInit(): void { void this.store.load(); }

  sortInd(key: SortKey): string {
    const s = this.store.sort();
    return s.key === key ? (s.asc ? "↑" : "↓") : "↕";
  }

  goPage(n: number): void { this.store.page.set(n); }

  pageNumbers(): number[] {
    const total = this.store.paged().totalPages;
    const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6));
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  setEstado(estado: EstadoFilter): void { void this.store.setEstado(estado); }

  async restore(m: MarcaDto): Promise<void> {
    try {
      await this.store.restore(m.idMarca);
      this.toasts.show("Marca restaurada");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "No se pudo restaurar", "error");
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "marcas.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  openModal(marca: MarcaDto | null): void {
    this.editing.set(marca);
    this.modalOpen.set(true);
  }

  async onSave(input: MarcaInput): Promise<void> {
    const current = this.editing();
    try {
      if (current) {
        await this.store.update(current.idMarca, input);
        this.toasts.show("Marca actualizada exitosamente");
      } else {
        await this.store.create(input);
        this.toasts.show("Marca creada exitosamente");
      }
      this.modalOpen.set(false);
    } catch (err) {
      const known = apiError(err);
      if (known && known.code === "NOMBRE_EN_USO") {
        this.modal()?.setServerError(known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? "Error al guardar la marca", "error");
      }
    }
  }

  async confirmDelete(marca: MarcaDto): Promise<void> {
    if (!confirm(`¿Eliminar "${marca.nomMarca}"? Podrás restaurarla desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(marca.idMarca);
      this.toasts.show("Marca eliminada", "error");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "Error al eliminar", "error");
    }
  }
}
