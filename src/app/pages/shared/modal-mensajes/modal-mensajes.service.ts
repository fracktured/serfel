import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalMensajesComponent } from './modal-mensajes.component';

@Injectable({
  providedIn: 'root'
})
export class ModalMensajesService {

  constructor(private modalService: NgbModal) { }

  public mensaje(
    titulo: string,
    mensaje: string,
    btnText: string = 'Aceptar',
    dialogSize: 'sm'|'lg' = 'lg')
  {
    const modalConfirmacion = this.modalService.open(ModalMensajesComponent, { size: dialogSize });
    modalConfirmacion.componentInstance.titulo = titulo;
    modalConfirmacion.componentInstance.mensaje = mensaje;
    modalConfirmacion.componentInstance.btnText = btnText;
  }
}
