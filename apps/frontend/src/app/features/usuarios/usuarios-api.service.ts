import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter, UsuarioCreateInput, UsuarioDto, UsuarioLookupsDto, UsuarioUpdateInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class UsuariosApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<UsuarioDto[]>(`${this.base}/usuarios`, { params: { estado } });
  }
  lookups() {
    return this.http.get<UsuarioLookupsDto>(`${this.base}/usuarios/lookups`);
  }
  create(input: UsuarioCreateInput) {
    return this.http.post<UsuarioDto>(`${this.base}/usuarios`, input);
  }
  update(id: number, input: UsuarioUpdateInput) {
    return this.http.put<UsuarioDto>(`${this.base}/usuarios/${id}`, input);
  }
  activate(id: number, input: UsuarioCreateInput) {
    return this.http.post<UsuarioDto>(`${this.base}/usuarios/${id}/activate`, input);
  }
  deactivate(id: number) {
    return this.http.post<UsuarioDto>(`${this.base}/usuarios/${id}/deactivate`, {});
  }
  enrollCognito(id: number) {
    return this.http.post<{ ok: true }>(`${this.base}/usuarios/${id}/cognito`, {});
  }
}
