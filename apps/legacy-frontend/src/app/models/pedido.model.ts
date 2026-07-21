import { LocalModel } from "./local.model";
import { UsuarioModel } from "./usuario.model";

export interface PedidoModel {
   idPedido: number;
   fecha: Date;
   idLocal: number;
   local: LocalModel;
   diaRuta: number;
   idFormaPago: number;
   tiempo: number;
   precioTotal: number;
   idUsuario: number;
   vendedor: UsuarioModel;
   idListaPrecio: number;
   idEstado: number;
   seleccionado: boolean;
}

