import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteModel } from '@app/models/cliente.model';
import { PedidoModel } from '@app/models/pedido.model';
import { ContactFullName } from '@app/pipes/full-nom-contacto.pipe';
import { LayoutService } from '@app/services/layout.service';
import { PedidosService } from '@app/services/pedidos.service';
import { VentaService } from '@app/services/venta.service';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
   selector: 'app-prefacturacion',
   templateUrl: './prefacturacion.component.html',
   styleUrls: ['./prefacturacion.component.css']
})
export class PrefacturacionComponent implements OnInit {
   error = false;
   mensajeError = '';
   pedidos: PedidoModel[];
   cantSeleccionados = 0;
   cantPrefacturados = 0;
   cantErrores = 0;
   spinnerBuscar: boolean;
   allSelected = false;
   erroresDetalle: string[] = [];
   exitosDetalle: string[] = [];

   // Ordenamiento
   columnaOrden: string = '';
   direccionOrden: 'asc' | 'desc' = 'asc';

   // Configuración para el dropdown de empresas
   empresas = [
      { id: 8030856, text: '8030856-6' },
      { id: 8367020, text: '8367020-7' },
      { id: 17356270, text: '17356270-5' }
   ];
   empresaSeleccionada = [];
   dropdownSettings: IDropdownSettings = {};

   constructor(
      private layoutService: LayoutService,
      private pedidoService: PedidosService,
      private ventaService: VentaService,
      private router: Router
   ) { }

   ngOnInit(): void {
      this.layoutService.setModulo('Prefacturación');

      this.dropdownSettings = {
         singleSelection: true,
         idField: 'id',
         textField: 'text',
         selectAllText: 'Seleccionar todos',
         unSelectAllText: 'Deseleccionar todos',
         itemsShowLimit: 1,
         allowSearchFilter: false
      };

      this.buscarPedidos();
   }

   buscarPedidos() {
      this.spinnerBuscar = true;
      this.pedidoService.buscarTodas(0)
         .pipe(catchError(err => {
            this.error = true;
            this.mensajeError = err.mensaje;
            this.spinnerBuscar = false;
            return of([]);
         }))
         .subscribe(response => {
            this.error = false;
            this.pedidos = response;
            this.spinnerBuscar = false;
         });
   }

   seleccionar() {
      this.cantSeleccionados = this.pedidos.filter(p => p.seleccionado).length;
      this.allSelected = this.pedidos.length > 0 && this.pedidos.every(p => p.seleccionado);
   }

   toggleSelectAll() {
      this.allSelected = !this.allSelected;
      this.pedidos.forEach(pedido => {
         pedido.seleccionado = this.allSelected;
      });
      this.seleccionar();
   }

   prefacturarSeleccionados() {
      if (this.empresaSeleccionada.length === 0) {
         this.error = true;
         this.mensajeError = 'Debe seleccionar una empresa';
         return;
      }

      this.spinnerBuscar = true;
      this.cantPrefacturados = 0;
      this.cantErrores = 0;
      this.error = false;
      this.mensajeError = '';
      this.erroresDetalle = [];
      this.exitosDetalle = [];
      
      const pedidosSeleccionados = this.pedidos.filter(p => p.seleccionado);
      
      if (pedidosSeleccionados.length === 0) {
         this.spinnerBuscar = false;
         return;
      }

      let procesados = 0;
      
      pedidosSeleccionados.forEach(pedido => {
         const prefactura = {
            rutEmpresa: this.empresaSeleccionada[0].id,
            idPedido: pedido.idPedido
         };

         this.ventaService.prefacturar(prefactura)
            .pipe(catchError(err => {
               this.cantErrores++;
               this.handleError(err);
               return of(null);
            }))
            .subscribe(response => {
               if (response) {
                  this.cantPrefacturados++;

                  // si hay mensajes se agregan a detalle del proceso
                  if (response.messages && response.messages.length > 0) {
                     this.exitosDetalle.push(`Venta [${response.venta.idVenta}] ${response.messages}`);
                  }
               }
               procesados++;
               
               if (procesados === pedidosSeleccionados.length) {
                  this.buscarPedidos();
                  // Deseleccionar todos los pedidos procesados
                  // pedidosSeleccionados.forEach(p => p.seleccionado = false);
                  // this.seleccionar();
               }
            });
      });
   }

   handleError(err: any) {
      let mensaje = '';
      if (err && err.error && err.error.message) {
         mensaje = err.error.message;
      } else if (err && err.message) {
         mensaje = err.message;
      } else {
         mensaje = 'Error desconocido';
      }
      this.erroresDetalle.push(mensaje);
   }

   ordenarPor(columna: string, mantenerDireccion: boolean = false) {
      if (!columna) return;
      if (!mantenerDireccion) {
         if (this.columnaOrden === columna) {
            this.direccionOrden = this.direccionOrden === 'asc' ? 'desc' : 'asc';
         } else {
            this.columnaOrden = columna;
            this.direccionOrden = 'asc';
         }
      }
      this.pedidos.sort((a, b) => {
         let valA = this.obtenerValorColumna(a, columna);
         let valB = this.obtenerValorColumna(b, columna);
         if (valA == null) valA = '';
         if (valB == null) valB = '';
         if (typeof valA === 'string') valA = valA.toLowerCase();
         if (typeof valB === 'string') valB = valB.toLowerCase();
         if (valA < valB) return this.direccionOrden === 'asc' ? -1 : 1;
         if (valA > valB) return this.direccionOrden === 'asc' ? 1 : -1;
         return 0;
      });
   }

   obtenerValorColumna(pedido: any, columna: string) {
      const contactoPipe = new ContactFullName();
      switch (columna) {
         case 'idPedido': return pedido.idPedido;
         case 'fecha': return pedido.fecha;
         case 'rut': return pedido.local.cliente.rutCliente;
         case 'nomFantasia': return pedido.local.cliente.nomFantasia;
         case 'nomLocal': return pedido.local.nomLocal;
         case 'contacto': return pedido.local ? contactoPipe.transform(pedido.local) : '';
         case 'vendedor': return pedido.vendedor ? pedido.vendedor.nombre : '';
         case 'precioTotal': return pedido.precioTotal;
         default: return '';
      }
   }

}
