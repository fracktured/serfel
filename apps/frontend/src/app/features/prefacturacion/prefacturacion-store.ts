import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type { ApiErrorBody, PedidoPendienteDto, EmpresaDto, PrefacturaResultItem } from "@serfel/shared";
import { PrefacturacionApi } from "./prefacturacion-api.service";
import { applyFilter, sortRows, computeStats, type Sort, type SortKey } from "./prefacturacion-logic";

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class PrefacturacionStore {
  private api = inject(PrefacturacionApi);

  readonly pedidos = signal<PedidoPendienteDto[]>([]);
  readonly empresas = signal<EmpresaDto[]>([]);
  readonly empresaSeleccionada = signal<number | null>(null);
  readonly seleccion = signal<Set<number>>(new Set());
  readonly resultados = signal<Map<number, PrefacturaResultItem>>(new Map());
  readonly query = signal("");
  readonly sort = signal<Sort>({ key: "idPedido", asc: true });
  readonly loading = signal(false);
  readonly procesando = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly filtered = computed(() => sortRows(applyFilter(this.pedidos(), this.query()), this.sort()));
  readonly stats = computed(() => {
    const base = computeStats(this.filtered(), this.seleccion());
    const rs = [...this.resultados().values()];
    return {
      ...base,
      facturados: rs.filter((r) => r.status === "facturado").length,
      errores: rs.filter((r) => r.status === "error").length,
    };
  });
  readonly allSelected = computed(() => {
    const rows = this.filtered();
    const sel = this.seleccion();
    return rows.length > 0 && rows.every((r) => sel.has(r.idPedido));
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [pedidos, empresas] = await Promise.all([
        firstValueFrom(this.api.pendientes()),
        this.empresas().length ? Promise.resolve(this.empresas()) : firstValueFrom(this.api.empresas()),
      ]);
      this.pedidos.set(pedidos);
      this.empresas.set(empresas);
      // Drop selections for pedidos no longer present.
      const present = new Set(pedidos.map((p) => p.idPedido));
      this.seleccion.update((s) => new Set([...s].filter((id) => present.has(id))));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudieron cargar los pedidos. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  setEmpresa(rutEmpresa: number | null): void {
    this.empresaSeleccionada.set(rutEmpresa);
  }
  setQuery(q: string): void {
    this.query.set(q);
  }
  toggleSort(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }
  toggle(id: number): void {
    this.seleccion.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  toggleAll(): void {
    const rows = this.filtered();
    this.seleccion.update((s) => {
      const allOn = rows.length > 0 && rows.every((r) => s.has(r.idPedido));
      const next = new Set(s);
      for (const r of rows) allOn ? next.delete(r.idPedido) : next.add(r.idPedido);
      return next;
    });
  }

  async prefacturar(): Promise<void> {
    const rutEmpresa = this.empresaSeleccionada();
    if (rutEmpresa === null) {
      this.errorMsg.set("Debe seleccionar una empresa");
      return;
    }
    const idPedidos = [...this.seleccion()];
    if (idPedidos.length === 0) return;

    this.procesando.set(true);
    this.errorMsg.set(null);
    try {
      const result = await firstValueFrom(this.api.prefacturar({ rutEmpresa, idPedidos }));
      this.resultados.update((m) => {
        const next = new Map(m);
        for (const r of result.resultados) next.set(r.idPedido, r);
        return next;
      });
      // Clear selection for the facturados; keep errored rows selected for retry.
      const okIds = new Set(result.resultados.filter((r) => r.status === "facturado").map((r) => r.idPedido));
      this.seleccion.update((s) => new Set([...s].filter((id) => !okIds.has(id))));
      await this.load(); // facturados drop out of the worklist
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo procesar la prefacturación.");
    } finally {
      this.procesando.set(false);
    }
  }
}
