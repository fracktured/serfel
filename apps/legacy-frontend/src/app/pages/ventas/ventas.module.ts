import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VentasRoutingModule } from './ventas-routing.module';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PrefacturacionComponent } from './prefacturacion/prefacturacion.component';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';


@NgModule({
  declarations: [
    PrefacturacionComponent
  ],
  imports: [
    VentasRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NgMultiSelectDropDownModule.forRoot()
  ]
})
export class VentasModule { }
