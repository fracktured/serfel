import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type { ApiErrorBody, CargoTipo, RutaDto } from "@serfel/shared";
import { ListadoCargaApi } from "./listado-carga-api.service";
import { allSelected, selectedRutas, toggleSelection } from "./listado-carga-logic";
import { matchesAllTokens } from "../../shared/text-search";

/** Extracts the structured API error body, or null for network/unknown errors. */
export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class ListadoCargaStore {
  private api = inject(ListadoCargaApi);

  readonly rutas = signal<RutaDto[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  readonly generating = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly tipo = signal<CargoTipo>("ventas");
  readonly nameFilter = signal("");

  readonly filteredRutas = computed(() => {
    const q = this.nameFilter().trim();
    if (!q) return this.rutas();
    return this.rutas().filter((r) => matchesAllTokens(r.nomRuta, q));
  });
  readonly allChecked = computed(() => allSelected(this.filteredRutas(), this.selected()));
  readonly hasSelection = computed(() => this.selected().size > 0);

  async load(): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.rutas.set(await firstValueFrom(this.api.list()));
    } catch (err) {
      const known = apiError(err);
      this.errorMsg.set(known?.message ?? "No se pudieron cargar las rutas. Revisa tu conexión.");
    } finally {
      this.loading.set(false);
    }
  }

  toggle(id: number): void {
    this.selected.set(toggleSelection(this.selected(), id));
  }

  toggleAll(): void {
    this.selected.set(
      this.allChecked() ? new Set() : new Set(this.filteredRutas().map((r) => r.idRuta))
    );
  }

  clear(): void {
    this.selected.set(new Set());
  }

  async generatePdf(): Promise<Blob> {
    this.generating.set(true);
    try {
      return await firstValueFrom(
        this.api.cargoList(selectedRutas(this.rutas(), this.selected()), this.tipo())
      );
    } finally {
      this.generating.set(false);
    }
  }
}
