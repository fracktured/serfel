import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody,
  EstadoFilter,
  LookupsDto,
  ProductoDto,
  ProductoInput,
} from "@serfel/shared";
import { ProductosApi } from "./productos-api.service";
import {
  applyFilters,
  computeStats,
  paginate,
  sortRows,
  type Filters,
  type Sort,
  type SortKey,
} from "./productos-logic";

const EMPTY_FILTERS: Filters = { codigo: "", nombre: "", idMarca: null, quick: "" };

/** Extracts the structured API error body, or null for network/unknown errors. */
export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class ProductosStore {
  private api = inject(ProductosApi);

  readonly productos = signal<ProductoDto[]>([]);
  readonly lookups = signal<LookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "codSerfel", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() =>
    sortRows(applyFilters(this.productos(), this.filters()), this.sort())
  );
  readonly paged = computed(() =>
    paginate(this.filtered(), this.page(), this.perPage())
  );
  readonly stats = computed(() =>
    computeStats(this.productos(), this.filtered())
  );

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [productos, lookups] = await Promise.all([
        firstValueFrom(this.api.list(this.estadoFilter())),
        this.lookups()
          ? Promise.resolve(this.lookups()!)
          : firstValueFrom(this.api.lookups()),
      ]);
      this.productos.set(productos);
      this.lookups.set(lookups);
    } catch (err) {
      const known = apiError(err);
      this.errorMsg.set(
        known?.message ?? "No se pudo cargar el catálogo. Revisa tu conexión."
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
    this.sort.update((s) =>
      s.key === key ? { key, asc: !s.asc } : { key, asc: true }
    );
  }

  async create(input: ProductoInput): Promise<void> {
    await firstValueFrom(this.api.create(input));
    await this.load();
  }
  async update(id: number, input: ProductoInput): Promise<void> {
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
