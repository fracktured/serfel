import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PedidosService } from 'src/app/services/pedidos.service';
import { PrecioService } from '../../../services/precio.service';
import { ModalProductosComponent } from '../modal-productos/modal-productos.component';
import { ModalDetalleProductoComponent } from '../modal-detalle-producto/modal-detalle-producto.component';
import { PrecioProductoModel } from '../../../models/precio-producto.model';
import { ModalOpcionesBusquedaLocalesComponent } from '../modal-opciones-busqueda-locales/modal-opciones-busqueda-locales.component';
import { LocalClienteModel } from '../../../models/local-cliente.model';
import { LocalesService } from '../../../services/locales.service';
import { ModalLocalesClienteRutaComponent } from '../modal-locales-cliente-ruta/modal-locales-cliente-ruta.component';
import { ModalBusquedaLocalesClienteComponent } from '../modal-busqueda-locales-cliente/modal-busqueda-locales-cliente.component';
import { Router } from '@angular/router';
import { ModalConfirmacionService } from '../../shared/modal-confirmacion/modal-confirmacion.service';
import { ModalMensajesService } from '../../shared/modal-mensajes/modal-mensajes.service';
import { LayoutService } from 'src/app/services/layout.service';
import { environment } from '@environments/environment';

@Component({
   selector: 'app-crear-pedido',
   templateUrl: './crear-pedido.component.html',
   styleUrls: ['./crear-pedido.component.css']
})
export class CrearPedidoComponent implements OnInit {

   idDiaRuta: any;
   local: LocalClienteModel;
   productos: PrecioProductoModel[];
   productosVenta: PrecioProductoModel[];
   totalCompra: number;
   esCoproad: boolean;
   esSerfel: boolean;

   nombreProducto: string;
   codigoProducto: number;

   constructor(
      private modalService: NgbModal,
      private pedidosService: PedidosService,
      private precioService: PrecioService,
      private localesService: LocalesService,
      private modalConfirmacionService: ModalConfirmacionService,
      private modalMensajesService: ModalMensajesService,
      private router: Router,
      private layoutService: LayoutService
   ) { }

   ngOnInit(): void {
      this.productosVenta = [];
      this.esCoproad = environment.esCoproad;
      this.esSerfel = !this.esCoproad;
      this.layoutService.setModulo('Crear Pedido');
      window.addEventListener("beforeunload", function (e) {
         var confirmationMessage = "\o/";
         e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
         return confirmationMessage;              // Gecko, WebKit, Chrome <34
      });

      const local = JSON.parse(localStorage.getItem('localPedido'));
      if (local) {
         this.mostarCliente(local);
         const productosPedido = JSON.parse(localStorage.getItem('productosPedido'));
         if (productosPedido) {
            this.productosVenta = productosPedido;
            this.obtenerTotalCompra();
         }
      } else {
         this.abrirModalInicial();
      }
   }

   abrirModalInicial() {

      const modalOpcionesBusquedaLocales = this.modalService.open(ModalOpcionesBusquedaLocalesComponent, {
         size: 'lg',
         backdrop: 'static',
         keyboard: false,
         centered: true
      });

      modalOpcionesBusquedaLocales.result.then((result) => {

         if (result === 'Locales de Ruta') {
            this.abrirModalLocalesPorRuta();
         }
         else {
            this.abrirModalBuscarLocalesPorCliente();
         }

      }, (reason) => {
         console.log('modal inicial Dismissed');
      });

   }

   abrirModalBuscarLocalesPorCliente() {

      const modalLocalesPorCliente = this.modalService.open(ModalBusquedaLocalesClienteComponent, {
         size: 'lg',
         backdrop: 'static',
         keyboard: false,
         centered: true
      });

      modalLocalesPorCliente.result.then((localSeleccionado: LocalClienteModel) => {

         if (localSeleccionado) {
            this.mostarCliente(localSeleccionado);
         }

      }, (reason) => {
         console.log('modal inicial Dismissed');
      });

   }

   abrirModalLocalesPorRuta() {

      const modalLocales = this.modalService.open(ModalLocalesClienteRutaComponent, {
         size: 'lg',
         backdrop: 'static',
         keyboard: false,
         centered: true
      });

      this.localesService.obtenerLocalesRutaPorDiaSemana().subscribe((localesPorRuta: any) => {

         // tslint:disable-next-line:prefer-const
         let localesBloquedados: LocalClienteModel[] = [];
         // tslint:disable-next-line:prefer-const
         let localesEntregados: LocalClienteModel[] = [];
         // tslint:disable-next-line:prefer-const
         let localesRuta: LocalClienteModel[] = [];

         if (localesPorRuta && localesPorRuta.length > 0) {

            localesPorRuta.forEach((localRuta: LocalClienteModel) => {

               const poseeEntregas = (localRuta.cantidadPedidos > 0 ? true : false);

               if (localRuta.bloqueado) {

                  localesBloquedados.push(localRuta);
               } else if (poseeEntregas) {

                  localesEntregados.push(localRuta);
               } else {

                  localesRuta.push(localRuta);
               }
            });
         }

         modalLocales.componentInstance.listaLocales = localesRuta;
         modalLocales.componentInstance.listaLocalesBloqueados = localesBloquedados;
         modalLocales.componentInstance.listaLocalesEntregados = localesEntregados;

         modalLocales.result.then((localSeleccionado: LocalClienteModel) => {

            if (localSeleccionado) {
               this.mostarCliente(localSeleccionado);
            }

         }, (reason) => {
            console.log('modal inicial Dismissed');
         });

      });

   }

