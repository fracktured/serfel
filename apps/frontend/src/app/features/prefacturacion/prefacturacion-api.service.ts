import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { EmpresaDto, PedidoPendienteDto, PrefacturaBatchInput, PrefacturaBatchResult } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class PrefacturacionApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/prefacturacion`;

  pendientes() {
    return this.http.get<PedidoPendienteDto[]>(`${this.base}/pendientes`);
  }
  empresas() {
    return this.http.get<EmpresaDto[]>(`${this.base}/empresas`);
  }
  prefacturar(input: PrefacturaBatchInput) {
    return this.http.post<PrefacturaBatchResult>(this.base, input);
  }
}
