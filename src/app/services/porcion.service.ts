import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { PorcionCreateModel, PorcionModel, PorcionUpdateModel } from '../models/porcion.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PorcionService {

  constructor(private http: HttpClient) { }

  buscarTodas(idProducto: number): Observable<any> {
    return this.http.get(`${ environment.apiProductos }/${ idProducto }/portions`);
  }

  crear(idProducto: number, porcion: PorcionCreateModel): Observable<any> {
    return this.http.post(`${ environment.apiProductos }/${ idProducto }/portions`, porcion);
  }

  modificar(idProducto: number, porcion: PorcionUpdateModel): Observable<any> {
    return this.http.put(`${ environment.apiProductos }/${ idProducto }/portions`, porcion);
  }

  eliminar(idProducto: number, idPorcion: number): Observable<any> {
    return this.http.delete(`${ environment.apiProductos }/${ idProducto }/portions/${ idPorcion }`);
  }

  buscarXNumero(idProducto: number, numero: number): Observable<any> {
    return this.http.get(`${ environment.apiProductos }/${ idProducto }/portions/findByNumero/${ numero }`);
  }

  buscarXFactura(idProducto: number, factura: number): Observable<any> {
    return this.http.get(`${ environment.apiProductos }/${ idProducto }/portions/findByFactura/${ factura }`);
  }

  buscarXEstado(idProducto: number, idEstado: number): Observable<any> {
    return this.http.get(`${ environment.apiProductos }/${ idProducto }/portions/findByEstado/${ idEstado }`);
  }
}
