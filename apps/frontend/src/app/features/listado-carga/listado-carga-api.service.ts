import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { CargoTipo, RutaDto, RutaSelection } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ListadoCargaApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list() {
    return this.http.get<RutaDto[]>(`${this.base}/routes`);
  }
  cargoList(sel: RutaSelection, tipo: CargoTipo) {
    return this.http.post(`${this.base}/routes/cargoList`, { tipo, rutas: sel }, {
      responseType: "blob",
    });
  }
}
