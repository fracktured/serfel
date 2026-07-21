import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PrecioProductoModel } from '../../../models/precio-producto.model';

@Component({
  selector: 'app-modal-detalle-producto',
  templateUrl: './modal-detalle-producto.component.html',
  styleUrls: ['./modal-detalle-producto.component.css']
})
export class ModalDetalleProductoComponent implements OnInit {

  @Input() producto: PrecioProductoModel;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
  }

  ingresarDetalleProducto() {
    if ( this.producto.cantidad === undefined || !(this.producto.cantidad > 0) ) {
      alert('Cantidad debe ser mayor a 0');
      return;
    }

    if ( this.producto.porcenDesc === undefined || !( this.producto.porcenDesc > 0 ) ) {
      this.producto.porcenDesc = 0;
    }

    this.producto.porcenDesc = parseInt(this.producto.porcenDesc.toString());
    this.producto.maxPorcenDesc = parseInt(this.producto.maxPorcenDesc.toString());
    this.producto.cantidad = parseFloat(this.producto.cantidad.toString());
    this.producto.cantidadStock = parseFloat(this.producto.cantidadStock.toString());
    this.producto.cantidadPedida = parseFloat(this.producto.cantidadPedida.toString());

    if ( this.producto.cantidad > (this.producto.cantidadStock - this.producto.cantidadPedida) ) {
      // tituloModalMensajes = 'Supero el porcentaje de descuento';
      alert('El stock maximo para la venta es: ' + (this.producto.cantidadStock - this.producto.cantidadPedida));
      return;
    }
    else if ( this.producto.porcenDesc > this.producto.maxPorcenDesc ) {
      // tituloModalMensajes = 'Supero la cantidad maxima de stock';
      alert('El porcentaje maximo de descuento que puede utilizar es: ' + this.producto.maxPorcenDesc);
      return;
    }
    this.activeModal.close(this.producto);
  }

  eliminarProductoPedido() {
    this.activeModal.close('Eliminar');
  }

}
