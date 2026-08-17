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

  search(params: { estado: EstadoFilter; rut: string; razonSocial: string; direccion: string }) {
    const p: Record<string, string> = { estado: params.estado };
    if (params.rut.trim()) p["rut"] = params.rut.trim();
    if (params.razonSocial.trim()) p["razonSocial"] = params.razonSocial.trim();
    if (params.direccion.trim()) p["direccion"] = params.direccion.trim();
    return this.http.get<ClienteDto[]>(`${this.base}/clientes`, { params: p });
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
