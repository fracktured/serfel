import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface PedidoAttributes {
   idPedido: number;
   fecha: Date;
   idLocal: number;
   diaRuta: number;
   idFormaPago: number;
   tiempo: number;
   precioTotal: number;
   idUsuario: number;
   idListaPrecio: number;
   idEstado: number;
}

interface PedidoCreationAttributes extends Optional<PedidoAttributes, 'idPedido'> { }

export class Pedido extends Model<PedidoAttributes, PedidoCreationAttributes>
   implements PedidoAttributes {

   idPedido!: number;
   fecha!: Date;
   idLocal!: number;
   diaRuta!: number;
   idFormaPago!: number;
   tiempo!: number;
   precioTotal!: number;
   idUsuario!: number;
   idListaPrecio!: number;
   idEstado!: number;

   public static doInit = (sequelize: Sequelize): typeof Pedido => {
      return Pedido.init({
         idPedido: {
            allowNull: false,
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
            field: 'id_pedido'
         },
         fecha: {
            type: DataTypes.DATE,
            field: 'fecha_pedido'
         },
         idLocal: {
            type: DataTypes.INTEGER,
            field: 'id_local_cliente'
         },
         diaRuta: {
            type: DataTypes.INTEGER,
            field: 'dia_ruta'
         },
         idFormaPago: {
            type: DataTypes.INTEGER,
            field: 'id_forma_pago'
         },
         tiempo: {
            type: DataTypes.INTEGER,
            field: 'tiempo'
         },
         precioTotal: {
            type: DataTypes.INTEGER,
            field: 'precio_total'
         },
         idUsuario: {
            type: DataTypes.INTEGER,
            field: 'id_usuario'
         },
         idListaPrecio: {
            type: DataTypes.INTEGER,
            field: 'id_lista_precio'
         },
         idEstado: {
            type: DataTypes.INTEGER,
            field: 'id_estado'
         }
      }, {
         sequelize,
         tableName: '30_m_pedido',
         timestamps: false
      });
   }
}