import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface UsuarioAttributes {
  idUsuario: number;
  rutUsuario: number;
  dvUsuario: string;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  password: string;
  idTipoUsuario: number;
  telefonoUsuario: string;
  direccionUsuario: string;
  emailUsuario: string;
  numUsuario: number;
  idUsuarioMod: number;
  ultFechaMod: Date;
  idEstado: number;
  fechaActProductos: Date;
}

interface UsuarioCreationAttributes extends Optional<UsuarioAttributes, 'idUsuario' | 'fechaActProductos'> { }

export class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes>
  implements UsuarioAttributes { 

  idUsuario!: number;
  rutUsuario!: number;
  dvUsuario!: string;
  nombre!: string;
  apPaterno!: string;
  apMaterno!: string;
  password!: string;
  idTipoUsuario!: number;
  telefonoUsuario!: string;
  direccionUsuario!: string;
  emailUsuario!: string;
  numUsuario!: number;
  idUsuarioMod!: number;
  ultFechaMod!: Date;
  idEstado!: number;
  fechaActProductos!: Date;

  public static doInit = (sequelize: Sequelize): typeof Usuario => {
    return Usuario.init({
      idUsuario: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_usuario'
      },
      rutUsuario: {
        type: DataTypes.INTEGER,
        field: 'rut_usuario'
      },
      dvUsuario: {
        type: DataTypes.STRING,
        field: 'dv_usuario'
      },
      nombre: {
        type: DataTypes.STRING,
        field: 'nom_usuario'
      },
      apPaterno: {
        type: DataTypes.STRING,
        field: 'apell_pat_usuario'
      },
      apMaterno: {
        type: DataTypes.STRING,
        field: 'apell_mat_usuario'
      },
      password: DataTypes.STRING,
      idTipoUsuario: {
        type: DataTypes.INTEGER,
        field: 'id_tipo_usuario'
      },
      telefonoUsuario: {
        type: DataTypes.STRING,
        field: 'telefono_usuario'
      },
      direccionUsuario: {
        type: DataTypes.STRING,
        field: 'direccion_usuario'
      },
      emailUsuario: {
        type: DataTypes.STRING,
        field: 'email_usuario'
      },
      numUsuario: {
        type: DataTypes.INTEGER,
        field: 'num_usuario'
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
      },
      fechaActProductos: {
        type: DataTypes.DATE,
        field: 'fecha_act_productos'
      }
    }, {
      sequelize,
      tableName: '10_m_usuario',
      timestamps: false
    });
  }
}