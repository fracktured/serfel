import { Model, DataTypes, Optional, Sequelize } from 'sequelize';

interface VentaAttributes {
   idVenta: number;
   idListaPrecio: number;
   idUsuarioVenta: number;
   iva: number;
   iaba: number;
   espec: number;
   subTotal: number;
   precioTotal: number;
   numDoctoEmitido: number;
   idTipoDoctoEmitido: number;
   rutEmpresa: number;
   rutCliente: number;
   idLocal: number;
   idFormaPago: number;
   idPedido: number;
   fecha: Date;
   entregado: number;
   idUsuarioMod: number;
   ultFechaMod: Date;
   idEstado: number;
   /*id_folio
   url_PDF
   url_PDF_original
   url_PDF_cedible*/
   observaciones: string;
   /*periodo_libro
   id_estado_pago*/
}

interface VentaCreationAttributes extends Optional<VentaAttributes, 'idVenta'> { }

export class Venta extends Model<VentaAttributes, VentaCreationAttributes>
   implements VentaAttributes {

   idVenta!: number;
   idListaPrecio!: number;
   idUsuarioVenta!: number;
   iva!: number;
   iaba!: number;
   espec!: number;
   subTotal!: number;
   precioTotal!: number;
   numDoctoEmitido!: number;
   idTipoDoctoEmitido!: number;
   rutEmpresa!: number;
   rutCliente!: number;
   idLocal!: number;
   idFormaPago!: number;
   idPedido!: number;
   fecha!: Date;
   entregado!: number;
   idUsuarioMod!: number;
   ultFechaMod!: Date;
   idEstado!: number;
   observaciones!: string;

   public static doInit = (sequelize: Sequelize): typeof Venta => {
      return Venta.init({
         idVenta: {
            allowNull: false,
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
            field: 'id_venta',
            defaultValue: 0
         },
         idListaPrecio: {
            type: DataTypes.INTEGER,
            field: 'id_lista_precio',
            defaultValue: 1
         },
         idUsuarioVenta: {
            type: DataTypes.INTEGER,
            field: 'id_usuario_venta',
            defaultValue: 1
         },
         iva: {
            type: DataTypes.INTEGER,
            field: 'iva'
         },
         iaba: {
            type: DataTypes.INTEGER,
            field: 'iaba'
         },
         espec: {
            type: DataTypes.INTEGER,
            field: 'espec'
         },
         subTotal: {
            type: DataTypes.INTEGER,
            field: 'sub_total'
         },
         precioTotal: {
            type: DataTypes.INTEGER,
            field: 'precio_total',
            defaultValue: 0
         },
         numDoctoEmitido: {
            type: DataTypes.INTEGER,
            field: 'num_docto_emitido',
            defaultValue: 0
         },
         idTipoDoctoEmitido: {
            type: DataTypes.INTEGER,
            field: 'id_tipo_docto_emitido',
            defaultValue: 1
         },
         rutEmpresa: {
            type: DataTypes.INTEGER,
            field: 'rut_empresa',
            defaultValue: 0
         },
         rutCliente: {
            type: DataTypes.INTEGER,
            field: 'rut_cliente',
            defaultValue: 0
         },
         idLocal: {
            type: DataTypes.INTEGER,
            field: 'id_local_cliente',
            defaultValue: 0
         },
         idFormaPago: {
            type: DataTypes.INTEGER,
            field: 'id_forma_pago'
         },
         idPedido: {
            type: DataTypes.INTEGER,
            field: 'id_pedido'
         },
         fecha: {
            type: DataTypes.DATE,
            field: 'fecha_venta',
            defaultValue: new Date()
         },
         entregado: {
            type: DataTypes.INTEGER,
            field: 'entregado'
         },
         idUsuarioMod: {
            type: DataTypes.INTEGER,
            field: 'id_usuario_mod',
            defaultValue: 1
         },
         ultFechaMod: {
            type: DataTypes.DATE,
            field: 'ult_fecha_mod',
            defaultValue: new Date()
         },
         idEstado: {
            type: DataTypes.INTEGER,
            field: 'id_estado',
            defaultValue: 1
         },
         observaciones: {
            type: DataTypes.STRING,
            field: 'observaciones'
         }
         /*field: 'id_folio'
         field: 'url_PDF'
         field: 'url_PDF_original'
         field: 'url_PDF_cedible'
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