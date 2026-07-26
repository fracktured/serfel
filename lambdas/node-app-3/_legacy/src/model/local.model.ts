import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface LocalAttributes {
  idLocal: number;
  rutCliente: number;
  nomLocal: string;
  /*telefono_local_cliente
  direccion_local_cliente
  comuna_local_cliente
  email_local_cliente
  giro
  nom_contacto
  apell_pat_contacto
  apell_mat_contacto
  telefono_contacto
  email_contacto
  tope_venta
  tope_credito
  idVendedor: number;
id_forma_pago
comuna
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
  /*grupo!: number;
  numero!: number;
	cantidad!: number;
	idVenta!: number | null;
  idUsuario!: number;*/
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
      /*fecha: DataTypes.DATE,
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
      },*/
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