import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  constructor(private http: HttpClient) { }

  buscarXNombre(name: string): any {
    return this.http.get(`${ environment.apiProductos }/findByName/${ name }`);
  }

  buscarXCodigo(codSerfel: number): any {
    return this.http.get(`${ environment.apiProductos }/findByCodSerfel/${ codSerfel }`);
  }

  switchPorciones(idProducto: number, data: any): Observable<any> {
    return this.http.put(`${ environment.apiProductos }/switchPortions/${ idProducto }`, data);
  }
}
