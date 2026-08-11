import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { EstadoFilter, UsuarioDto } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { UsuariosStore, apiError, rutInactivoId } from "./usuarios-store";
import { UsuarioModalComponent, type UsuarioSavePayload } from "./usuario-modal.component";
import { toCsv, type SortKey } from "./usuarios-logic";

@Component({
  selector: "app-usuarios-page",
  standalone: true,
  imports: [FormsModule, NavbarComponent, UsuarioModalComponent, ToastComponent],
  template: `
    <app-navbar>
      <div class="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Buscar usuarios…"
               [ngModel]="store.filters().quick" (ngModelChange)="store.setFilter({ quick: $event })" />
      </div>
    </app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Usuarios</h1>
          <p>Gestiona usuarios del sistema y su acceso</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo Usuario
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div><div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div><div class="stat-lbl">Usuarios</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg></div>
          <div><div class="stat-num" style="color:#2563eb">{{ store.stats().tipos }}</div><div class="stat-lbl">Tipos</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg></div>
          <div><div class="stat-num" style="color:#059669">{{ store.stats().conCognito }}</div><div class="stat-lbl">Con Cognito</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
          <div><div class="stat-num" style="color:#d97706">{{ store.stats().filtrados ?? '—' }}</div><div class="stat-lbl">Filtrados</div></div></div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field"><label for="f-rut">RUT</label>
          <input id="f-rut" type="text" placeholder="12345678" style="width:150px"
                 [ngModel]="store.filters().rut" (ngModelChange)="store.setFilter({ rut: $event })" /></div>
        <div class="fd-field" style="flex:1"><label for="f-nom">Nombre</label>
          <input id="f-nom" type="text" placeholder="Buscar por nombre…"
                 [ngModel]="store.filters().nombre" (ngModelChange)="store.setFilter({ nombre: $event })" /></div>
        <div class="fd-field"><label for="f-tipo">Tipo</label>
          <select id="f-tipo" style="min-width:160px"
                  [ngModel]="store.filters().idTipoUsuario" (ngModelChange)="store.setFilter({ idTipoUsuario: $event })">
            <option [ngValue]="null">Todos los tipos</option>
            @for (t of store.lookups()?.tiposUsuario ?? []; track t.id) { <option [ngValue]="t.id">{{ t.nombre }}</option> }
          </select></div>
        <div class="fd-field"><label for="f-estado">Estado</label>
          <select id="f-estado" [ngModel]="store.estadoFilter()" (ngModelChange)="setEstado($event)">
            <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
          </select></div>
        <button class="btn-clear" (click)="store.clearFilters()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg> Limpiar
        </button>
      </div>

      <div class="toolbar">
        <span class="result-count">
          {{ store.filtered().length }} usuario{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th (click)="store.toggleSort('rut')" [class.sorted]="store.sort().key === 'rut'">RUT <span class="sort-ind">{{ sortInd('rut') }}</span></th>
              <th (click)="store.toggleSort('nombreCompleto')" [class.sorted]="store.sort().key === 'nombreCompleto'">Nombre <span class="sort-ind">{{ sortInd('nombreCompleto') }}</span></th>
              <th (click)="store.toggleSort('nomTipoUsuario')" [class.sorted]="store.sort().key === 'nomTipoUsuario'">Tipo <span class="sort-ind">{{ sortInd('nomTipoUsuario') }}</span></th>
              <th (click)="store.toggleSort('emailUsuario')" [class.sorted]="store.sort().key === 'emailUsuario'">Email <span class="sort-ind">{{ sortInd('emailUsuario') }}</span></th>
              <th>Cognito</th>
              <th style="width:190px; text-align:center">Acciones</th>
            </tr></thead>
            <tbody>
              @for (u of store.paged().slice; track u.idUsuario) {
                <tr>
                  <td class="t-num">{{ u.rut }}</td>
                  <td class="t-name">{{ u.nombreCompleto }}</td>
                  <td class="t-muted">{{ u.nomTipoUsuario }}</td>
                  <td class="t-muted">{{ u.emailUsuario }}</td>
                  <td>
                    @if (u.tieneCognito) { <span class="um-badge">Sí</span> }
                    @else if (u.idEstado === 1) {
                      <button class="t-btn t-btn-edit" (click)="enroll(u)" title="Crear en Cognito">Crear Cognito</button>
                    } @else { <span class="t-muted">—</span> }
                  </td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (u.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(u)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(u)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg> Eliminar
                        </button>
                      } @else { <span class="t-muted">Inactivo</span> }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <div class="per-page-wrap">Mostrar
              <select [ngModel]="store.perPage()" (ngModelChange)="store.perPage.set(+$event); store.page.set(1)">
                <option [ngValue]="10">10</option><option [ngValue]="25">25</option><option [ngValue]="50">50</option>
              </select> por página</div>
            <span class="pag-info">{{ store.paged().from }}–{{ store.paged().to }} de {{ store.filtered().length }}</span>
            <div class="pag-controls">
              <button class="pag-btn" [disabled]="store.paged().page === 1" (click)="goPage(store.paged().page - 1)">‹</button>
              @for (n of pageNumbers(); track n) { <button class="pag-btn" [class.active]="n === store.paged().page" (click)="goPage(n)">{{ n }}</button> }
              <button class="pag-btn" [disabled]="store.paged().page === store.paged().totalPages" (click)="goPage(store.paged().page + 1)">›</button>
            </div>
          </div>
        </div>
      } @else if (!store.loading()) {
        <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No se encontraron usuarios</div><div class="empty-sub">Intenta con otros filtros</div></div>
      }
    </div>

    @if (modalOpen()) {
      <app-usuario-modal [usuario]="editing()" [lookups]="store.lookups()!"
        (save)="onSave($event)" (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class UsuariosPageComponent implements OnInit {
  readonly store = inject(UsuariosStore);
  private toasts = inject(ToastService);
  readonly modalOpen = signal(false);
  readonly editing = signal<UsuarioDto | null>(null);
  private modal = viewChild(UsuarioModalComponent);

  ngOnInit(): void { void this.store.load(); }

  sortInd(key: SortKey): string { const s = this.store.sort(); return s.key === key ? (s.asc ? "↑" : "↓") : "↕"; }
  goPage(n: number): void { this.store.page.set(n); }
  pageNumbers(): number[] {
    const total = this.store.paged().totalPages; const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6)); const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  setEstado(estado: EstadoFilter): void { void this.store.setEstado(estado); }

  openModal(u: UsuarioDto | null): void { if (!this.store.lookups()) return; this.editing.set(u); this.modalOpen.set(true); }

  async onSave(payload: UsuarioSavePayload): Promise<void> {
    const current = this.editing();
    try {
      if (payload.mode === "update" && current) {
        await this.store.update(current.idUsuario, payload.data);
        this.toasts.show("Usuario actualizado exitosamente");
      } else if (payload.mode === "create") {
        await this.store.create(payload.data);
        this.toasts.show("Usuario creado exitosamente");
      }
      this.modalOpen.set(false);
    } catch (err) {
      const inactiveId = rutInactivoId(err);
      if (inactiveId !== null && payload.mode === "create") {
        if (confirm("Este RUT existe pero está inactivo. ¿Deseas reactivarlo con estos datos?")) {
          try {
            await this.store.activate(inactiveId, payload.data);
            this.toasts.show("Usuario reactivado exitosamente");
            this.modalOpen.set(false);
          } catch (e2) {
            this.toasts.show(apiError(e2)?.message ?? "No se pudo reactivar", "error");
          }
        } else {
          this.modal()?.setServerError("RUT_EN_USO", "RUT inactivo");
        }
        return;
      }
      const known = apiError(err);
      if (known && (known.code === "RUT_EN_USO" || known.code === "NUM_EN_USO" || known.code === "EMAIL_EN_USO")) {
        this.modal()?.setServerError(known.code, known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? "Error al guardar el usuario", "error");
      }
    }
  }

  async enroll(u: UsuarioDto): Promise<void> {
    if (!confirm(`¿Crear el usuario de Cognito para ${u.nombreCompleto}? Se enviará una invitación a ${u.emailUsuario}.`)) return;
    try {
      await this.store.enrollCognito(u.idUsuario);
      this.toasts.show("Usuario de Cognito creado; invitación enviada");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "No se pudo crear en Cognito", "error");
    }
  }

  async confirmDelete(u: UsuarioDto): Promise<void> {
    if (!confirm(`¿Eliminar a "${u.nombreCompleto}"? Podrás restaurarlo desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(u.idUsuario);
      this.toasts.show("Usuario eliminado", "error");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "Error al eliminar", "error");
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "usuarios.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
}
