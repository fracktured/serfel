import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-confirmacion',
  templateUrl: './modal-confirmacion.component.html',
  styleUrls: ['./modal-confirmacion.component.css']
})
export class ModalConfirmacionComponent implements OnInit {

  @Input() titulo: string;
  @Input() mensaje: string;
  @Input() btnAceptarText: string;
  @Input() btnCancelarText: string;

  constructor(private activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  public aceptar() {
    this.activeModal.close(true);
  }

  public cancelar() {
    this.activeModal.close(false);
  }

  public dismiss() {
    this.activeModal.dismiss();
  }

}
