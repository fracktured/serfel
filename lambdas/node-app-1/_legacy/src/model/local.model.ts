import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface LocalAttributes {
   idLocal: number;
   rutCliente: number;
   nomLocal: string;
   /*telefono_local_cliente
   direccion_local_cliente
   comuna_local_cliente
   email_local_cliente
   giro*/
   nomContacto: string;
   apePatContacto: string;
   apeMatContacto: string;
   /*telefono_contacto
   email_contacto
   tope_venta
   tope_credito
   idVendedor: number;*/
   idFormaPago: number;
   /*comuna
   observaciones
   id_usuario_mod
   ult_fecha_mod
   fecha: Date;*/
   idEstado: number;
   //permite_venta_tope_mensual
}

interface LocalCreationAttributes
   extends Optional<LocalAttributes, 'idLocal'> { }

export class Local extends Model<LocalAttributes, LocalCreationAttributes>
   implements LocalAttributes {

   idLocal!: number;
   rutCliente!: number;
   nomLocal!: string;
   nomContacto!: string;
   apePatContacto!: string;
   apeMatContacto!: string;
   idFormaPago!: number;
   idEstado!: number;

   public static doInit = (sequelize: Sequelize): typeof Local => {
      return Local.init({
         idLocal: {
            allowNull: false,
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
            field: 'id_local_cliente'
         },
         rutCliente: {
            type: DataTypes.INTEGER,
            field: 'rut_cliente'
         },
         nomLocal: {
            type: DataTypes.STRING,
            field: 'nom_local_cliente'
         },
         nomContacto: {
            type: DataTypes.STRING,
            field: 'nom_contacto'
         },
         apePatContacto: {
            type: DataTypes.STRING,
            field: 'apell_pat_contacto'
         },
         apeMatContacto: {
            type: DataTypes.STRING,
            field: 'apell_mat_contacto'
         },
         /*fecha: DataTypes.DATE,
         idUsuario: {
           type: DataTypes.INTEGER,
           field: 'id_usuario'
         },*/
         idFormaPago: {
            type: DataTypes.INTEGER,
            field: 'id_forma_pago'
         },
         idEstado: {
            type: DataTypes.INTEGER,
            field: 'id_estado'
         }
      }, {
         sequelize,
         tableName: '10_m_local_cliente',
         timestamps: false
      });
   }
}