import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface UMAttributes {
  idUM: number;
  nomUM: string;
  descUM: string;
}

interface UMCreationAttributes 
  extends Optional<UMAttributes, 'idUM'> { }

export class UM extends Model<UMAttributes, UMCreationAttributes>
  implements UMAttributes { 

  idUM!: number;
  nomUM!: string;
  descUM!: string;

  public static doInit = (sequelize: Sequelize): typeof UM => {
    return UM.init({
      idUM: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_UM'
      },
      nomUM: {
        type: DataTypes.STRING,
        field: 'nom_UM'
      },
      descUM: {
        type: DataTypes.STRING,
        field: 'desc_UM'
      }
    }, {
      sequelize,
      tableName: '20_p_unidad_medida',
      timestamps: false
    });
  }
}