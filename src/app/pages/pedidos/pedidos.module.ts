import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PedidosRoutingModule } from './pedidos-routing.module';
import { PedidosComponent } from './pedidos.component';
import { SharedModule } from '../shared/shared.module';
import { ListarPedidosComponent } from './listar-pedidos/listar-pedidos.component';
import { CrearPedidoComponent } from './crear-pedido/crear-pedido.component';
import { ModalProductosComponent } from './modal-productos/modal-productos.component';
import { ModalDetalleProductoComponent } from './modal-detalle-producto/modal-detalle-producto.component';
import { ModalOpcionesBusquedaLocalesComponent } from './modal-opciones-busqueda-locales/modal-opciones-busqueda-locales.component';
import { ModalLocalesClienteRutaComponent } from './modal-locales-cliente-ruta/modal-locales-cliente-ruta.component';
import { ModalBusquedaLocalesClienteComponent } from './modal-busqueda-locales-cliente/modal-busqueda-locales-cliente.component';
import { ModificarPedidoComponent } from './modificar-pedido/modificar-pedido.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    PedidosComponent,
    ListarPedidosComponent,
    CrearPedidoComponent,
    ModalProductosComponent,
    ModalDetalleProductoComponent,
    ModalOpcionesBusquedaLocalesComponent,
    ModalLocalesClienteRutaComponent,
    ModalBusquedaLocalesClienteComponent,
    ModificarPedidoComponent
  ],
  imports: [
    PedidosRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ]
})
export class PedidosModule { }
