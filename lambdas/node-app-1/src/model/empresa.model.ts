import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface EmpresaAttributes {
   rut: number;
   dv: string;
   razonSocial: string;
   nomFantasia: string;
   /*
direccion_empresa
acceso_rapido
   */
   idUsuarioMod: number;
   ultFechaMod: Date;
   idEstado: number;
   /*
giro
cod_actividad_economica
comuna
ciudad
rut_representante_legal
dv_representante_legal
fecha_aprobacion_SII
num_aprobacion_SII
   */
}

interface EmpresaCreationAttributes
   extends Optional<EmpresaAttributes, 'rut'> { }

export class Empresa extends Model<EmpresaAttributes, EmpresaCreationAttributes>
   implements EmpresaAttributes {

   rut!: number;
   dv!: string;
   razonSocial!: string;
   nomFantasia!: string;
   idUsuarioMod!: number;
   ultFechaMod!: Date;
   idEstado!: number;

   public static doInit = (sequelize: Sequelize): typeof Empresa => {
      return Empresa.init({
         rut: {
            allowNull: false,
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
            field: 'rut_empresa'
         },
         dv: {
            type: DataTypes.STRING,
            field: 'dv_empresa'
         },
         razonSocial: {
            type: DataTypes.STRING,
            field: 'razon_social'
         },
         nomFantasia: {
            type: DataTypes.STRING,
            field: 'nom_fantasia'
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
         }
      }, {
         sequelize,
         tableName: '10_m_empresa',
         timestamps: false
      });
   }
}