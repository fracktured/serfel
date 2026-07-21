import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalConfirmacionComponent } from './modal-confirmacion.component';

@Injectable({
  providedIn: 'root'
})
export class ModalConfirmacionService {

  constructor(private modalService: NgbModal) { }

  public confirmar(
    titulo: string,
    mensaje: string,
    btnAceptarText: string = 'Aceptar',
    btnCancelarText: string = 'Cancel',
    dialogSize: 'sm'|'lg' = 'lg'): Promise<boolean> {
    const modalConfirmacion = this.modalService.open(ModalConfirmacionComponent, { size: dialogSize });
    modalConfirmacion.componentInstance.titulo = titulo;
    modalConfirmacion.componentInstance.mensaje = mensaje;
    modalConfirmacion.componentInstance.btnAceptarText = btnAceptarText;
    modalConfirmacion.componentInstance.btnCancelarText = btnCancelarText;

    return modalConfirmacion.result;
  }
}
