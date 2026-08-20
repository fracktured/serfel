import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  EstadoFilter,
  LookupsDto,
  ProductoDetalleDto,
  ProductoDto,
  ProductoInput,
  PorcionDto,
  PorcionesListDto,
  PorcionInput,
  PorcionesQuery,
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
  detalle(id: number) {
    return this.http.get<ProductoDetalleDto>(`${this.base}/products/${id}/detalle`);
  }
  setStock(id: number, cantidad: number) {
    return this.http.put<ProductoDetalleDto>(`${this.base}/products/${id}/stock`, { cantidad });
  }
  listPorciones(idProducto: number, query: PorcionesQuery) {
    const params: Record<string, string> = {};
    if (query.numero !== undefined) params["numero"] = String(query.numero);
    if (query.factura !== undefined) params["factura"] = String(query.factura);
    if (query.disponibilidad) params["disponibilidad"] = query.disponibilidad;
    return this.http.get<PorcionesListDto>(
      `${this.base}/products/${idProducto}/porciones`, { params });
  }
  createPorcion(idProducto: number, input: PorcionInput) {
    return this.http.post<PorcionDto>(`${this.base}/products/${idProducto}/porciones`, input);
  }
  deletePorcion(idPorcion: number) {
    return this.http.delete<{ ok: true }>(`${this.base}/porciones/${idPorcion}`);
  }
}
