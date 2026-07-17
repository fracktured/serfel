import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/auth.guard';
import { ProductosPageComponent } from './features/productos/productos-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  { path: 'productos', component: ProductosPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'productos' },
];
