import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter, LocalCreateInput, LocalDto, LocalLookupsDto, LocalUpdateInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class LocalesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(rut: number, estado: EstadoFilter) {
    return this.http.get<LocalDto[]>(`${this.base}/clientes/${rut}/locales`, { params: { estado } });
  }
  lookups() {
    return this.http.get<LocalLookupsDto>(`${this.base}/locales/lookups`);
  }
  create(rut: number, input: Omit<LocalCreateInput, "rutCliente">) {
    return this.http.post<LocalDto>(`${this.base}/clientes/${rut}/locales`, input);
  }
  update(id: number, input: LocalUpdateInput) {
    return this.http.put<LocalDto>(`${this.base}/locales/${id}`, input);
  }
  deactivate(id: number) {
    return this.http.delete<LocalDto>(`${this.base}/locales/${id}`);
  }
  activate(id: number, input: LocalUpdateInput) {
    return this.http.post<LocalDto>(`${this.base}/locales/${id}/activate`, input);
  }
}
