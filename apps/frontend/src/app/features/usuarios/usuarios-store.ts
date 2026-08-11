import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, UsuarioCreateInput, UsuarioDto, UsuarioLookupsDto, UsuarioUpdateInput,
} from "@serfel/shared";
import { UsuariosApi } from "./usuarios-api.service";
import { applyFilters, computeStats, paginate, sortRows, type Filters, type Sort, type SortKey } from "./usuarios-logic";

const EMPTY_FILTERS: Filters = { nombre: "", rut: "", idTipoUsuario: null, quick: "" };

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) return err.error.error as ApiErrorBody["error"];
  return null;
}
/** For a 409 RUT_INACTIVO, the body carries the existing user's id. */
export function rutInactivoId(err: unknown): number | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code === "RUT_INACTIVO") {
    const id = Number(err.error.idUsuario);
    return Number.isInteger(id) ? id : null;
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class UsuariosStore {
  private api = inject(UsuariosApi);

  readonly usuarios = signal<UsuarioDto[]>([]);
  readonly lookups = signal<UsuarioLookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly estadoFilter = signal<EstadoFilter>("activos");
  readonly filters = signal<Filters>(EMPTY_FILTERS);
  readonly sort = signal<Sort>({ key: "nombreCompleto", asc: true });
  readonly page = signal(1);
  readonly perPage = signal(10);

  readonly filtered = computed(() => sortRows(applyFilters(this.usuarios(), this.filters()), this.sort()));
  readonly paged = computed(() => paginate(this.filtered(), this.page(), this.perPage()));
  readonly stats = computed(() => computeStats(this.usuarios(), this.filtered()));

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [usuarios, lookups] = await Promise.all([
        firstValueFrom(this.api.list(this.estadoFilter())),
        this.lookups() ? Promise.resolve(this.lookups()!) : firstValueFrom(this.api.lookups()),
      ]);
      this.usuarios.set(usuarios);
      this.lookups.set(lookups);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar los usuarios. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  async setEstado(estado: EstadoFilter): Promise<void> { this.estadoFilter.set(estado); this.page.set(1); await this.load(); }
  setFilter(patch: Partial<Filters>): void { this.filters.update((f) => ({ ...f, ...patch })); this.page.set(1); }
  clearFilters(): void { this.filters.set(EMPTY_FILTERS); this.page.set(1); }
  toggleSort(key: SortKey): void { this.sort.update((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: true })); }

  async create(input: UsuarioCreateInput): Promise<void> { await firstValueFrom(this.api.create(input)); await this.load(); }
  async update(id: number, input: UsuarioUpdateInput): Promise<void> { await firstValueFrom(this.api.update(id, input)); await this.load(); }
  async activate(id: number, input: UsuarioCreateInput): Promise<void> { await firstValueFrom(this.api.activate(id, input)); await this.load(); }
  async deactivate(id: number): Promise<void> { await firstValueFrom(this.api.deactivate(id)); await this.load(); }
  async enrollCognito(id: number): Promise<void> { await firstValueFrom(this.api.enrollCognito(id)); await this.load(); }
}
