import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type { ApiErrorBody, EstadoFilter, MarcaDto, MarcaInput } from "@serfel/shared";
import { MarcasApi } from "./marcas-api.service";
import {
  applyFilters, computeStats, paginate, sortRows,
  type Filters, type Sort, type SortKey,
} from "./marcas-logic";

const EMPTY_FILTERS: Filters = { nombre: "", quick: "" };

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class MarcasStore {
  private api = inject(MarcasApi);

  readonly marcas = signal<MarcaDto[]>([]);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "nomMarca", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() =>
    sortRows(applyFilters(this.marcas(), this.filters()), this.sort())
  );
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.marcas(), this.filtered()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.marcas.set(await firstValueFrom(this.api.list(this.estadoFilter())));
    } catch (err) {
      this.errorMsg.set(
        apiError(err)?.message ?? "No se pudo cargar el listado de marcas. Revisa tu conexión."
      );
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> {
    this.estadoFilter.set(estado);
    this.page.set(1);
    await this.load();
  }

  setFilter(patch: Partial<Filters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
    this.page.set(1);
  }

  clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
    this.page.set(1);
  }

  toggleSort(key: SortKey): void {
    this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true }));
  }

  async create(input: MarcaInput): Promise<void> {
    await firstValueFrom(this.api.create(input));
    await this.load();
  }
  async update(id: number, input: MarcaInput): Promise<void> {
    await firstValueFrom(this.api.update(id, input));
    await this.load();
  }
  async deactivate(id: number): Promise<void> {
    await firstValueFrom(this.api.deactivate(id));
    await this.load();
  }
  async restore(id: number): Promise<void> {
    await firstValueFrom(this.api.restore(id));
    await this.load();
  }
}
