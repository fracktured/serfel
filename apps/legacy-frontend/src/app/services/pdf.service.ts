import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { RutaModel } from "@app/models/ruta.model";
import { environment } from "@environments/environment";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(private http: HttpClient) { }

  listadoCarga(rutas: RutaModel[]): Observable<any> {
    return this.http.post(`${ environment.apiRutas }/cargoList`, rutas, {responseType: 'arraybuffer'});
  }

}