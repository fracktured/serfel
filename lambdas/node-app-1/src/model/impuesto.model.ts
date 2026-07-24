import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface ImpuestoAttributes {
   idImpuesto: number;
   nomImpuesto: string;
   valor: number;
   idImpIss: number;
}

interface ImpuestoCreationAttributes extends Optional<ImpuestoAttributes, 'idImpuesto'> { }

export class Impuesto extends Model<ImpuestoAttributes, ImpuestoCreationAttributes>
   implements ImpuestoAttributes {

   idImpuesto!: number;
   nomImpuesto!: string;
   valor!: number;
   idImpIss!: number;

   public static doInit = (sequelize: Sequelize): typeof Impuesto => {
      return Impuesto.init({
         idImpuesto: {
            allowNull: false,
            type: DataTypes.INTEGER,
            primaryKey: true,
            unique: true,
            field: 'id_impuesto'
         },
         nomImpuesto: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'nom_impuesto'
         },
         valor: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'valor'
         },
         idImpIss: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'id_imp_iss'
         }
      }, {
         sequelize,
         tableName: '99_p_impuesto',
         timestamps: false
      });
   }
} 