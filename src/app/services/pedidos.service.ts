import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
   providedIn: 'root'
})
export class PedidosService {

   constructor(private http: HttpClient) { }


   crearPedido(pedido) {
      return this.http.post(`${environment.apiUrlSerfelWeb}/PedidoREST/create`, pedido);
   }

   modificarPedido(pedido) {
      return this.http.post(`${environment.apiUrlSerfelWeb}/PedidoREST/modify`, pedido);
   }

   eliminarPedido(pedido) {
      return this.http.post(`${environment.apiUrlSerfelWeb}/PedidoREST/elimPedido`, pedido);
   }

   obtenerPedidoPorId(idPedido) {
      return this.http.get(`${environment.apiUrlSerfelWeb}/PedidoREST/order/idPedido/${idPedido}`)
         .pipe(map((response: any) => {
            return response;
         }));
   }

   obtenerPedidosDelDia() {
      return this.http.get(`${environment.apiUrlSerfelWeb}/PedidoREST/listPedidosDelDia`)
         .pipe(map((response: any) => {

            // tslint:disable-next-line:prefer-const
            let listaPedidos: any = [];

            if (response.bExito && response.listPedido.length > 0) {

               response.listPedido.forEach(pedido => {

                  pedido.oPedido.razon_social = pedido.oCliente.razon_social;
                  pedido.oPedido.nom_local_cliente = pedido.oLocalCliente.nom_local_cliente;

                  listaPedidos.push(pedido.oPedido);
               });
            }
            return listaPedidos;
         }));
   }

   buscarTodas(idVendedor: number): Observable<any> {
      return this.http.get(`${ environment.apiPedidos }`); ///idVendedor/${ idVendedor }
   }

   /*
   return await this.http.get(`${ environment.apiPedidos }`)///idVendedor/${ idVendedor }   
         .pipe(catchError(err => {
            return [null, err];
         }))
         .subscribe(response => {
            console.log("respondio");
            return [response, null];
         });*/
}
