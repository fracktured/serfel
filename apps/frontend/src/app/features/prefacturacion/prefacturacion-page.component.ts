import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PrefacturacionStore } from "./prefacturacion-store";
import type { SortKey } from "./prefacturacion-logic";

@Component({
  selector: "app-prefacturacion-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="toolbar">
        <div class="field">
          <label for="empresa">Rut Empresa</label>
          <select id="empresa" [ngModel]="store.empresaSeleccionada()" (ngModelChange)="store.setEmpresa($event)">
            <option [ngValue]="null">Seleccione una empresa</option>
            @for (e of store.empresas(); track e.rutEmpresa) {
              <option [ngValue]="e.rutEmpresa">{{ e.rutEmpresa }}-{{ e.dv }} · {{ e.razonSocial }}</option>
            }
          </select>
        </div>
        <button class="primary" [disabled]="store.procesando() || store.stats().seleccionados === 0" (click)="store.prefacturar()">
          @if (store.procesando()) { <span class="spinner"></span> }
          Prefacturar
        </button>
        <div class="counts">
          <span class="badge">Seleccionados {{ store.stats().seleccionados }}</span>
          <span class="badge ok">Facturados {{ store.stats().facturados }}</span>
          <span class="badge err">Errores {{ store.stats().errores }}</span>
        </div>
        <input class="search" type="search" placeholder="Buscar pedido, cliente, local, vendedor…"
               [ngModel]="store.query()" (ngModelChange)="store.setQuery($event)" />
      </header>

      @if (store.errorMsg()) { <p class="alert">{{ store.errorMsg() }}</p> }
      @if (store.loading()) { <p class="muted">Cargando…</p> }

      <table class="grid">
        <thead>
          <tr>
            @for (col of columns; track col.key) {
              <th (click)="store.toggleSort(col.key)">
                {{ col.label }}
                @if (store.sort().key === col.key) { <span>{{ store.sort().asc ? '▲' : '▼' }}</span> }
              </th>
            }
            <th>Estado</th>
            <th><button class="link" (click)="store.toggleAll()">{{ store.allSelected() ? 'Ninguno' : 'Todos' }}</button></th>
          </tr>
        </thead>
        <tbody>
          @for (p of store.filtered(); track p.idPedido) {
            <tr>
              <td>{{ p.idPedido }}</td>
              <td>{{ p.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ p.rutCliente }}-{{ p.dvCliente }}</td>
              <td>{{ p.nomFantasia }}</td>
              <td>{{ p.nomLocal }}</td>
              <td>{{ p.contacto }}</td>
              <td>{{ p.vendedor }}</td>
              <td class="num">{{ p.precioTotal | number }}</td>
              <td>
                @if (resultOf(p.idPedido); as r) {
                  @if (r.status === 'facturado') {
                    <span class="status ok" [title]="r.mensajes.join('\n')">✓ Venta {{ r.idVenta }}{{ r.mensajes.length ? ' ⚠' : '' }}</span>
                  } @else {
                    <span class="status err" [title]="r.error || ''">✕ {{ r.error }}</span>
                  }
                }
              </td>
              <td class="center">
                <input type="checkbox" [checked]="store.seleccion().has(p.idPedido)" (change)="store.toggle(p.idPedido)" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    .page { padding: 1rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .counts { display: flex; gap: 0.5rem; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 999px; background: #eef2f7; font-size: 0.85rem; }
    .badge.ok { background: #dcfce7; color: #14532d; }
    .badge.err { background: #fee2e2; color: #991b1b; }
    .search { margin-left: auto; padding: 0.4rem 0.6rem; min-width: 16rem; }
    .primary { padding: 0.45rem 1rem; }
    .primary[disabled] { opacity: 0.5; cursor: not-allowed; }
    .grid { width: 100%; border-collapse: collapse; }
    .grid th, .grid td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
    .grid th { cursor: pointer; user-select: none; white-space: nowrap; }
    .num, td.num { text-align: right; }
    .center { text-align: center; }
    .status.ok { color: #14532d; }
    .status.err { color: #991b1b; }
    .alert { background: #fee2e2; color: #991b1b; padding: 0.6rem; border-radius: 6px; }
    .muted { color: #6b7280; }
    .link { background: none; border: none; color: #2563eb; cursor: pointer; }
    .spinner { display: inline-block; width: 0.8rem; height: 0.8rem; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
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

  resultOf(idPedido: number) {
    return this.resultados().get(idPedido) ?? null;
  }
}
