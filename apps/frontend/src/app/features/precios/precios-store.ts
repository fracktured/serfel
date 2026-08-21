import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import type {
  ApiErrorBody, ListaPrecioDto, ListaPrecioInput,
  PrecioProductoRowDto, PrecioProductoInput, BulkInput,
} from "@serfel/shared";
import { PreciosApi } from "./precios-api.service";
import { matchesAllTokens } from "../../shared/text-search";

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class PreciosStore {
  private api = inject(PreciosApi);

  readonly listas = signal<ListaPrecioDto[]>([]);
  readonly selectedListaId = signal<number | null>(null);
  readonly rows = signal<PrecioProductoRowDto[]>([]);
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly filter = signal("");
  readonly selectedIds = signal<Set<number>>(new Set());

  readonly selectedLista = computed(() =>
    this.listas().find((l) => l.idListaPrecio === this.selectedListaId()) ?? null);

  readonly filteredRows = computed(() => {
    const q = this.filter().trim();
    if (!q) return this.rows();
    return this.rows().filter((r) =>
      matchesAllTokens(`${r.codSerfel} ${r.nomProducto}`, q));
  });

  async loadListas(): Promise<void> {
    this.errorMsg.set(null);
    try {
      const listas = await firstValueFrom(this.api.listas());
      this.listas.set(listas);
      if (this.selectedListaId() === null && listas.length > 0) {
        await this.selectLista(listas[0].idListaPrecio);
      }
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudieron cargar las listas de precio.");
    }
  }

  async selectLista(id: number): Promise<void> {
    this.selectedListaId.set(id);
    this.clearSelection();
    await this.loadGrid();
  }

  async loadGrid(): Promise<void> {
    const id = this.selectedListaId();
    if (id === null) { this.rows.set([]); return; }
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      this.rows.set(await firstValueFrom(this.api.grid(id)));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar la lista de productos.");
    } finally {
      this.loading.set(false);
    }
  }

  async createLista(input: ListaPrecioInput): Promise<ListaPrecioDto> {
    const created = await firstValueFrom(this.api.createLista(input));
    await this.loadListas();
    await this.selectLista(created.idListaPrecio);
    return created;
  }
  async renameLista(id: number, input: ListaPrecioInput): Promise<void> {
    await firstValueFrom(this.api.renameLista(id, input));
    await this.loadListas();
  }
  async deleteLista(id: number): Promise<void> {
    await firstValueFrom(this.api.deleteLista(id));
    this.selectedListaId.set(null);
    await this.loadListas();
  }

  async saveProducto(idProducto: number, input: PrecioProductoInput): Promise<void> {
    const id = this.selectedListaId();
    if (id === null) return;
    const updated = await firstValueFrom(this.api.saveProducto(id, idProducto, input));
    this.rows.update((rs) => rs.map((r) => (r.idProducto === idProducto ? updated : r)));
  }

  async applyBulk(input: BulkInput): Promise<void> {
    const id = this.selectedListaId();
    if (id === null) return;
    const affected = await firstValueFrom(this.api.bulk(id, input));
    const byId = new Map(affected.map((r) => [r.idProducto, r]));
    this.rows.update((rs) => rs.map((r) => byId.get(r.idProducto) ?? r));
    this.clearSelection();
  }

  toggleRow(idProducto: number): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      next.has(idProducto) ? next.delete(idProducto) : next.add(idProducto);
      return next;
    });
  }
  selectAll(): void {
    this.selectedIds.set(new Set(this.filteredRows().map((r) => r.idProducto)));
  }
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }
  setFilter(q: string): void { this.filter.set(q); }
}
