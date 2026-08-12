import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { moduleGuard } from './core/module.guard';
import { ProductosPageComponent } from './features/productos/productos-page.component';
import { ListadoCargaPageComponent } from './features/listado-carga/listado-carga-page.component';
import { UsuariosPageComponent } from './features/usuarios/usuarios-page.component';
import { SinAccesoComponent } from './features/sin-acceso/sin-acceso.component';
import { PrefacturacionPageComponent } from './features/prefacturacion/prefacturacion-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'sin-acceso', component: SinAccesoComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  { path: 'productos', component: ProductosPageComponent, canActivate: [moduleGuard('productos')] },
  { path: 'listado-carga', component: ListadoCargaPageComponent, canActivate: [moduleGuard('rutas')] },
  { path: 'usuarios', component: UsuariosPageComponent, canActivate: [moduleGuard('usuarios')] },
  { path: 'prefacturacion', component: PrefacturacionPageComponent, canActivate: [moduleGuard('ventas')] },
  { path: '**', redirectTo: 'productos' },
];
