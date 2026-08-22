import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { moduleGuard } from './core/module.guard';
import { ProductosPageComponent } from './features/productos/productos-page.component';
import { ListadoCargaPageComponent } from './features/listado-carga/listado-carga-page.component';
import { UsuariosPageComponent } from './features/usuarios/usuarios-page.component';
import { SinAccesoComponent } from './features/sin-acceso/sin-acceso.component';
import { PrefacturacionPageComponent } from './features/prefacturacion/prefacturacion-page.component';
import { ClientesPageComponent } from './features/clientes/clientes-page.component';
import { MarcasPageComponent } from './features/marcas/marcas-page.component';
import { PreciosPageComponent } from './features/precios/precios-page.component';
import { NotasCreditoPageComponent } from './features/notas-credito/notas-credito-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'sin-acceso', component: SinAccesoComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  { path: 'productos', component: ProductosPageComponent, canActivate: [moduleGuard('productos')] },
  { path: 'listado-carga', component: ListadoCargaPageComponent, canActivate: [moduleGuard('rutas')] },
  { path: 'usuarios', component: UsuariosPageComponent, canActivate: [moduleGuard('usuarios')] },
  { path: 'prefacturacion', component: PrefacturacionPageComponent, canActivate: [moduleGuard('ventas')] },
  { path: 'clientes', component: ClientesPageComponent, canActivate: [moduleGuard('clientes')] },
  { path: 'marcas', component: MarcasPageComponent, canActivate: [moduleGuard('marcas')] },
  { path: 'precios', component: PreciosPageComponent, canActivate: [moduleGuard('precios')] },
  { path: 'notas-credito', component: NotasCreditoPageComponent, canActivate: [moduleGuard('notas_credito')] },
  { path: '**', redirectTo: 'productos' },
];
