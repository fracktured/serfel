import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'productos' },
  // 'productos' route is added in the productos feature task
  { path: '**', redirectTo: 'productos' },
];
