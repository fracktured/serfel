import { Component, OnInit, Input } from '@angular/core';
import { PrecioProductoModel } from '@app/models/precio-producto.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalProductosComponent } from '../modal-productos/modal-productos.component';
import { ModalDetalleProductoComponent } from '../modal-detalle-producto/modal-detalle-producto.component';
import { PedidosService } from 'src/app/services/pedidos.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalConfirmacionService } from '../../shared/modal-confirmacion/modal-confirmacion.service';
import { ModalMensajesService } from '../../shared/modal-mensajes/modal-mensajes.service';
import { PrecioService } from 'src/app/services/precio.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-modificar-pedido',
  templateUrl: './modificar-pedido.component.html',
  styleUrls: ['./modificar-pedido.component.css']
})
export class ModificarPedidoComponent implements OnInit {
  esCoproad: boolean;
  esSerfel: boolean;

  idPedido: number;
  pedido: any;
  local: any;
  precios: any;
  productos: PrecioProductoModel[];
  productosVenta: PrecioProductoModel[];
  totalCompra: number;

  nombreProducto: string;
  codigoProducto: number;

  constructor(
    private modalService: NgbModal,
    private pedidosService: PedidosService,
    private precioService: PrecioService,
    private modalConfirmacionService: ModalConfirmacionService,
    private activatedRoute: ActivatedRoute,
    private modalMensajesService: ModalMensajesService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.esCoproad = environment.esCoproad;
    this.esSerfel = !this.esCoproad;
    
    this.activatedRoute.params.subscribe( (params: any) => {
      this.idPedido = params.idPedido;
    });

    this.pedidosService.obtenerPedidoPorId( this.idPedido ).subscribe(response => {
      if ( response.exito ) {
        this.local = response.local;
        this.productosVenta = response.productos;
        this.pedido = response.pedido;
        this.totalCompra = response.pedido.precioTotal;

        this.precioService.preciosProductoPorLista(this.local.idListaPrecio).subscribe((response2: any) => {
          localStorage.setItem('productos', JSON.stringify(response2));
          this.precios = response2;
          
          /*this.productosVenta = [];
          for ( const producto of response.productos ) {
            this.productosVenta.push( this.precios.find( x => x.idProducto === producto.idProducto ) );
          }*/
        });
      }
    });
  }

  //mostarCliente() {

    //const parametro = {
      // tslint:disable-next-line:object-literal-shorthand
      //idPedido: idPedido
    //};

    //const config = {
    //  params: parametro
    //};

    //this.pedidosService.obtenerPedidoPorId(config).subscribe((response) => {
    //  this.productosVenta = response.listRegListProductoPedido;

    /*  this.pedidosService.obtenerProductosPorIdListaPrecios(this.local.idListaPrecio).subscribe((response2: any) => {
        localStorage.setItem('productos', JSON.stringify(response2));
      });*/
    //});
  //}

  limpiarNombre() {
    this.nombreProducto = '';
  }

  limpiarCodigo() {
    this.codigoProducto = undefined;
  }

  buscarProducto() {
    this.nombreProducto = this.nombreProducto.toUpperCase();
    const listaProductos: PrecioProductoModel[] = JSON.parse(localStorage.getItem('productos'));
    this.productos = listaProductos.filter(item => item.nomProducto.toUpperCase().includes( this.nombreProducto ));

    if ( this.productos && this.productos.length ) {
      const modalProductos = this.modalService.open(ModalProductosComponent, {
        size: 'lg',
        backdrop: 'static',
        keyboard: false,
        centered: true
      });
      modalProductos.componentInstance.listaProductos = this.productos;
      modalProductos.componentInstance.filtroBusqueda = this.nombreProducto;

      modalProductos.result.then((productoSeleccionado: PrecioProductoModel) => {
        if ( productoSeleccionado ) {
          const prodEnVenta: PrecioProductoModel = this.productosVenta.find(x => x.codSerfel === productoSeleccionado.codSerfel );
          if ( prodEnVenta ) {
            const index = this.productosVenta.findIndex( x => x.codSerfel === productoSeleccionado.codSerfel );
            this.detalleProducto( prodEnVenta, index );
          } else {
            this.detalleProducto( productoSeleccionado );
          }
        }
      }, (reason) => {
        //console.log('modal producto Dismissed');
      });
    }
  }

  buscarProductoPorCodigoSerfel() {
    const prodEnVenta: PrecioProductoModel = this.productosVenta.find(x => x.codSerfel === this.codigoProducto );
    if ( prodEnVenta ) {
      const index = this.productosVenta.findIndex( x => x.codSerfel === this.codigoProducto );
      this.detalleProducto( prodEnVenta, index );
      return;
    }

    const listaProductos: PrecioProductoModel[] = JSON.parse(localStorage.getItem('productos'));
    const productoPorCodigo: PrecioProductoModel = listaProductos.find(x => x.codSerfel === this.codigoProducto );
    if ( productoPorCodigo ){
      this.detalleProducto( productoPorCodigo );
    } else {
      console.log('no se encontro producto');
      // alerta de que no se ha encontrado producto con el codigo indicado.
    }
  }

  detalleProducto( productoSeleccionado: PrecioProductoModel, index?: number ) {
    const modalDetalleProducto = this.modalService.open(ModalDetalleProductoComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });
    modalDetalleProducto.componentInstance.producto = {...productoSeleccionado};

    modalDetalleProducto.result.then((result: any) => {
      if (result !== 'Eliminar'){
        if (index === undefined){
          this.productosVenta.push(result);
        }
        else {
          this.productosVenta[index] = result;
        }
      }
      else {
        this.productosVenta.splice(index, 1);
      }

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

  modificarPedido(){
    this.modalConfirmacionService.confirmar('Confirmar modificación', '¿ Esta seguro que desea modificar el pedido ?')
    .then((confirmacion) => {

      if (confirmacion && confirmacion === true) {

        this.pedido.precioTotal = this.obtenerTotalCompra();

        /*
        const dtoPedido: any = {
          precioTotal: this.obtenerTotalCompra(),
          idListaPrecio: this.local.idListaPrecio,
          idFormaPago: '7',
          idLocalCliente: this.local.idLocalCliente,
          diaRuta: new Date().getDay()
        };*/

        const datosPedido = {
          productos: this.productosVenta,
          pedido: this.pedido
        };

        this.pedidosService.modificarPedido(datosPedido).subscribe(response => {
          //console.log(response);
          if (response){
            this.router.navigate(['/pedidos/listar']);
            this.modalMensajesService.mensaje('Pedido modificado', 'El pedido ha sido modificado exitosamente.');
          }
        });
      }
    })
    .catch(() => console.log('dimissed'));

  }

}
