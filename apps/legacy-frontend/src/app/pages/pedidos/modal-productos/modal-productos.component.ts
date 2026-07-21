import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PrecioProductoModel } from '../../../models/precio-producto.model';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-modal-productos',
  templateUrl: './modal-productos.component.html',
  styleUrls: ['./modal-productos.component.css']
})
export class ModalProductosComponent implements OnInit {
  esCoproad: boolean;
  esSerfel: boolean;

  @Input() listaProductos: PrecioProductoModel[];
  @Input() filtroBusqueda: string;


  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    this.esCoproad = environment.esCoproad;
    this.esSerfel = !this.esCoproad;
  }

  seleccionarProducto(producto: PrecioProductoModel){
    this.activeModal.close(producto);
  }

}
