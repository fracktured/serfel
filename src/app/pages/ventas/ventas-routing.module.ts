import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AutenticacionGuard } from '../../guards/autenticacion.guard';
import { TipoUsuario } from '../../models/tipo-usuario.model';
import { PrefacturacionComponent } from './prefacturacion/prefacturacion.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'prefacturacion',
        component: PrefacturacionComponent,
        canActivate: [ AutenticacionGuard ],
        data: { title: 'Prefacturacion', roles: [TipoUsuario.Administrador] }
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
export class VentasRoutingModule { }
