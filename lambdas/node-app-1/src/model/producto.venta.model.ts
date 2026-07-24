import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface ProductoVentaAttributes {
  idVenta: number;
  idProducto: number;
	cantidad: number;
  precio: number;
  porcenDesc: number;
  precioNeto: number;
}

interface ProductoVentaCreationAttributes 
  extends Optional<ProductoVentaAttributes, 'idVenta' | 'idProducto'> { }

export class ProductoVenta extends Model<ProductoVentaAttributes, ProductoVentaCreationAttributes>
  implements ProductoVentaAttributes { 

  idVenta!: number;
  idProducto!: number;
	cantidad!: number;
  precio!: number;
  porcenDesc!: number;
  precioNeto!: number;

  public static doInit = (sequelize: Sequelize): typeof ProductoVenta => {
    return ProductoVenta.init(
      {
        idVenta: {
          allowNull: false,
          type: DataTypes.INTEGER,
          primaryKey: true,
          field: 'id_venta'
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
        tableName: '40_m_producto_venta',
        timestamps: false
      }
    );
  }
}