import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-mensajes',
  templateUrl: './modal-mensajes.component.html',
  styleUrls: ['./modal-mensajes.component.css']
})
export class ModalMensajesComponent implements OnInit {

  @Input() titulo: string;
  @Input() mensaje: string;
  @Input() btnText: string;

  constructor(private activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  public aceptar() {
    this.activeModal.close();
  }

  public dismiss() {
    this.activeModal.dismiss();
  }

}