   mostarCliente(local: LocalClienteModel) {
      localStorage.setItem('localPedido', JSON.stringify(local));
      this.local = local;

      this.precioService.preciosProductoPorLista(this.local.idListaPrecio).subscribe((response: any) => {
         localStorage.setItem('productos', JSON.stringify(response));
         console.log(JSON.parse(localStorage.getItem('productos')));
      });
   }

   limpiarNombre() {
      this.nombreProducto = '';
   }

   limpiarCodigo() {
      this.codigoProducto = undefined;
   }

   buscarProducto() {
      this.nombreProducto = this.nombreProducto.toUpperCase();
      const listaProductos: PrecioProductoModel[] = JSON.parse(localStorage.getItem('productos'));
      this.productos = listaProductos.filter(item => item.nomProducto.toUpperCase().includes(this.nombreProducto));

      if (this.productos && this.productos.length) {
         const modalProductos = this.modalService.open(ModalProductosComponent, {
            size: 'lg',
            backdrop: 'static',
            keyboard: false,
            centered: true
         });
         modalProductos.componentInstance.listaProductos = this.productos;
         modalProductos.componentInstance.filtroBusqueda = this.nombreProducto;

         modalProductos.result.then((productoSeleccionado: PrecioProductoModel) => {
            if (productoSeleccionado) {
               const prodEnVenta: PrecioProductoModel = this.productosVenta.find(x => x.codSerfel === productoSeleccionado.codSerfel);
               if (prodEnVenta) {
                  const index = this.productosVenta.findIndex(x => x.codSerfel === productoSeleccionado.codSerfel);
                  this.detalleProducto(prodEnVenta, index);
               } else {
                  this.detalleProducto(productoSeleccionado);
               }
            }
         }, (reason) => {
            //console.log('modal producto Dismissed');
         });
      }
   }

   buscarProductoPorCodigoSerfel() {
      const prodEnVenta: PrecioProductoModel = this.productosVenta.find(x => x.codSerfel === this.codigoProducto);
      if (prodEnVenta) {
         const index = this.productosVenta.findIndex(x => x.codSerfel === this.codigoProducto);
         this.detalleProducto(prodEnVenta, index);
         return;
      }

      const listaProductos: PrecioProductoModel[] = JSON.parse(localStorage.getItem('productos'));
      const productoPorCodigo: PrecioProductoModel = listaProductos.find(x => x.codSerfel === this.codigoProducto);
      if (productoPorCodigo) {
         this.detalleProducto(productoPorCodigo);
      } else {
         console.log('no se encontro producto');
         // alerta de que no se ha encontrado producto con el codigo indicado.
      }
   }

   detalleProducto(productoSeleccionado: PrecioProductoModel, index?: number) {
      const modalDetalleProducto = this.modalService.open(ModalDetalleProductoComponent, {
         size: 'lg',
         backdrop: 'static',
         keyboard: false,
         centered: true
      });
      modalDetalleProducto.componentInstance.producto = { ...productoSeleccionado };

      modalDetalleProducto.result.then((result: any) => {
         if (result !== 'Eliminar') {
            if (index === undefined) {
               this.productosVenta.push(result);
            }
            else {
               this.productosVenta[index] = result;
            }
         }
         else {
            this.productosVenta.splice(index, 1);
         }
         localStorage.setItem('productosPedido', JSON.stringify(this.productosVenta));
         this.obtenerTotalCompra();
      }, (reason) => {
         //console.log('modal detalle producto Dismissed');
      });
   }

   obtenerTotalCompra(): number {
      let totalPedido = 0;
      let totalProductos = 0;
      let totalDescuentos = 0;

      for (const producto of this.productosVenta) {
         if ( environment.esCoproad ) {
            totalPedido += (producto.cantidad * producto.precioNeto);
            totalProductos = (producto.cantidad * producto.precioNeto);
         } else {
            totalPedido += (producto.cantidad * producto.precio);
            totalProductos = (producto.cantidad * producto.precio);
         }
         
         totalDescuentos += Math.round((totalProductos * parseFloat(producto.porcenDesc.toString())) / parseFloat('100'));
      }

      this.totalCompra = (totalPedido - totalDescuentos);

      return this.totalCompra;
   }

   crearPedido() {
      this.modalConfirmacionService.confirmar('Confirmar creación', '¿ Esta seguro que desea crear el pedido ?')
         .then((confirmacion) => {

            if (confirmacion && confirmacion === true) {
               const dtoPedido = {
                  pedido: {
                     precioTotal: this.obtenerTotalCompra(),
                     idListaPrecio: this.local.idListaPrecio,
                     idFormaPago: '7',
                     idLocalCliente: this.local.idLocalCliente,
                     diaRuta: new Date().getDay()
                  },
                  productos: this.productosVenta
               };

               this.pedidosService.crearPedido(dtoPedido).subscribe(response => {
                  if (response) {
                     localStorage.removeItem('localPedido');
                     localStorage.removeItem('productosPedido');
                     this.modalMensajesService.mensaje('Pedido creado', 'El pedido ha sido creado exitosamente.');
                     this.router.navigate(['/pedidos/listar']);
                  }
               });
            }
         })
         .catch(() => console.log('dimissed'));

   }
}
