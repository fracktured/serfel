import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter,
  LookupsDto,
  ProductoDto,
  ProductoInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ProductosApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  list(estado: EstadoFilter) {
    return this.http.get<ProductoDto[]>(`${this.base}/products`, {
      params: { estado },
    });
  }
  lookups() {
    return this.http.get<LookupsDto>(`${this.base}/lookups`);
  }
  create(input: ProductoInput) {
    return this.http.post<ProductoDto>(`${this.base}/products`, input);
  }
  update(id: number, input: ProductoInput) {
    return this.http.put<ProductoDto>(`${this.base}/products/${id}`, input);
  }
  deactivate(id: number) {
    return this.http.delete<ProductoDto>(`${this.base}/products/${id}`);
  }
  restore(id: number) {
    return this.http.post<ProductoDto>(`${this.base}/products/${id}/restore`, {});
  }
}
