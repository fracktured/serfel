import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { PrefacturaModel } from '@app/models/venta.model';

@Injectable({
  providedIn: 'root'
})
export class VentaService {

  constructor(private http: HttpClient) { }

  prefacturar(prefactura: PrefacturaModel): Observable<any> {
    return this.http.post(`${ environment.apiVentas }/preinvoice`, prefactura);
  }

}
