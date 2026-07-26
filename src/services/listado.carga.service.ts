import PDFDocument = require('pdfkit');
import { Op } from 'sequelize';
import sequelize = require('sequelize');
import { ProductoVentaRepo, VentaRepo } from '../config/bd.sequelize';
import { RequestError } from '../error/error';
import { ESTADO_FINALIZADO } from '../model/estado.model';
import { Local } from '../model/local.model';
import { Porcion } from '../model/porcion.model';
import { Producto } from '../model/producto.model';
import { ProductoVenta } from '../model/producto.venta.model';
import { RegistroPorcion } from '../model/registro.carga.model';
import { RutaLocal } from '../model/ruta.local.model';
import { Ruta } from '../model/ruta.model';
import { UM } from '../model/um.model';
import { Venta } from '../model/venta.model';
import { TipoProducto } from '../model/tipo.producto.model';


export class ListadoCargaService {
   private readonly dateFormat = require('dateformat');
   private readonly MARGIN_LEFT = 10;
   private readonly COL_N_OPTIONS = { width: 40, align: 'center' };
   private readonly COL_NOM_OPTIONS = { width: 320, align: 'center' };
   private readonly COL_PRECIO_OPTIONS = { width: 65, align: 'center' };
   private readonly COL_CANT_OPTIONS = { width: 50, align: 'center' };
   private readonly COL_OBS_OPTIONS = { width: 65, align: 'center' };
   private readonly X_NOM = this.MARGIN_LEFT + this.COL_N_OPTIONS.width + 1;
   private readonly X_PRECIO = this.X_NOM + this.COL_NOM_OPTIONS.width;
   private readonly X_CANT = this.X_PRECIO + this.COL_PRECIO_OPTIONS.width;
   private readonly X_UM = this.X_CANT + this.COL_CANT_OPTIONS.width;
   private readonly X_OBS = this.X_UM + this.COL_N_OPTIONS.width;
   private readonly MAX_ROWS = 38;
   private page = 0;
   private nomRutas = '';
   private pageOptions = {
      size: 'Letter',
      margins: {
         top: 20,
         bottom: 20,
         left: 10,
         right: 10
      }
   };
   private tipoProducto = '';
   private printTipoProducto = false;

   public createPdf = async (rutas: Ruta[]): Promise<typeof PDFDocument> => {
      if ( rutas.length == 0 ) throw new RequestError('Debe enviar rutas');

      let idRutas: number[] = [];
      this.nomRutas = '';
      rutas.forEach(ruta => {
         idRutas.push( ruta.idRuta );
         this.nomRutas += ruta.nomRuta + ', ';
      });
      this.nomRutas = this.nomRutas.substring(0, this.nomRutas.length - 2);

      const doc = new PDFDocument(this.pageOptions);
      this.printHeader(doc);
      doc.on('pageAdded', () => {
         this.printHeader(doc);
         doc.moveDown();
         if ( this.printTipoProducto ) {
            this.printTipoProductoTitle(doc);
         }
         this.printTableHeader(doc);
      });

      const COL_DET_NOM_OPTIONS = this.COL_NOM_OPTIONS;
      COL_DET_NOM_OPTIONS.align = 'left';
      const COL_DET_PRECIO_OPTIONS = this.COL_PRECIO_OPTIONS;
      COL_DET_PRECIO_OPTIONS.align = 'right';
      const COL_DET_CANT_OPTIONS = this.COL_CANT_OPTIONS;
      COL_DET_CANT_OPTIONS.align = 'right';

      let detalle = await this.findDetail( idRutas );
      detalle.forEach((fila: any) => {
         this.printTipoProducto = fila.producto.tipoProducto.nomTipoProducto != this.tipoProducto;

         if ( this.printTipoProducto ) {
            // Si no es el primer tipo de producto, se agrega una nueva página
            if ( this.tipoProducto != '' ) {
               this.tipoProducto = fila.producto.tipoProducto.nomTipoProducto;
               doc.addPage();
            } else {
               this.tipoProducto = fila.producto.tipoProducto.nomTipoProducto;
               this.printTipoProductoTitle(doc);
               this.printTableHeader(doc);
            }
         }
         let obs = '';
         fila.producto.porciones.forEach((porcion: RegistroPorcion) => {
            obs += porcion.numero + '-';
         });
         if ( obs.length > 0 ) {
            obs = `N(${ obs.substring(0, obs.length -1) })`;
         }
         let sumCantidad = String( fila.get('sumCantidad') );
         sumCantidad = sumCantidad.substring(0, sumCantidad.length -1);
         const subtotal = new Intl.NumberFormat('de-DE').format( parseInt( String( fila.get('subtotal') ) ) );
         
         doc.text(fila.producto.codSerfel.toString(), doc.page.margins.left, undefined, this.COL_N_OPTIONS)
            .moveUp()
            .text(fila.producto.nomProducto, this.X_NOM, undefined, COL_DET_NOM_OPTIONS)
            .moveUp()
            .text(`$ ${ subtotal }`, this.X_PRECIO, undefined, COL_DET_PRECIO_OPTIONS)
            .moveUp()
            .text(sumCantidad, this.X_CANT, undefined, COL_DET_CANT_OPTIONS)
            .moveUp()
            .text(fila.producto.um.nomUM, this.X_UM, undefined, this.COL_N_OPTIONS)
            .moveTo(this.X_OBS, doc.y - 3)
            .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
            .stroke()
            .moveUp();
      
         if ( obs.length > 0 ) {
            doc.text(obs, this.X_OBS, undefined, this.COL_OBS_OPTIONS);
         } else {
            doc.moveDown();
         }
      });

      let totales = await VentaRepo.findAll({
         attributes: [
            [sequelize.fn('COUNT', sequelize.col('id_venta')), 'numFacturas'],
            [sequelize.fn('SUM', sequelize.col('precio_total')), 'total']
         ],
         where: {
            entregado: 0,
            idEstado: ESTADO_FINALIZADO
         },
         include: [{
            model: Local,
            as: 'local', 
            attributes: [],
            required: true,
            include: [{
               model: RutaLocal,
               as: 'rutas',
               attributes: [],
               required: true,
               where: {
                  idRuta: idRutas
               }
            }]
         }]
      });

      if ( totales.length > 0 ) {
         const total = new Intl.NumberFormat('de-DE').format( parseInt( String( totales[0].get('total') ) ) );
         doc.moveDown()
            .fontSize(13)
            .font('Helvetica-Bold')
            .text(`Cantidad Facturas: ${ totales[0].get('numFacturas') }          Total: $ ${ total }`, doc.page.margins.left, undefined, { align: 'center' });
      }

      return doc;
   }

