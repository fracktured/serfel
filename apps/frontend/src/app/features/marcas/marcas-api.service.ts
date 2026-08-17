import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { EstadoFilter, MarcaDto, MarcaInput } from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class MarcasApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<MarcaDto[]>(`${this.base}/marcas`, { params: { estado } });
  }
  create(input: MarcaInput) {
    return this.http.post<MarcaDto>(`${this.base}/marcas`, input);
  }
  update(id: number, input: MarcaInput) {
    return this.http.put<MarcaDto>(`${this.base}/marcas/${id}`, input);
  }
  deactivate(id: number) {
    return this.http.delete<MarcaDto>(`${this.base}/marcas/${id}`);
  }
  restore(id: number) {
    return this.http.post<MarcaDto>(`${this.base}/marcas/${id}/restore`, {});
  }
}
