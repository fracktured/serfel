import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ESTADO_ACTIVO, ESTADO_ASIGNADO } from '@app/models/estado.model';
import { PorcionModel } from '@app/models/porcion.model';
import { PorcionService } from '@app/services/porcion.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-modal-porcion',
  templateUrl: './modal-porcion.component.html',
  styleUrls: ['./modal-porcion.component.css']
})
export class ModalPorcionComponent implements OnInit {
  formModificar = this.formBuilder.group({
    idPorcion: [null as number | null],
    grupo: [null as number | null, [Validators.required, Validators.min(1)]],
    numero: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100)]],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.05)]],
    factura: [null as number | null],
    estado: [{
      value: 1,
      disabled: true
    }]
  });
  error = false;
  mensajeError = '';

  @Input() porcion: PorcionModel;

  constructor(
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private porcionService: PorcionService
  ) { }

  ngOnInit(): void {
    this.formModificar.patchValue({
      idPorcion: this.porcion.idPorcion,
      grupo: this.porcion.grupo,
      numero: this.porcion.numero,
      cantidad: this.porcion.cantidad,
      factura: this.porcion.venta?.numDoctoEmitido,
      estado: this.porcion.idEstado
    });
  }

  modificar() {
    this.error = false;
    const formValue = {
      ...this.formModificar.value,
      idProducto: this.porcion.idProducto
    } as any;
    this.porcionService.modificar( this.porcion.idProducto, formValue )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if( !this.error ) {
          this.activeModal.close(response);
        }
      });
  }

  onFacturaChange(event) {
    const facturaValue = this.formModificar.controls.factura.value;
    this.formModificar.patchValue({
      estado: (facturaValue && facturaValue > 0) ? ESTADO_ASIGNADO : ESTADO_ACTIVO
    });
  }

  handleError(err) {
    console.error(err.error.message);
    this.error = true;
    this.mensajeError = err.error.message;
  }
}
