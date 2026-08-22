import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { VentaCreditableDto, NotaCreditoListItemDto, EmitirNcInput, EmitirNcResultDto } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class NotasCreditoApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/notas-credito`;

  buscarVentas(q: string) {
    return this.http.get<VentaCreditableDto[]>(`${this.base}/ventas`, { params: { q } });
  }
  list() {
    return this.http.get<NotaCreditoListItemDto[]>(this.base);
  }
  emitir(input: EmitirNcInput) {
    return this.http.post<EmitirNcResultDto>(this.base, input);
  }
  pdfLinks(id: number) {
    return this.http.get<{ urlPdfOriginal: string; urlPdfCedible: string }>(`${this.base}/${id}/pdf`);
  }
}
