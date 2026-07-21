import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LocalesService } from 'src/app/services/locales.service';

@Component({
  selector: 'app-modal-busqueda-locales-cliente',
  templateUrl: './modal-busqueda-locales-cliente.component.html',
  styleUrls: ['./modal-busqueda-locales-cliente.component.css']
})
export class ModalBusquedaLocalesClienteComponent implements OnInit {
  listaLocales: any;
  formularioBuscarLocalCliente: FormGroup;
  spinnerBuscar: boolean;

  constructor(public activeModal: NgbActiveModal,
              private localesServicio: LocalesService,
              private formBulder: FormBuilder)
  { }

  ngOnInit(): void {
    this.crearFormulario();
  }

  get rutCliente(){
    return this.formularioBuscarLocalCliente.get('rutCliente');
  }

  get nombreCliente(){
    return this.formularioBuscarLocalCliente.get('nombreCliente');
  }

  get rutNoValido(){
    return this.formularioBuscarLocalCliente.get('rutCliente').invalid && this.formularioBuscarLocalCliente.get('rutCliente').touched;
  }

  get nombreNoValido(){
    return this.formularioBuscarLocalCliente.get('nombreCliente').invalid && this.formularioBuscarLocalCliente.get('nombreCliente').touched;
  }

  crearFormulario(){

    this.formularioBuscarLocalCliente = this.formBulder.group({
      rutCliente     : ['', [Validators.minLength(9)]],
      nombreCliente  : ['', [Validators.minLength(3)]]
    });

    // this.formularioBuscarLocalCliente.controls.rutCliente.valueChanges.subscribe(value => {
    // });

  }

  buscarLocalesPorCliente() {
    if (this.formularioBuscarLocalCliente.valid) {
      this.spinnerBuscar = true;

      const valorRutCliente: string = this.formularioBuscarLocalCliente.controls.rutCliente.value;
      const valorNombreCliente: string = this.formularioBuscarLocalCliente.controls.nombreCliente.value;

      if (valorNombreCliente && valorNombreCliente.length){

        this.localesServicio.obtenerLocalesPorNombreCliente( valorNombreCliente ).subscribe(response => {
          this.listaLocales = response;
          this.spinnerBuscar = false;
        });

      }
      else if (valorRutCliente  && valorRutCliente.length) {

        this.localesServicio.obtenerLocalesPorRutCliente( valorRutCliente ).subscribe(response => {
          this.listaLocales = response;
          this.spinnerBuscar = false;
        });

      }
    }
  }

  seleccionarLocal(localSeleccionado){

    this.activeModal.close(localSeleccionado);
  }

  limpiarFomulario(){
    this.formularioBuscarLocalCliente.controls.rutCliente.setValue('');
    this.formularioBuscarLocalCliente.controls.nombreCliente.setValue('');
  }

}
