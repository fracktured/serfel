import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NavbarComponent } from "../../core/navbar.component";
import { FechaLocalPipe } from "../../shared/fecha-local.pipe";
import { PrefacturacionStore } from "./prefacturacion-store";
import type { SortKey } from "./prefacturacion-logic";

@Component({
  selector: "app-prefacturacion-page",
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FechaLocalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar>
      <div class="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Buscar pedido, cliente, local, vendedor…"
               [ngModel]="store.query()" (ngModelChange)="store.setQuery($event)" />
      </div>
    </app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Prefacturación</h1>
          <p>Selecciona los pedidos pendientes y genera sus facturas por empresa</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-white"
                  [disabled]="store.procesando() || store.stats().seleccionados === 0 || store.empresaSeleccionada() === null"
                  (click)="store.prefacturar()">
            @if (store.procesando()) {
              <span class="spinner"></span>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            }
            Prefacturar
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
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 11h6"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#7c3aed">{{ store.stats().total }}</div>
            <div class="stat-lbl">Pendientes</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dbeafe,#bfdbfe)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#2563eb">{{ store.stats().seleccionados }}</div>
            <div class="stat-lbl">Seleccionados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#059669">{{ store.stats().facturados }}</div>
            <div class="stat-lbl">Facturados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap" style="background:linear-gradient(135deg,#fee2e2,#fecaca)">
            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </div>
          <div>
            <div class="stat-num" style="color:#dc2626">{{ store.stats().errores }}</div>
            <div class="stat-lbl">Errores</div>
          </div>
        </div>
      </div>

      <div class="filter-dropdowns">
        <div class="fd-field" style="flex:1">
          <label for="empresa">Rut Empresa</label>
          <select id="empresa" [ngModel]="store.empresaSeleccionada()" (ngModelChange)="store.setEmpresa($event)">
            <option [ngValue]="null">Seleccione una empresa</option>
            @for (e of store.empresas(); track e.rutEmpresa) {
              <option [ngValue]="e.rutEmpresa">{{ e.rutEmpresa }}-{{ e.dv }} · {{ e.razonSocial }}</option>
            }
          </select>
        </div>
      </div>

      <div class="toolbar">
        <span class="result-count">
          {{ store.filtered().length }} pedido{{ store.filtered().length === 1 ? '' : 's' }} pendiente{{ store.filtered().length === 1 ? '' : 's' }}
          @if (store.loading()) { · cargando… }
        </span>
      </div>

      @if (store.filtered().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                @for (col of columns; track col.key) {
                  <th (click)="store.toggleSort(col.key)" [class.sorted]="store.sort().key === col.key">
                    {{ col.label }} <span class="sort-ind">{{ sortInd(col.key) }}</span>
                  </th>
                }
                <th>Estado</th>
                <th style="width:60px; text-align:center">
                  <input type="checkbox" [checked]="store.allSelected()" (change)="store.toggleAll()"
                         [title]="store.allSelected() ? 'Deseleccionar todos' : 'Seleccionar todos'" />
                </th>
              </tr>
            </thead>
            <tbody>
              @for (p of store.filtered(); track p.idPedido) {
                <tr>
                  <td class="t-num">{{ p.idPedido }}</td>
                  <td class="t-muted">{{ p.fecha | fechaLocal: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ p.rutCliente }}-{{ p.dvCliente }}</td>
                  <td class="t-name">{{ p.nomFantasia }}</td>
                  <td>{{ p.nomLocal }}</td>
                  <td class="t-muted">{{ p.contacto }}</td>
                  <td>{{ p.vendedor }}</td>
                  <td class="t-price">{{ p.precioTotal | number }}</td>
                  <td>
                    @if (resultOf(p.idPedido); as r) {
                      @if (r.status === 'facturado') {
                        <span class="status-badge ok" [title]="r.mensajes.join('\n')">✓ Venta {{ r.idVenta }}{{ r.mensajes.length ? ' ⚠' : '' }}</span>
                      } @else {
                        <span class="status-badge err" [title]="r.error || ''">✕ {{ r.error }}</span>
                      }
                    }
                  </td>
                  <td style="text-align:center">
                    <input type="checkbox" [checked]="store.seleccion().has(p.idPedido)" (change)="store.toggle(p.idPedido)" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!store.loading()) {
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <div class="empty-title">No hay pedidos pendientes</div>
          <div class="empty-sub">Ajusta la búsqueda o vuelve más tarde</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .t-price { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    .status-badge {
      display: inline-block;
      font-size: 11px; font-weight: 700;
      padding: 3px 9px; border-radius: 6px;
      white-space: nowrap;
    }
    .status-badge.ok { background: #f0fdf4; color: #14532d; border: 1px solid #bbf7d0; }
    .status-badge.err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent); }
    .spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid var(--accent); border-top-color: transparent;
      border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PrefacturacionPageComponent implements OnInit {
  readonly store = inject(PrefacturacionStore);

  readonly columns: { key: SortKey; label: string }[] = [
    { key: "idPedido", label: "N°" },
    { key: "fecha", label: "Fecha Pedido" },
    { key: "rutCliente", label: "Rut Cliente" },
    { key: "nomFantasia", label: "Nombre Fantasía" },
    { key: "nomLocal", label: "Nombre Local" },
    { key: "contacto", label: "Contacto" },
    { key: "vendedor", label: "Vendedor" },
    { key: "precioTotal", label: "Precio Total" },
  ];

  private readonly resultados = computed(() => this.store.resultados());

  ngOnInit(): void {
    void this.store.load();
  }

  sortInd(key: SortKey): string {
    const s = this.store.sort();
    return s.key === key ? (s.asc ? "↑" : "↓") : "↕";
  }

  resultOf(idPedido: number) {
    return this.resultados().get(idPedido) ?? null;
  }
}
