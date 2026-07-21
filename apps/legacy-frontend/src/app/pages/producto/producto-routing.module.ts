import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AutenticacionGuard } from '../../guards/autenticacion.guard';
import { ProductosComponent } from './productos/productos.component';
import { TipoUsuario } from '../../models/tipo-usuario.model';
import { PorcionesComponent } from './porciones/porciones.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'listar',
        component: ProductosComponent,
        canActivate: [ AutenticacionGuard ],
        data: { title: 'Productos', roles: [TipoUsuario.Administrador] }
      },
      {
        path: 'porciones/:idProducto',
        component: PorcionesComponent,
        canActivate: [ AutenticacionGuard ],
        data: { title: 'Porciones', roles: [TipoUsuario.Administrador] }
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ProductoRoutingModule { }
