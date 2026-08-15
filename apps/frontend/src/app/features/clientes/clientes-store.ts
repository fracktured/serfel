import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, ClienteCreateInput, ClienteDto, ClienteLookupsDto, ClienteUpdateInput,
} from "@serfel/shared";
import { ClientesApi } from "./clientes-api.service";
import { applyFilters, computeStats, paginate, sortRows, type Filters, type Sort, type SortKey } from "./clientes-logic";

const EMPTY_FILTERS: Filters = { razonSocial: "", rut: "", idListaPrecio: null, quick: "" };

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) return err.error.error as ApiErrorBody["error"];
  return null;
}
/** For a 409 RUT_INACTIVO, the body carries the existing client's rut. */
export function rutInactivoRut(err: unknown): number | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code === "RUT_INACTIVO") {
    const rut = Number(err.error.rut);
    return Number.isInteger(rut) ? rut : null;
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class ClientesStore {
  private api = inject(ClientesApi);

  readonly clientes = signal<ClienteDto[]>([]);
  readonly lookups = signal<ClienteLookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "razonSocial", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() => sortRows(applyFilters(this.clientes(), this.filters()), this.sort()));
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.clientes(), this.filtered()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [clientes, lookups] = await Promise.all([
        firstValueFrom(this.api.list(this.estadoFilter())),
        this.lookups() ? Promise.resolve(this.lookups()!) : firstValueFrom(this.api.lookups()),
      ]);
      this.clientes.set(clientes);
      this.lookups.set(lookups);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar los clientes. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> { this.estadoFilter.set(estado); this.page.set(1); await this.load(); }
  setFilter(patch: Partial<Filters>): void { this.filters.update((f) => ({ ...f, ...patch })); this.page.set(1); }
  clearFilters(): void { this.filters.set(EMPTY_FILTERS); this.page.set(1); }
  toggleSort(key: SortKey): void { this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true })); }

  async create(input: ClienteCreateInput): Promise<void> { await firstValueFrom(this.api.create(input)); await this.load(); }
  async update(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.update(rut, input)); await this.load(); }
  async activate(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.activate(rut, input)); await this.load(); }
  async deactivate(rut: number): Promise<void> { await firstValueFrom(this.api.deactivate(rut)); await this.load(); }
}
