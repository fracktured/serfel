import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { moduleGuard } from './core/module.guard';
import { ProductosPageComponent } from './features/productos/productos-page.component';
import { SinAccesoComponent } from './features/sin-acceso/sin-acceso.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'sin-acceso', component: SinAccesoComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  { path: 'productos', component: ProductosPageComponent, canActivate: [moduleGuard('productos')] },
  { path: '**', redirectTo: 'productos' },
];
