import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter, ClienteCreateInput, ClienteDto, ClienteLookupsDto, ClienteUpdateInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ClientesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<ClienteDto[]>(`${this.base}/clientes`, { params: { estado } });
  }
  lookups() {
    return this.http.get<ClienteLookupsDto>(`${this.base}/clientes/lookups`);
  }
  create(input: ClienteCreateInput) {
    return this.http.post<ClienteDto>(`${this.base}/clientes`, input);
  }
  update(rut: number, input: ClienteUpdateInput) {
    return this.http.put<ClienteDto>(`${this.base}/clientes/${rut}`, input);
  }
  activate(rut: number, input: ClienteUpdateInput) {
    return this.http.post<ClienteDto>(`${this.base}/clientes/${rut}/activate`, input);
  }
  deactivate(rut: number) {
    return this.http.post<ClienteDto>(`${this.base}/clientes/${rut}/deactivate`, {});
  }
}
