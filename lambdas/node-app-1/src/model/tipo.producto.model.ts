import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface TipoProductoAttributes {
  
  idTipoProducto: number;
  nomTipoProducto: string;
  descTipoProducto: string;
  nivel1: number;
  nivel2: number;
}

interface TipoProductoCreationAttributes 
  extends Optional<TipoProductoAttributes, 'idTipoProducto'> { }

export class TipoProducto extends Model<TipoProductoAttributes, TipoProductoCreationAttributes>
  implements TipoProductoAttributes { 

  idTipoProducto!: number;
  nomTipoProducto!: string;
  descTipoProducto!: string;
  nivel1!: number;
  nivel2!: number;

  public static doInit = (sequelize: Sequelize): typeof TipoProducto => {
    return TipoProducto.init({
      idTipoProducto: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_tipo_producto'
      },
      nomTipoProducto: {
        type: DataTypes.STRING,
        field: 'nom_tipo_producto'
      },
      descTipoProducto: {
        type: DataTypes.STRING,
        field: 'desc_tipo_producto'
      },
      nivel1: {
        type: DataTypes.INTEGER,
        field: 'nivel_1'
      },
      nivel2: {
        type: DataTypes.INTEGER,
        field: 'nivel_2'
      }
    }, {
      sequelize,
      tableName: '20_p_tipo_producto',
      timestamps: false
    });
  }
}