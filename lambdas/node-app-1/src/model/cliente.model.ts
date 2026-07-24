import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface ClienteAttributes {
   rutCliente: number;
   dvCliente: string;
   razonSocial: string;
   nomFantasia: string;
   idListaPrecio: number;
   idUsuarioMod: number;
   ultFechaMod: Date;
   idEstado: number;
}

interface ClienteCreationAttributes
   extends Optional<ClienteAttributes, 'rutCliente'> { }

export class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes>
   implements ClienteAttributes {

   rutCliente!: number;
   dvCliente!: string;
   razonSocial!: string;
   nomFantasia!: string;
   idListaPrecio!: number;
   idUsuarioMod!: number;
   ultFechaMod!: Date;
   idEstado!: number;

   public static doInit = (sequelize: Sequelize): typeof Cliente => {
      return Cliente.init({
         rutCliente: {
            allowNull: false,
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
            field: 'rut_cliente'
         },
         dvCliente: {
            type: DataTypes.STRING,
            field: 'dv_cliente'
         },
         razonSocial: {
            type: DataTypes.STRING,
            field: 'razon_social'
         },
         nomFantasia: {
            type: DataTypes.STRING,
            field: 'nom_fantasia'
         },
/*telefono_cliente
direccion_cliente
comuna
ciudad
email_cliente*/
         idListaPrecio: {
            type: DataTypes.INTEGER,
            field: 'id_lista_precio'
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
         //permite_venta_deuda
      }, {
         sequelize,
         tableName: '10_m_cliente',
         timestamps: false
      });
   }
}