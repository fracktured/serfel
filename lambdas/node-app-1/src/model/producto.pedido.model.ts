import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { Producto } from './producto.model';

interface ProductoPedidoAttributes {
  idPedido: number;
  idProducto: number;
	cantidad: number;
  precio: number;
  porcenDesc: number;
  precioNeto: number;
  producto?: Producto;
}

interface ProductoPedidoCreationAttributes 
  extends Optional<ProductoPedidoAttributes, 'idPedido' | 'idProducto'> { }

export class ProductoPedido extends Model<ProductoPedidoAttributes, ProductoPedidoCreationAttributes>
  implements ProductoPedidoAttributes { 

  idPedido!: number;
  idProducto!: number;
	cantidad!: number;
  precio!: number;
  porcenDesc!: number;
  precioNeto!: number;
  producto?: Producto;

  public static doInit = (sequelize: Sequelize): typeof ProductoPedido => {
    return ProductoPedido.init(
      {
        idPedido: {
          allowNull: false,
          type: DataTypes.INTEGER,
          primaryKey: true,
          field: 'id_pedido'
        },
        idProducto: {
          allowNull: false,
          type: DataTypes.INTEGER,
          primaryKey: true,
          field: 'id_producto'
        },
        cantidad: DataTypes.DECIMAL,
        precio: DataTypes.INTEGER,
        porcenDesc: {
          type: DataTypes.INTEGER,
          field: 'porcen_desc'
        },
        precioNeto: {
          type: DataTypes.INTEGER,
          field: 'precio_neto'
        }
      }, {
        sequelize,
        tableName: '30_m_producto_pedido',
        timestamps: false
      }
    );
  }
}