import { computed, inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import {
  COD_REF_ANULA,
  COD_REF_CORRIGE_MONTOS,
  type ApiErrorBody,
  type EmitirNcResultDto,
  type NcLineaInput,
  type NotaCreditoListItemDto,
  type VentaCreditableDto,
} from "@serfel/shared";
import { NotasCreditoApi } from "./notas-credito-api.service";
import { anularLineas, previewTotal } from "./notas-credito-logic";

/** Approximate IVA rate for the client-side live preview. The server resolves
 * the real rate from 99_p_impuesto at emit time; this only informs the UI. */
const IVA_PREVIEW = 19;

export function apiError(err: unknown): ApiErrorBody["error"] | null {
  if (err instanceof HttpErrorResponse && err.error?.error?.code) {
    return err.error.error as ApiErrorBody["error"];
  }
  return null;
}

@Injectable({ providedIn: "root" })
export class NotasCreditoStore {
  private api = inject(NotasCreditoApi);

  readonly query = signal("");
  readonly resultados = signal<VentaCreditableDto[]>([]);
  readonly buscando = signal(false);

  readonly ventaSeleccionada = signal<VentaCreditableDto | null>(null);
  readonly lineas = signal<NcLineaInput[]>([]);
  readonly codRef = signal<number>(COD_REF_CORRIGE_MONTOS);
  readonly idMotivo = signal<number>(1);

  readonly notas = signal<NotaCreditoListItemDto[]>([]);
  readonly loadingNotas = signal(false);

  readonly emitiendo = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly ultimoResultado = signal<EmitirNcResultDto | null>(null);

  readonly yaAcreditada = computed(() => {
    const v = this.ventaSeleccionada();
    return v ? v.montoYaCreditado >= v.precioTotal : false;
  });

  readonly total = computed(() => {
    const v = this.ventaSeleccionada();
    if (!v) return 0;
    return previewTotal(this.lineas(), v, IVA_PREVIEW);
  });

  async buscar(): Promise<void> {
    const q = this.query().trim();
    this.buscando.set(true);
    this.errorMsg.set(null);
    try {
      this.resultados.set(await firstValueFrom(this.api.buscarVentas(q)));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo buscar la venta. Revisa tu conexión.");
    } finally {
      this.buscando.set(false);
    }
  }

  seleccionar(venta: VentaCreditableDto): void {
    this.ventaSeleccionada.set(venta);
    this.codRef.set(COD_REF_CORRIGE_MONTOS);
    this.lineas.set(venta.lineas.map((l) => ({
      idProducto: l.idProducto,
      cantidad: l.cantidad,
      precio: l.precio,
      porcenDesc: l.porcenDesc,
      restituirStock: false,
    })));
    this.ultimoResultado.set(null);
    this.errorMsg.set(null);
  }

  limpiarSeleccion(): void {
    this.ventaSeleccionada.set(null);
    this.lineas.set([]);
    this.ultimoResultado.set(null);
  }

  actualizarLinea(idProducto: number, patch: Partial<NcLineaInput>): void {
    this.lineas.update((ls) => ls.map((l) => (l.idProducto === idProducto ? { ...l, ...patch } : l)));
  }

  anularCompleta(): void {
    const v = this.ventaSeleccionada();
    if (!v) return;
    this.codRef.set(COD_REF_ANULA);
    this.lineas.set(anularLineas(v));
  }

  setIdMotivo(id: number): void {
    this.idMotivo.set(id);
  }

  async emitir(): Promise<void> {
    const v = this.ventaSeleccionada();
    if (!v || this.yaAcreditada()) return;
    this.emitiendo.set(true);
    this.errorMsg.set(null);
    try {
      const result = await firstValueFrom(this.api.emitir({
        idVenta: v.idVenta,
        idMotivo: this.idMotivo(),
        codRef: this.codRef() as typeof COD_REF_ANULA | typeof COD_REF_CORRIGE_MONTOS,
        lineas: this.lineas(),
      }));
      this.ultimoResultado.set(result);
      this.limpiarSeleccion();
      await this.cargarListado();
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo emitir la nota de crédito.");
    } finally {
      this.emitiendo.set(false);
    }
  }

  async cargarListado(): Promise<void> {
    this.loadingNotas.set(true);
    try {
      this.notas.set(await firstValueFrom(this.api.list()));
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo cargar el listado de notas de crédito.");
    } finally {
      this.loadingNotas.set(false);
    }
  }

  async abrirPdf(id: number, tipo: "original" | "cedible"): Promise<void> {
    try {
      const links = await firstValueFrom(this.api.pdfLinks(id));
      const url = tipo === "original" ? links.urlPdfOriginal : links.urlPdfCedible;
      window.open(url, "_blank");
    } catch (err) {
      this.errorMsg.set(apiError(err)?.message ?? "No se pudo obtener el PDF.");
    }
  }
}
