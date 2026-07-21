import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductoRoutingModule } from './producto-routing.module';
import { ProductosComponent } from './productos/productos.component';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PorcionesComponent } from './porciones/porciones.component';
import { PorcionSortableHeader } from './porciones/porcion-sortable.directive';
import { ModalPorcionComponent } from './modal-porcion/modal-porcion.component';


@NgModule({
  declarations: [
    ProductosComponent,
    PorcionesComponent,
    PorcionSortableHeader,
    ModalPorcionComponent
  ],
  imports: [
    ProductoRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ]
})
export class ProductoModule { }
