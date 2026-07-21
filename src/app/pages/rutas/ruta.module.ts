import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RutaRoutingModule } from './ruta-routing.module';
import { ListadoCargaComponent } from './listado-carga/listado-carga.component';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';


@NgModule({
  declarations: [
    ListadoCargaComponent
  ],
  imports: [
    RutaRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule, 
    NgMultiSelectDropDownModule.forRoot()
  ]
})
export class RutaModule { }
