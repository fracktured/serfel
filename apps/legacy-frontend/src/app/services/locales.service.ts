import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocalesService {

  constructor(private http: HttpClient) { }


  obtenerLocalesRutaPorDiaSemana() {
    const diaSemana = new Date().getDay();
    return this.http.get(`${ environment.apiUrlSerfelWeb }/RutaREST/routeByDay/iDiaDeLaSemana/${ diaSemana }`)
      .pipe( map ((response: any) => {
        return response.locales;
      }));
  }

  obtenerLocalesPorRutCliente(rutCliente: string) {
    return this.http.get(`${ environment.apiUrlSerfelWeb }/LocalClienteREST/findByRut/rut/${ rutCliente }`)
      .pipe( map( (response: any) => {
          return response.locales;
      }));
  }

  obtenerLocalesPorNombreCliente(nombreCliente: string) {
    return this.http.get(`${ environment.apiUrlSerfelWeb }/LocalClienteREST/findByName/nombre/${ nombreCliente }`)
      .pipe( map( (response: any) => {
          return response.locales;
      }));
  }
}
