import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface RutaLocalAttributes {
  idRuta: number;
  idLocal: number;
}

interface RutaLocalCreationAttributes 
  extends Optional<RutaLocalAttributes, 'idRuta' | 'idLocal'> { }

export class RutaLocal extends Model<RutaLocalAttributes, RutaLocalCreationAttributes>
  implements RutaLocalAttributes { 

  idRuta!: number;
  idLocal!: number;

  public static doInit = (sequelize: Sequelize): typeof RutaLocal => {
    return RutaLocal.init({
      idRuta: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_ruta'
      },
      idLocal: {
        type: DataTypes.INTEGER,
        field: 'id_local_cliente'
      }
    }, {
      sequelize,
      tableName: '40_m_ruta_local_cliente',
      timestamps: false
    });
  }
}