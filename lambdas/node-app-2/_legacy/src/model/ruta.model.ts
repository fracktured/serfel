import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface RutaAttributes {
  idRuta: number;
  nomRuta: string;
  idUsuario: number;
  numDia: number;
  //idUsuario_mod
  //ult_fecha_mod
  idEstado: number;
}

interface RutaCreationAttributes 
  extends Optional<RutaAttributes, 'idRuta'> { }

export class Ruta extends Model<RutaAttributes, RutaCreationAttributes>
  implements RutaAttributes { 

  idRuta!: number;
  nomRuta!: string;
  idUsuario!: number;
  numDia!: number;
  //idUsuario_mod
  //ult_fecha_mod
  idEstado!: number;

  public static doInit = (sequelize: Sequelize): typeof Ruta => {
    return Ruta.init({
      idRuta: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_ruta'
      },
      nomRuta: {
        type: DataTypes.STRING,
        field: 'nom_ruta'
      },
      idUsuario: {
        type: DataTypes.INTEGER,
        field: 'id_usuario'
      },
      numDia: {
        type: DataTypes.INTEGER,
        field: 'num_dia'
      },
      idEstado: {
        type: DataTypes.INTEGER,
        field: 'id_estado'
      }
    }, {
      sequelize,
      tableName: '40_m_ruta',
      timestamps: false
    });
  }
}