   private findDetail = async (idRutas: number[]): Promise<ProductoVenta[]> => {
      return await ProductoVentaRepo.findAll({
         attributes: [
            'idProducto',
            [sequelize.fn('SUM', sequelize.col('ProductoVenta.cantidad')), 'sumCantidad'],
            [sequelize.literal('SUM(ProductoVenta.cantidad * (ProductoVenta.precio - (ProductoVenta.precio * ProductoVenta.porcen_desc / 100)))'), 'subtotal']
         ],
         include: [{
            model: Venta,
            as: 'venta', 
            attributes: [],
            required: true,
            where: {
               entregado: 0,
               idEstado: ESTADO_FINALIZADO
            },
            include: [{
               model: Local,
               as: 'local', 
               attributes: [],
               required: true,
               include: [{
                  model: RutaLocal,
                  as: 'rutas',
                  attributes: [],
                  required: true,
                  where: {
                     idRuta: idRutas
                  }
               }]
            }]
         }, {
            model: Producto,
            as: 'producto',
            attributes: ['codSerfel', 'nomProducto'],
            include: [{
               model: UM,
               as: 'um',
               attributes: ['nomUM']
            }, {
               model: TipoProducto,
               as: 'tipoProducto',
               attributes: ['nomTipoProducto']
            }, {
               model: Porcion,
               as: 'porciones',
               attributes: ['numero'],
               required: false,
               where: {
                  idVenta: { [Op.col]: 'venta.id_venta' }
               }
            }]
         }],
         group: ['idProducto'],
         order: [
            [{ model: Producto, as: 'producto' }, { model: TipoProducto, as: 'tipoProducto' }, 'nomTipoProducto'],
            [{ model: Producto, as: 'producto' }, 'nomProducto']
         ]
      });
   }

   private printHeader(doc: typeof PDFDocument): void {
      this.page++;
      doc.font('Helvetica-Bold').fontSize(13)
         .text('LISTADO CARGA', { align: 'center' })
         .moveDown(1)
         .text(`Rutas:`)
         .text(`Fecha Informe:`)
         .moveUp(2)
         .font('Helvetica')
         .text( this.nomRutas, 120, doc.y + 1 )
         .text( this.dateFormat(new Date(), 'dd-mm-yyyy'), 120, undefined )
         .fontSize(8)
         .text(`Página   ${ this.page }`, { align: 'right' });
   }

   private printTipoProductoTitle(doc: typeof PDFDocument): void {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(this.tipoProducto, doc.page.margins.left, undefined, { align: 'left' });
   }

   private printTableHeader(doc: typeof PDFDocument): void {
      doc.font('Helvetica-Bold').fontSize(11)
         .text('N', doc.page.margins.left, undefined, this.COL_N_OPTIONS)
         .moveUp()
         .text('Nombre Producto', this.X_NOM, undefined, this.COL_NOM_OPTIONS)
         .moveUp()
         .text('Precio Total', this.X_PRECIO, undefined, this.COL_PRECIO_OPTIONS)
         .moveUp()
         .text('Cantidad', this.X_CANT, undefined, this.COL_CANT_OPTIONS)
         .moveUp()
         .text('UM', this.X_UM, undefined, this.COL_N_OPTIONS)
         .moveUp()
         .text('Obs', this.X_OBS, undefined, this.COL_OBS_OPTIONS)
         .moveTo(doc.page.margins.left, doc.y - 3)
         .lineTo(doc.page.width - doc.page.margins.right, doc.y - 3)
         .stroke()
         .font('Helvetica').fontSize(11);
   }
}