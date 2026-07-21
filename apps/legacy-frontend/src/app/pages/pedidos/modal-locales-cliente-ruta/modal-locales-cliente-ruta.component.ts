import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LocalClienteModel } from 'src/app/models/local-cliente.model';

@Component({
  selector: 'app-modal-locales-cliente-ruta',
  templateUrl: './modal-locales-cliente-ruta.component.html',
  styleUrls: ['./modal-locales-cliente-ruta.component.css']
})
export class ModalLocalesClienteRutaComponent implements OnInit {

  @Input() listaLocales: LocalClienteModel[];
  @Input() listaLocalesBloqueados: LocalClienteModel[];
  @Input() listaLocalesEntregados: LocalClienteModel[];

  txtFiltroCliente: string;

  constructor(public activeModal: NgbActiveModal)
  {
    this.txtFiltroCliente = '';
  }

  ngOnInit(): void {
  }

  seleccionarLocal(local: LocalClienteModel){
    this.activeModal.close(local);
  }

}
