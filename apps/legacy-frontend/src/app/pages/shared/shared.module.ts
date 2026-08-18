import { NgModule } from '@angular/core';

import { MonedaPipe } from 'src/app/pipes/moneda.pipe';
import { FiltrarPorTextoPipe } from 'src/app/pipes/filtrar-por-texto.pipe';
import { FechaLocalPipe } from 'src/app/pipes/fecha-local.pipe';
import { Title } from '@angular/platform-browser';
import { ModalTimeOutComponent } from './modal-time-out/modal-time-out.component';
import { ModalConfirmacionComponent } from './modal-confirmacion/modal-confirmacion.component';
import { ModalMensajesComponent } from './modal-mensajes/modal-mensajes.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout/layout.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ClientFullRutPipe } from '@app/pipes/full-rut-cliente.pipe';
import { ContactFullName } from '@app/pipes/full-nom-contacto.pipe';
import { FullName } from '@app/pipes/full-nombre.pipe';


@NgModule({
  declarations: [
    LayoutComponent,
    SidebarComponent,
    NavbarComponent,
    ModalTimeOutComponent,
    ModalConfirmacionComponent,
    ModalMensajesComponent,
    MonedaPipe,
    FechaLocalPipe,
    FiltrarPorTextoPipe,
    FullName,
    ClientFullRutPipe,
    ContactFullName
  ],
  imports: [
    RouterModule,
    CommonModule
  ],
  exports: [
    LayoutComponent,
    SidebarComponent,
    NavbarComponent,
    MonedaPipe,
    FechaLocalPipe,
    FiltrarPorTextoPipe,
    FullName,
    ClientFullRutPipe,
    ContactFullName
  ],
  providers: [
    Title
  ]
})
export class SharedModule { }
