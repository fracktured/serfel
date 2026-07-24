import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface MarcaAttributes {
  idMarca: number;
  nomMarca: string;
  descMarca: string;
}

interface MarcaCreationAttributes 
  extends Optional<MarcaAttributes, 'idMarca'> { }

export class Marca extends Model<MarcaAttributes, MarcaCreationAttributes>
  implements MarcaAttributes { 

  idMarca!: number;
  nomMarca!: string;
  descMarca!: string;

  public static doInit = (sequelize: Sequelize): typeof Marca => {
    return Marca.init({
      idMarca: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_marca'
      },
      nomMarca: {
        type: DataTypes.STRING,
        field: 'nom_marca'
      },
      descMarca: {
        type: DataTypes.STRING,
        field: 'desc_marca'
      }
    }, {
      sequelize,
      tableName: '20_p_marca',
      timestamps: false
    });
  }
}