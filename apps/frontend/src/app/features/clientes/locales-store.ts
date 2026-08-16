import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, EstadoFilter, LocalCreateInput, LocalDto, LocalLookupsDto, LocalUpdateInput,
} from "@serfel/shared";
import { LocalesApi } from "./locales-api.service";

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) return err.error.error as ApiErrorBody["error"];
  return null;
}

@Injectable({ providedIn: "root" })
export class LocalesStore {
  private api = inject(LocalesApi);

  readonly locales = signal<LocalDto[]>([]);
  readonly lookups = signal<LocalLookupsDto | null>(null);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly showInactive = signal(false);
  private rut = signal<number | null>(null);

  readonly visible = computed(() =>
    this.showInactive() ? this.locales() : this.locales().filter((l) => l.idEstado === 1));

  private estado(): EstadoFilter { return this.showInactive() ? "todos" : "activos"; }

  async loadFor(rut: number): Promise<void> {
    this.rut.set(rut);
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const [locales, lookups] = await Promise.all([
        firstValueFrom(this.api.list(rut, this.estado())),
        this.lookups() ? Promise.resolve(this.lookups()!) : firstValueFrom(this.api.lookups()),
      ]);
      this.locales.set(locales);
      this.lookups.set(lookups);
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudieron cargar los locales.");
    } finally {
      this.loading.set(false);
    }
  }

  async toggleInactive(): Promise<void> {
    this.showInactive.update((v) => !v);
    const rut = this.rut();
    if (rut !== null) await this.loadFor(rut);
  }

  private async reload(): Promise<void> { const r = this.rut(); if (r !== null) await this.loadFor(r); }

  async create(input: Omit<LocalCreateInput, "rutCliente">): Promise<void> {
    const rut = this.rut(); if (rut === null) return;
    await firstValueFrom(this.api.create(rut, input)); await this.reload();
  }
  async update(id: number, input: LocalUpdateInput): Promise<void> {
    await firstValueFrom(this.api.update(id, input)); await this.reload();
  }
  async deactivate(id: number): Promise<void> {
    await firstValueFrom(this.api.deactivate(id)); await this.reload();
  }
  async activate(id: number, input: LocalUpdateInput): Promise<void> {
    await firstValueFrom(this.api.activate(id, input)); await this.reload();
  }

  reset(): void { this.locales.set([]); this.rut.set(null); this.showInactive.set(false); this.errorMsg.set(null); }
}
