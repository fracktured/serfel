import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface VentaAttributes {
  idVenta: number;
  idListaPrecio: number;
  /*idUsuarioVenta: number;
  iva: number;
  iaba: number;
  espec: number;
sub_total
precio_total*/
  numDoctoEmitido: number;
  idTipoDoctoEmitido: number;
  rutEmpresa: number;
  rutCliente: number;
  idLocal: number;
/*id_forma_pago
id_pedido*/
  fechaVenta: Date;
  entregado: number;
  /*id_usuario_mod
ult_fecha_mod*/
  idEstado: number;
/*id_folio
url_PDF
url_PDF_original
url_PDF_cedible
observaciones
periodo_libro
id_estado_pago*/
}

interface VentaCreationAttributes extends Optional<VentaAttributes, 'idVenta'> { }

export class Venta extends Model<VentaAttributes, VentaCreationAttributes>
  implements VentaAttributes { 

  idVenta!: number;
  idListaPrecio!: number;
  numDoctoEmitido!: number;
  idTipoDoctoEmitido!: number;
  rutEmpresa!: number;
  rutCliente!: number;
  idLocal!: number;
  fechaVenta!: Date;
  entregado!: number;
	idEstado!: number;

  public static doInit = (sequelize: Sequelize): typeof Venta => {
    return Venta.init({
      idVenta: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        unique: true,
        field: 'id_venta'
      },
      idListaPrecio: {
        type: DataTypes.INTEGER,
        field: 'id_lista_precio'
      },
      /*
      field: 'id_usuario_venta'
  field: 'iva'
  field: 'iaba'
  field: 'espec'
  field: 'sub_total'
  field: 'precio_total'
      */
      numDoctoEmitido: {
        type: DataTypes.INTEGER,
        field: 'num_docto_emitido'
      },
      idTipoDoctoEmitido: {
        type: DataTypes.INTEGER,
        field: 'id_tipo_docto_emitido'
      },
      rutEmpresa: {
        type: DataTypes.INTEGER,
        field: 'rut_empresa'
      },
      rutCliente: {
        type: DataTypes.INTEGER,
        field: 'rut_cliente'
      },
      idLocal: {
        type: DataTypes.INTEGER,
        field: 'id_local_cliente'
      },
      /*
  field: 'id_forma_pago'
  field: 'id_pedido'
      */
      fechaVenta: {
        type: DataTypes.DATE,
        field: 'fecha_venta'
      },
      entregado: {
        type: DataTypes.INTEGER,
        field: 'entregado'
      },
  /*field: 'id_usuario_mod'
  field: 'ult_fecha_mod'*/
      idEstado: {
        type: DataTypes.INTEGER,
        field: 'id_estado'
      }
  /*field: 'id_folio'
  field: 'url_PDF'
  field: 'url_PDF_original'
  field: 'url_PDF_cedible'
  field: 'observaciones'
  field: 'periodo_libro'
  field: 'id_estado_pago'
      */
    }, {
      sequelize,
      tableName: '40_m_venta',
      timestamps: false
    });
  }
}