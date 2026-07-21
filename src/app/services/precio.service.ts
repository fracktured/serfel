import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PrecioService {

  constructor(private http: HttpClient) { }


  preciosProductoPorLista(idListaPrecios: number) {
    return this.http.get(`${ environment.apiUrlSerfelWeb }/PrecioProductoREST/list/idListaPrecio/${ idListaPrecios }`)
      .pipe( map( (response: any) => {
        return response.productos;
      }));
  }
}
