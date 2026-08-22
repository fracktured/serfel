import { ChangeDetectionStrategy, Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type { NcLineaInput, VentaCreditableDto } from "@serfel/shared";
import { COD_REF_ANULA, COD_REF_CORRIGE_MONTOS } from "@serfel/shared";
import { NavbarComponent } from "../../core/navbar.component";
import { FechaLocalPipe } from "../../shared/fecha-local.pipe";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { NotasCreditoStore } from "./notas-credito-store";

@Component({
  selector: "app-notas-credito-page",
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FechaLocalPipe, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar></app-navbar>

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Notas de Crédito</h1>
          <p>Busca una venta, corrige montos o anula la factura completa y emite la nota de crédito</p>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) { <div class="login-error">{{ msg }}</div> }

      <div class="filter-dropdowns">
        <div class="fd-field" style="flex:1">
          <label for="q">Buscar venta</label>
          <input id="q" type="text" placeholder="N° folio, RUT o nombre de cliente…"
                 [ngModel]="store.query()" (ngModelChange)="store.query.set($event)"
                 (keyup.enter)="store.buscar()" />
        </div>
        <button class="hero-btn hero-btn-outline" style="align-self:flex-end" [disabled]="store.buscando()" (click)="store.buscar()">
          @if (store.buscando()) { <span class="spinner"></span> } Buscar
        </button>
      </div>

      @if (store.resultados().length > 0 && !store.ventaSeleccionada()) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Ya acreditado</th>
                <th style="width:120px; text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (v of store.resultados(); track v.idVenta) {
                <tr>
                  <td class="t-num">{{ v.idFolio }}</td>
                  <td class="t-muted">{{ v.fechaVenta | fechaLocal: 'dd/MM/yyyy' }}</td>
                  <td class="t-name">{{ v.nomCliente }} ({{ v.rutCliente }})</td>
                  <td class="t-price">{{ v.precioTotal | number }}</td>
                  <td class="t-price">{{ v.montoYaCreditado | number }}</td>
                  <td style="text-align:center">
                    <button class="t-btn t-btn-edit" (click)="store.seleccionar(v)">Seleccionar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (store.resultados().length === 0 && !store.ventaSeleccionada() && !store.buscando()) {
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Sin resultados</div>
          <div class="empty-sub">Busca una venta por folio, RUT o nombre de cliente</div>
        </div>
      }

      @if (store.ventaSeleccionada(); as venta) {
        <div class="table-wrap" style="padding:16px">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
            <div>
              <strong>Folio {{ venta.idFolio }}</strong> · {{ venta.nomCliente }} ({{ venta.rutCliente }})
              @if (store.yaAcreditada()) {
                <span class="status-badge err" style="margin-left:8px">Factura ya acreditada</span>
              }
            </div>
            <button class="btn-clear" (click)="store.limpiarSeleccion()">Cerrar</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th style="width:100px">Cantidad</th>
                <th style="width:120px">Precio</th>
                <th style="width:90px">% Desc.</th>
                <th style="width:140px; text-align:center">¿Devuelve mercadería?</th>
              </tr>
            </thead>
            <tbody>
              @for (linea of store.lineas(); track linea.idProducto) {
                <tr>
                  <td class="t-muted">{{ codSerfelOf(venta, linea.idProducto) }}</td>
                  <td class="t-name">{{ descripcionOf(venta, linea.idProducto) }}</td>
                  <td>
                    <input type="number" min="0" [ngModel]="linea.cantidad"
                           (ngModelChange)="actualizar(linea, { cantidad: +$event })" />
                  </td>
                  <td>
                    <input type="number" min="0" [ngModel]="linea.precio"
                           (ngModelChange)="actualizar(linea, { precio: +$event })" />
                  </td>
                  <td>
                    <input type="number" min="0" max="100" [ngModel]="linea.porcenDesc"
                           (ngModelChange)="actualizar(linea, { porcenDesc: +$event })" />
                  </td>
                  <td style="text-align:center">
                    <input type="checkbox" [ngModel]="linea.restituirStock"
                           (ngModelChange)="actualizar(linea, { restituirStock: $event })" />
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <div class="filter-dropdowns" style="margin-top:12px">
            <div class="fd-field">
              <label for="motivo">Motivo (código)</label>
              <input id="motivo" type="number" min="1" [ngModel]="store.idMotivo()" (ngModelChange)="store.setIdMotivo(+$event)" />
            </div>
            <div class="fd-field">
              <label>Tipo</label>
              <div class="t-muted">{{ store.codRef() === codRefAnula ? 'Anulación completa' : 'Corrección de montos' }}</div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px">
            <button class="hero-btn hero-btn-outline" (click)="store.anularCompleta()">
              Anular factura completa
            </button>
            <div style="text-align:right">
              <div class="t-price" style="font-size:20px">Total: {{ store.total() | number }}</div>
              <button class="hero-btn hero-btn-white" style="margin-top:8px"
                      [disabled]="store.emitiendo() || store.yaAcreditada()"
                      (click)="store.emitir()">
                @if (store.emitiendo()) { <span class="spinner"></span> }
                Emitir Nota de Crédito
              </button>
              @if (store.yaAcreditada()) {
                <div class="t-muted" style="margin-top:4px">Factura ya acreditada</div>
              }
            </div>
          </div>
        </div>
      }

      <h2 style="margin-top:32px">Notas de crédito emitidas</h2>
      @if (store.notas().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Folio venta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th style="width:180px; text-align:center">PDF</th>
              </tr>
            </thead>
            <tbody>
              @for (n of store.notas(); track n.idNotaCredito) {
                <tr>
                  <td class="t-num">{{ n.numNotaCredito }}</td>
                  <td class="t-muted">{{ n.idFolio }}</td>
                  <td class="t-muted">{{ n.fechaNotaCredito | fechaLocal: 'dd/MM/yyyy' }}</td>
                  <td class="t-name">{{ n.nomCliente }} ({{ n.rutCliente }})</td>
                  <td class="t-price">{{ n.precioTotal | number }}</td>
                  <td style="text-align:center">
                    <button class="t-btn t-btn-edit" (click)="store.abrirPdf(n.idNotaCredito, 'original')">PDF</button>
                    <button class="t-btn t-btn-edit" (click)="store.abrirPdf(n.idNotaCredito, 'cedible')">PDF Cedible</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!store.loadingNotas()) {
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <div class="empty-title">Sin notas de crédito emitidas</div>
        </div>
      }
    </div>
    <app-toast />
  `,
  styles: [`
    .t-price { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    .status-badge {
      display: inline-block;
      font-size: 11px; font-weight: 700;
      padding: 3px 9px; border-radius: 6px;
      white-space: nowrap;
    }
    .status-badge.err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent); }
    input[type="number"] { width: 100%; }
    .spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid var(--accent); border-top-color: transparent;
      border-radius: 50%; animation: spin 0.6s linear infinite;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class NotasCreditoPageComponent implements OnInit {
  readonly store = inject(NotasCreditoStore);
  private toasts = inject(ToastService);
  readonly codRefAnula = COD_REF_ANULA;
  readonly codRefCorrige = COD_REF_CORRIGE_MONTOS;

  ngOnInit(): void {
    void this.store.cargarListado();
  }

  codSerfelOf(venta: VentaCreditableDto, idProducto: number): string {
    return String(venta.lineas.find((l) => l.idProducto === idProducto)?.codSerfel ?? "");
  }
  descripcionOf(venta: VentaCreditableDto, idProducto: number): string {
    return venta.lineas.find((l) => l.idProducto === idProducto)?.descripcion ?? "";
  }

  actualizar(linea: NcLineaInput, patch: Partial<NcLineaInput>): void {
    this.store.actualizarLinea(linea.idProducto, patch);
    if (this.store.codRef() === COD_REF_ANULA) this.store.codRef.set(COD_REF_CORRIGE_MONTOS);
  }
}
