import { ESTADO_ACTIVO } from '../model/estado.model';
import { PedidoRepo } from "../config/bd.sequelize";
import { Pedido } from '../model/pedido.model';
import { Local } from '../model/local.model';
import { Usuario } from '../model/usuario.model';
import { Cliente } from '../model/cliente.model';

export class PedidoService {

   public static findAll = async (): Promise<Pedido[]> => {
      return await PedidoRepo.findAll({
         where: {
            idEstado: ESTADO_ACTIVO
         },
         include: [{
            model: Local,
            as: 'local',
            attributes: ['nomLocal', 'nomContacto', 'apePatContacto', 'apeMatContacto'],
            required: true,
            include: [{
               model: Cliente,
               as: 'cliente',
               attributes: ['rutCliente', 'dvCliente', 'nomFantasia']
            }]
         }, {
            model: Usuario,
            as: 'vendedor',
            attributes: ['nombre', 'apPaterno', 'apMaterno'],
            required: true
         }],
         order: [['fecha', 'DESC']]
      });
   }

}