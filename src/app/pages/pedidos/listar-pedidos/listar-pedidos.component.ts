import { Component, OnInit } from '@angular/core';
import { PedidosService } from 'src/app/services/pedidos.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalConfirmacionService } from '../../shared/modal-confirmacion/modal-confirmacion.service';
import { ModalMensajesService } from '../../shared/modal-mensajes/modal-mensajes.service';
import { LayoutService } from 'src/app/services/layout.service';

@Component({
  selector: 'app-listar-pedidos',
  templateUrl: './listar-pedidos.component.html',
  styleUrls: ['./listar-pedidos.component.css']
})
export class ListarPedidosComponent implements OnInit {
  listaPedidos: any;
  spinner: boolean;

  constructor (
    private modalService: NgbModal,
    private pedidosService: PedidosService,
    private modalConfirmacionService: ModalConfirmacionService,
    private modalMensajesService: ModalMensajesService,
    private router: Router,
    private layoutService: LayoutService
  ) {
    this.listaPedidos = [];
  }

  ngOnInit(): void {
    this.layoutService.setModulo('Lista de Pedidos');
    this.listarPedidos();
  }

  listarPedidos() {
    this.spinner = true;
    this.pedidosService.obtenerPedidosDelDia().subscribe( (response: any) => {
      this.listaPedidos = response;
      this.spinner = false;
    });
  }

  modificarPedido(pedido){

    this.modalConfirmacionService.confirmar('Confirmar Modificación', '¿ Esta seguro que desea modificar el pedido seleccionado ?')
    .then((confirmacion) => {

      if (confirmacion && confirmacion === true) {
        this.router.navigate(['/pedidos/modificar', pedido.id_pedido]);
        // this.router.navigate(['/modificarPedido']);
      }
    })
    .catch(() => console.log('dimissed'));

  }

  eliminarPedido(pedido){

    this.modalConfirmacionService.confirmar('Confirmar Eliminación', '¿ Esta seguro que desea eliminar el pedido seleccionado ?')
    .then((confirmacion) => {

      const params = {
          idPedido: pedido.id_pedido
      };

      if (confirmacion && confirmacion === true) {
        this.pedidosService.eliminarPedido(params).subscribe( (response: any) => {

          // se utiliza para recargar la pagina.
          this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true })
          .then(() => {
            this.router.navigate(['/pedidos/listar']);
          });

          this.modalMensajesService.mensaje('Pedido Eliminado', `El pedido ${pedido.id_pedido} a sido eliminado exitosamente`);
        });
      }
    })
    .catch(() => console.log('dimissed'));
  }

}
