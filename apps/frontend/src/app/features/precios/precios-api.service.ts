import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type {
  ListaPrecioDto, ListaPrecioInput, PrecioProductoRowDto, PrecioProductoInput, BulkInput,
} from "@serfel/shared";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class PreciosApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  listas() {
    return this.http.get<ListaPrecioDto[]>(`${this.base}/listas-precio`);
  }
  createLista(input: ListaPrecioInput) {
    return this.http.post<ListaPrecioDto>(`${this.base}/listas-precio`, input);
  }
  renameLista(id: number, input: ListaPrecioInput) {
    return this.http.patch<ListaPrecioDto>(`${this.base}/listas-precio/${id}`, input);
  }
  deleteLista(id: number) {
    return this.http.delete<ListaPrecioDto>(`${this.base}/listas-precio/${id}`);
  }
  grid(id: number) {
    return this.http.get<PrecioProductoRowDto[]>(`${this.base}/listas-precio/${id}/productos`);
  }
  saveProducto(id: number, idProducto: number, input: PrecioProductoInput) {
    return this.http.patch<PrecioProductoRowDto>(
      `${this.base}/listas-precio/${id}/productos/${idProducto}`, input);
  }
  bulk(id: number, input: BulkInput) {
    return this.http.post<PrecioProductoRowDto[]>(
      `${this.base}/listas-precio/${id}/productos/bulk`, input);
  }
}
