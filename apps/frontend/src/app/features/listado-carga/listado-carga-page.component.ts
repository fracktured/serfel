import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject, OnInit } from "@angular/core";
import { NavbarComponent } from "../../core/navbar.component";
import { ToastComponent } from "../../core/toast.component";
import { ToastService } from "../../core/toast.service";
import { parseApiErrorText } from "./listado-carga-logic";
import { ListadoCargaStore, apiError } from "./listado-carga-store";

@Component({
  selector: "app-listado-carga-page",
  standalone: true,
  imports: [NavbarComponent, ToastComponent],
  template: `
    <app-navbar />

    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>Listado Carga</h1>
          <p>Selecciona las rutas e imprime el listado de carga</p>
        </div>
        <div class="hero-actions">
          <button class="hero-btn hero-btn-white" [disabled]="!store.hasSelection() || store.generating()" (click)="imprimir()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
            {{ store.generating() ? 'Generando…' : 'Imprimir listado' }}
          </button>
        </div>
      </div>
    </div>

    <div class="page-body">
      @if (store.errorMsg(); as msg) {
        <div class="login-error">{{ msg }}</div>
      }

      <div class="tipo-row">
        <label class="tipo-opt">
          <input type="radio" name="tipo" [checked]="store.tipo() === 'ventas'" (change)="store.tipo.set('ventas')" />
          <span>Ventas</span>
        </label>
        <label class="tipo-opt">
          <input type="radio" name="tipo" [checked]="store.tipo() === 'pedidos'" (change)="store.tipo.set('pedidos')" />
          <span>Pedidos</span>
        </label>
      </div>

      <div class="rutas-card">
        @if (store.loading()) {
          <p class="rutas-empty">Cargando rutas…</p>
        } @else if (store.rutas().length === 0) {
          <p class="rutas-empty">No hay rutas activas.</p>
        } @else {
          <label class="ruta-row ruta-all">
            <input type="checkbox" [checked]="store.allChecked()" (change)="store.toggleAll()" />
            <span>Seleccionar todas</span>
          </label>
          @for (ruta of store.rutas(); track ruta.idRuta) {
            <label class="ruta-row">
              <input type="checkbox" [checked]="store.selected().has(ruta.idRuta)" (change)="store.toggle(ruta.idRuta)" />
              <span>{{ ruta.nomRuta }}</span>
            </label>
          }
        }
      </div>
    </div>

    <app-toast />
  `,
  styles: [`
    .rutas-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px; max-width: 480px; }
    .ruta-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    .ruta-row:hover { background: #f8fafc; }
    .ruta-row input { width: 16px; height: 16px; accent-color: var(--accent, #7c3aed); }
    .ruta-all { font-weight: 600; border-bottom: 1px solid #eef2f7; border-radius: 8px 8px 0 0; }
    .rutas-empty { padding: 16px; color: #6b7280; font-size: 14px; }
    .tipo-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .tipo-opt { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
    .tipo-opt input { width: 16px; height: 16px; accent-color: var(--accent, #7c3aed); }
  `],
})
export class ListadoCargaPageComponent implements OnInit {
  readonly store = inject(ListadoCargaStore);
  private toast = inject(ToastService);

  ngOnInit(): void {
    void this.store.load();
  }

  async imprimir(): Promise<void> {
    try {
      const blob = await this.store.generatePdf();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      this.toast.show(await this.cargoListError(err), "error");
    }
  }

  private async cargoListError(err: unknown): Promise<string> {
    if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
      const parsed = parseApiErrorText(await err.error.text());
      if (parsed) return parsed.message;
    }
    return apiError(err)?.message ?? "No se pudo generar el listado.";
  }
}
