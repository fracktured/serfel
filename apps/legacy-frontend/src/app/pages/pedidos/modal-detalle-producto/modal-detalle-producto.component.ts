import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PrecioProductoModel } from '../../../models/precio-producto.model';
import { getTramosActivos, getTechoEfectivo, getTramoActivoCant, Tramo } from './tramos';

@Component({
  selector: 'app-modal-detalle-producto',
  templateUrl: './modal-detalle-producto.component.html',
  styleUrls: ['./modal-detalle-producto.component.css']
})
export class ModalDetalleProductoComponent implements OnInit {

  @Input() producto: PrecioProductoModel;

  tramos: Tramo[] = [];
  tieneTramos = false;
  techoEfectivo = 0;
  tramoActivoCant: number | null = null;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    this.tramos = getTramosActivos(this.producto);
    this.tieneTramos = this.tramos.length > 0;
    this.recalcularTecho();
  }

  onCantidadChange(): void {
    this.recalcularTecho();
    const porcen = Number(this.producto.porcenDesc);
    if (!isNaN(porcen) && porcen > this.techoEfectivo) {
      this.producto.porcenDesc = this.techoEfectivo;
    }
  }

  private recalcularTecho(): void {
    const cantidad = Number(this.producto.cantidad) || 0;
    this.techoEfectivo = getTechoEfectivo(this.producto, cantidad);
    this.tramoActivoCant = getTramoActivoCant(this.producto, cantidad);
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

    const techo = getTechoEfectivo(this.producto, this.producto.cantidad);

    if ( this.producto.cantidad > (this.producto.cantidadStock - this.producto.cantidadPedida) ) {
      alert('El stock maximo para la venta es: ' + (this.producto.cantidadStock - this.producto.cantidadPedida));
      return;
    }
    else if ( this.producto.porcenDesc > techo ) {
      alert('El porcentaje maximo de descuento que puede utilizar es: ' + techo);
      return;
    }
    this.activeModal.close(this.producto);
  }

  eliminarProductoPedido() {
    this.activeModal.close('Eliminar');
  }

}
