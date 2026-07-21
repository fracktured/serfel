import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AutenticacionGuard } from '../../guards/autenticacion.guard';
import { ListarPedidosComponent } from './listar-pedidos/listar-pedidos.component';
import { CrearPedidoComponent } from './crear-pedido/crear-pedido.component';
import { ModificarPedidoComponent } from './modificar-pedido/modificar-pedido.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'listar', component: ListarPedidosComponent, canActivate: [ AutenticacionGuard ], data: {title: 'Lista de Pedidos'} },
      { path: 'crear', component: CrearPedidoComponent, canActivate: [ AutenticacionGuard ], data: {title: 'Crear Pedido'} },
      { path: 'modificar/:idPedido', component: ModificarPedidoComponent, canActivate: [ AutenticacionGuard ], data: {title: 'Modificar Pedido'} }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class PedidosRoutingModule { }
