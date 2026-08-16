import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, ClienteCreateInput, ClienteDto, ClienteLookupsDto, ClienteUpdateInput,
} from "@serfel/shared";
import { ClientesApi } from "./clientes-api.service";
import { computeStats, paginate, sortRows, type Filters, type Sort, type SortKey } from "./clientes-logic";

const EMPTY_FILTERS: Filters = { rut: "", razonSocial: "", direccion: "" };

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
  readonly hasSearched = signal(false);
  readonly sort = signal<Sort>({ key: "razonSocial", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() => sortRows(this.clientes(), this.sort()));
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.clientes(), this.filtered()));

  async load(): Promise<void> {
    if (this.lookups()) return;
    this.errorMsg.set(null);
    try {
      this.lookups.set(await firstValueFrom(this.api.lookups()));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar la configuración de clientes.");
    }
  }

  async search(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const clientes = await firstValueFrom(
        this.api.search({ estado: this.estadoFilter(), ...this.filters() }),
      );
      this.clientes.set(clientes);
      this.hasSearched.set(true);
      this.page.set(1);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo buscar clientes. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> {
    this.estadoFilter.set(estado); this.page.set(1);
    if (this.hasSearched()) await this.search();
  }
  setFilter(patch: Partial<Filters>): void { this.filters.update((f) => ({ ...f, ...patch })); this.page.set(1); }
  clearFilters(): void { this.filters.set(EMPTY_FILTERS); this.page.set(1); }
  toggleSort(key: SortKey): void { this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true })); }

  async create(input: ClienteCreateInput): Promise<void> { await firstValueFrom(this.api.create(input)); if (this.hasSearched()) await this.search(); }
  async update(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.update(rut, input)); if (this.hasSearched()) await this.search(); }
  async activate(rut: number, input: ClienteUpdateInput): Promise<void> { await firstValueFrom(this.api.activate(rut, input)); if (this.hasSearched()) await this.search(); }
  async deactivate(rut: number): Promise<void> { await firstValueFrom(this.api.deactivate(rut)); if (this.hasSearched()) await this.search(); }
}
