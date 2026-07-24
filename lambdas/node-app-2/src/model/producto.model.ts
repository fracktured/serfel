import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface ProductoAttributes {
  idProducto: number;
  nomProducto: string;
  descProducto: string;
  codBarraProducto: string;
  idTipoProducto: number;
  idMarca: number;
  idUM: number;
  idUsuarioMod: number;
  ultFechaMod: Date;
	idEstado: number;
  //costoProm: number;
  //ultFechaCompra: Date;
  codSerfel: number;
  impuesto: number;
  usaPorciones: boolean;
}

interface ProductoCreationAttributes extends Optional<ProductoAttributes, 'idProducto'> { }

export class Producto extends Model<ProductoAttributes, ProductoCreationAttributes>
  implements ProductoAttributes { 
  
  idProducto!: number;
  nomProducto!: string;
  descProducto!: string;
  codBarraProducto!: string;
  idTipoProducto!: number;
  idMarca!: number;
  idUM!: number;
  idUsuarioMod!: number;
  ultFechaMod!: Date;
	idEstado!: number;
  //costoProm!: number;
  //ultFechaCompra!: Date;
  codSerfel!: number;
  impuesto!: number;
  usaPorciones!: boolean;

  public static doInit = (sequelize: Sequelize): typeof Producto => {
    return Producto.init({
      idProducto: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_producto'
      },
      nomProducto: {
        type: DataTypes.STRING,
        field: 'nom_producto'
      },
      descProducto: {
        type: DataTypes.STRING,
        field: 'desc_producto'
      },
      codBarraProducto: {
        type: DataTypes.STRING,
        field: 'cod_barra_producto'
      },
      idTipoProducto: {
        type: DataTypes.INTEGER,
        field: 'id_tipo_producto'
      },
      idMarca: {
        type: DataTypes.INTEGER,
        field: 'id_marca'
      },
      idUM: {
        type: DataTypes.INTEGER,
        field: 'id_UM'
      },
      idUsuarioMod: {
        type: DataTypes.INTEGER,
        field: 'id_usuario_mod'
      },
      ultFechaMod: {
        type: DataTypes.DATE,
        field: 'ult_fecha_mod'
      },
      idEstado: {
        type: DataTypes.INTEGER,
        field: 'id_estado'
      },
      /*costoProm: {
        type: DataTypes.DECIMAL,
        field: 'costo_prom'
      },
      ultFechaCompra: {
        type: DataTypes.DATE,
        field: 'ult_fecha_compra'
      },*/
      codSerfel: {
        type: DataTypes.INTEGER,
        field: 'cod_serfel'
      },
      impuesto: DataTypes.INTEGER,
      usaPorciones: {
        type: DataTypes.BOOLEAN,
        field: 'usa_porciones'
      }
    }, {
      sequelize,
      tableName: '20_m_producto',
      timestamps: false
    });
  }
}