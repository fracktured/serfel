import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { AutenticacionGuard } from './guards/autenticacion.guard';
import { LayoutComponent } from './pages/shared/layout/layout.component';
import { HomeComponent } from './pages/home/home.component';


const ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: LoginComponent },
  {
    path: 'pedidos',
    component: LayoutComponent,
    loadChildren: () => import('./pages/pedidos/pedidos.module').then(m => m.PedidosModule)
  },
  {
    path: 'producto',
    component: LayoutComponent,
    loadChildren: () => import('./pages/producto/producto.module').then(m => m.ProductoModule)
  },
  {
    path: 'ventas',
    component: LayoutComponent,
    loadChildren: () => import('./pages/ventas/ventas.module').then(m => m.VentasModule)
  },
  {
    path: 'rutas',
    component: LayoutComponent,
    loadChildren: () => import('./pages/rutas/ruta.module').then(m => m.RutaModule)
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'home', component: HomeComponent, canActivate: [ AutenticacionGuard ], data: {title: 'Home'} }
    ]
  },
  { path: '**', pathMatch: 'full', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(ROUTES, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
