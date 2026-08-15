import { Component, inject, OnInit, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { EstadoFilter, ClienteDto, ClienteUpdateInput } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { ClientesStore, apiError, rutInactivoRut } from "./clientes-store";
import { ClienteModalComponent, type ClienteSavePayload } from "./cliente-modal.component";
import { toCsv, WEEKDAYS, type SortKey } from "./clientes-logic";

@Component({
  selector: "app-clientes-page",
  standalone: true,
  imports: [FormsModule, NavbarComponent, ClienteModalComponent, ToastComponent],
  template: `
    <app-navbar>
      <div class="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Buscar clientes…"
               [ngModel]="store.filters().quick" (ngModelChange)="store.setFilter({ quick: $event })" />
      </div>
    </app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Clientes</h1>
          <p>Gestiona los clientes, sus rutas y documentos</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-outline" (click)="exportCsv()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Exportar
          </button>
          <button class="hero-btn hero-btn-white" (click)="openModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo Cliente
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div><div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div><div class="stat-lbl">Clientes</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M3 3h18v4H3zM3 10h18v11H3z"/></svg></div>
          <div><div class="stat-num" style="color:#2563eb">{{ store.stats().listasPrecio }}</div><div class="stat-lbl">Listas de precio</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <div><div class="stat-num" style="color:#d97706">{{ store.stats().conDeuda }}</div><div class="stat-lbl">Con venta a deuda</div></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
          <div><div class="stat-num" style="color:#059669">{{ store.stats().filtrados ?? '—' }}</div><div class="stat-lbl">Filtrados</div></div></div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field"><label for="f-rut">RUT</label>
          <input id="f-rut" type="text" placeholder="12345678" style="width:150px"
                 [ngModel]="store.filters().rut" (ngModelChange)="store.setFilter({ rut: $event })" /></div>
        <div class="fd-field" style="flex:1"><label for="f-rs">Razón Social</label>
          <input id="f-rs" type="text" placeholder="Buscar por razón social…"
                 [ngModel]="store.filters().razonSocial" (ngModelChange)="store.setFilter({ razonSocial: $event })" /></div>
        <div class="fd-field"><label for="f-lp">Lista de Precio</label>
          <select id="f-lp" style="min-width:160px"
                  [ngModel]="store.filters().idListaPrecio" (ngModelChange)="store.setFilter({ idListaPrecio: $event })">
            <option [ngValue]="null">Todas</option>
            @for (l of store.lookups()?.listasPrecio ?? []; track l.id) { <option [ngValue]="l.id">{{ l.nombre }}</option> }
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
          {{ store.filtered().length }} cliente{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th (click)="store.toggleSort('rut')" [class.sorted]="store.sort().key === 'rut'">RUT <span class="sort-ind">{{ sortInd('rut') }}</span></th>
              <th (click)="store.toggleSort('razonSocial')" [class.sorted]="store.sort().key === 'razonSocial'">Razón Social <span class="sort-ind">{{ sortInd('razonSocial') }}</span></th>
              @for (w of weekdays; track w.dia) { <th style="width:34px;text-align:center" [title]="'Ruta día ' + w.dia">{{ w.label }}</th> }
              <th (click)="store.toggleSort('ultFactura')" [class.sorted]="store.sort().key === 'ultFactura'" style="text-align:right">Ult. Factura <span class="sort-ind">{{ sortInd('ultFactura') }}</span></th>
              <th (click)="store.toggleSort('ultNotaCredito')" [class.sorted]="store.sort().key === 'ultNotaCredito'" style="text-align:right">Ult. Nota Crédito <span class="sort-ind">{{ sortInd('ultNotaCredito') }}</span></th>
              <th style="width:190px; text-align:center">Acciones</th>
            </tr></thead>
            <tbody>
              @for (cli of store.paged().slice; track cli.rutCliente) {
                <tr>
                  <td class="t-num">{{ cli.rut }}</td>
                  <td class="t-name">{{ cli.razonSocial }}<br /><span class="t-muted">{{ cli.nomFantasia }}</span></td>
                  @for (w of weekdays; track w.dia) {
                    <td style="text-align:center">
                      @if (cli.dias.includes(w.dia)) {
                        <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" style="width:16px;height:16px" [attr.aria-label]="'Ruta día ' + w.dia"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      }
                    </td>
                  }
                  <td class="t-num" style="text-align:right">{{ cli.ultFactura ?? '—' }}</td>
                  <td class="t-num" style="text-align:right">{{ cli.ultNotaCredito ?? '—' }}</td>
                  <td>
                    <div class="t-actions" style="justify-content:center">
                      @if (cli.idEstado === 1) {
                        <button class="t-btn t-btn-edit" (click)="openModal(cli)" title="Editar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
                        </button>
                        <button class="t-btn t-btn-del" (click)="confirmDelete(cli)" title="Eliminar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg> Eliminar
                        </button>
                      } @else {
                        <button class="t-btn t-btn-edit" (click)="restore(cli)" title="Restaurar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/></svg> Restaurar
                        </button>
                      }
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
        <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No se encontraron clientes</div><div class="empty-sub">Intenta con otros filtros</div></div>
      }
    </div>

    @if (modalOpen()) {
      <app-cliente-modal [cliente]="editing()" [lookups]="store.lookups()!"
        (save)="onSave($event)" (cancel)="modalOpen.set(false)" />
    }
    <app-toast />
  `,
})
export class ClientesPageComponent implements OnInit {
  readonly store = inject(ClientesStore);
  private toasts = inject(ToastService);
  readonly weekdays = WEEKDAYS;
  readonly modalOpen = signal(false);
  readonly editing = signal<ClienteDto | null>(null);
  private modal = viewChild(ClienteModalComponent);

  ngOnInit(): void { void this.store.load(); }

  sortInd(key: SortKey): string { const s = this.store.sort(); return s.key === key ? (s.asc ? "↑" : "↓") : "↕"; }
  goPage(n: number): void { this.store.page.set(n); }
  pageNumbers(): number[] {
    const total = this.store.paged().totalPages; const current = this.store.paged().page;
    const start = Math.max(1, Math.min(current - 3, total - 6)); const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  setEstado(estado: EstadoFilter): void { void this.store.setEstado(estado); }

  openModal(cli: ClienteDto | null): void { if (!this.store.lookups()) return; this.editing.set(cli); this.modalOpen.set(true); }

  /** Reconstruct the update payload from a DTO (Restaurar resubmits the row's own data). */
  private toUpdate(cli: ClienteDto): ClienteUpdateInput {
    return {
      razonSocial: cli.razonSocial, nomFantasia: cli.nomFantasia, telefono: cli.telefono,
      direccion: cli.direccion, comuna: cli.comuna, ciudad: cli.ciudad, email: cli.email,
      idListaPrecio: cli.idListaPrecio, permiteVentaDeuda: cli.permiteVentaDeuda,
    };
  }

  async onSave(payload: ClienteSavePayload): Promise<void> {
    const current = this.editing();
    try {
      if (payload.mode === "update" && current) {
        await this.store.update(current.rutCliente, payload.data);
        this.toasts.show("Cliente actualizado exitosamente");
      } else if (payload.mode === "create") {
        await this.store.create(payload.data);
        this.toasts.show("Cliente creado exitosamente");
      }
      this.modalOpen.set(false);
    } catch (err) {
      const inactiveRut = rutInactivoRut(err);
      if (inactiveRut !== null && payload.mode === "create") {
        if (confirm("Este RUT existe pero está inactivo. ¿Deseas reactivarlo con estos datos?")) {
          try {
            await this.store.activate(inactiveRut, payload.data);
            this.toasts.show("Cliente reactivado exitosamente");
            this.modalOpen.set(false);
          } catch (e2) {
            this.toasts.show(apiError(e2)?.message ?? "No se pudo reactivar", "error");
            this.modal()?.resetBusy();
          }
        } else {
          this.modal()?.setServerError("RUT_EN_USO", "El RUT existe pero está inactivo");
        }
        return;
      }
      const known = apiError(err);
      if (known && (known.code === "RUT_EN_USO" || known.code === "RAZON_SOCIAL_EN_USO")) {
        this.modal()?.setServerError(known.code, known.message);
      } else {
        this.modalOpen.set(false);
        this.toasts.show(known?.message ?? "Error al guardar el cliente", "error");
      }
    }
  }

  async restore(cli: ClienteDto): Promise<void> {
    if (!confirm(`¿Restaurar al cliente "${cli.razonSocial}"?`)) return;
    try {
      await this.store.activate(cli.rutCliente, this.toUpdate(cli));
      this.toasts.show("Cliente restaurado");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "No se pudo restaurar", "error");
    }
  }

  async confirmDelete(cli: ClienteDto): Promise<void> {
    if (!confirm(`¿Eliminar al cliente "${cli.razonSocial}"? Podrás restaurarlo desde el filtro Inactivos.`)) return;
    try {
      await this.store.deactivate(cli.rutCliente);
      this.toasts.show("Cliente eliminado", "error");
    } catch (err) {
      this.toasts.show(apiError(err)?.message ?? "Error al eliminar", "error");
    }
  }

  exportCsv(): void {
    const blob = new Blob(["﻿" + toCsv(this.store.filtered())], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "clientes.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
}
