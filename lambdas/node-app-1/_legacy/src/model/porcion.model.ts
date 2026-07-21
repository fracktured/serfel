import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface PorcionAttributes {
  idPorcion: number;
  idProducto: number;
	fecha: Date;
  grupo: number;
  numero: number;
	cantidad: number;
	idVenta: number | null;
  idUsuario: number;
	idEstado: number;
}

interface PorcionCreationAttributes 
  extends Optional<PorcionAttributes, 'idPorcion'> { }

export interface PorcionUpdateAttributes {
  idPorcion: number;
  grupo: number;
  numero: number;
  cantidad: number;
  factura: number;
  idUsuario: number;
  idEstado: number;
}

export class Porcion extends Model<PorcionAttributes, PorcionCreationAttributes>
  implements PorcionAttributes { 

  idPorcion!: number;
  idProducto!: number;
	fecha!: Date;
  grupo!: number;
  numero!: number;
	cantidad!: number;
	idVenta!: number | null;
  idUsuario!: number;
	idEstado!: number;

  public static doInit = (sequelize: Sequelize): typeof Porcion => {
    return Porcion.init({
      idPorcion: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_porcion'
      },
      idProducto: {
        type: DataTypes.INTEGER,
        field: 'id_producto'
      },
      fecha: DataTypes.DATE,
      grupo: DataTypes.INTEGER,
      numero: DataTypes.INTEGER,
      cantidad: DataTypes.DECIMAL,
      idVenta: {
        allowNull: true,
        type: DataTypes.INTEGER,
        field: 'id_venta'
      },
      idUsuario: {
        type: DataTypes.INTEGER,
        field: 'id_usuario'
      },
      idEstado: {
        type: DataTypes.INTEGER,
        field: 'id_estado'
      }
    }, {
      sequelize,
      tableName: '20_m_porcion',
      timestamps: false
    });
  }

  public static findByGroupAndNumber = async (idProducto: number, grupo: number, numero: number): Promise<Porcion | null> => {
    return await Porcion.findOne({
      where: {
        idProducto: idProducto,
        grupo: grupo,
        numero: numero
      }
    });
  }
}