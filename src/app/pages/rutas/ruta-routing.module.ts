import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AutenticacionGuard } from '../../guards/autenticacion.guard';
import { TipoUsuario } from '../../models/tipo-usuario.model';
import { ListadoCargaComponent } from './listado-carga/listado-carga.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'listadoCarga',
        component: ListadoCargaComponent,
        canActivate: [ AutenticacionGuard ],
        data: { title: 'Listado Carga', roles: [TipoUsuario.Administrador, TipoUsuario.Secretaria] }
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
export class RutaRoutingModule { }
