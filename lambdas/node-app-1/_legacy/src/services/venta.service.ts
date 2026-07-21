import { ClienteRepo, EmpresaRepo, ImpuestoRepo, LocalRepo, PedidoRepo, ProductoPedidoRepo, ProductoVentaRepo, StockRepo, VentaRepo } from "../config/bd.sequelize";
import { Pedido } from '../model/pedido.model';
import { Local } from '../model/local.model';
import { Usuario } from '../model/usuario.model';
import { Cliente } from '../model/cliente.model';
import { Venta } from '../model/venta.model';
import { RequestError } from '../error/error';
import { ProductoPedido } from '../model/producto.pedido.model';
import { Producto } from '../model/producto.model';
import { PrefacturaReq } from '../request/prefactura.request';
import { EstadoEnum } from "../model/estado.enum";
import { ImpuestoEnum } from "../model/impuesto.enum";
import { Stock } from "../model/stock.model";
import { BodegaEnum } from "../model/bodega.enum";
import { TipoDoctoEnum } from "../model/tipo.docto.enum";
import { ProductoVenta } from "../model/producto.venta.model";
import { ne } from "sequelize/types/lib/operators";
import { logger } from "../config/winston";
import { PrefacturaResp } from "../response/venta.response";
import { Op } from "sequelize";

export class VentaService {

   public static findAll = async (): Promise<Venta[]> => {
      return [];
      /*return await PedidoRepo.findAll({
         where: {
            idEstado: ESTADO_ACTIVO
         },
         include: [{
            model: Local,
            as: 'local',
            attributes: ['nomLocal', 'nomContacto', 'apePatContacto', 'apeMatContacto'],
            required: true,
            include: [{
               model: Cliente,
               as: 'cliente',
               attributes: ['rutCliente', 'dvCliente', 'nomFantasia']
            }]
         }, {
            model: Usuario,
            as: 'vendedor',
            attributes: ['nombre', 'apPaterno', 'apMaterno'],
            required: true
         }]
      });*/
   }

   public static prefacturar = async (prefactura: PrefacturaReq, idUsuario: number): Promise<PrefacturaResp> => {
      if ( !prefactura || isNaN(prefactura.idPedido) ) throw new RequestError(`IdPedido debe ser de tipo 'entero'`);

      let venta = await VentaRepo.findOne({
         where: {
            idPedido: prefactura.idPedido,
            idEstado: {
               [Op.ne]: EstadoEnum.ANULADO
            }
         }
      });
      if ( venta ) throw new RequestError(`Pedido [${prefactura.idPedido}] se encuentra asociado a Venta [${venta.idVenta}] factura n° ${venta.numDoctoEmitido}`);
      
      let pedido = await PedidoRepo.findByPk( prefactura.idPedido );
      if ( !pedido ) throw new RequestError(`Pedido [${prefactura.idPedido}] no existe`);
      if ( pedido.idEstado !== EstadoEnum.ACTIVO ) throw new RequestError(`Pedido [${prefactura.idPedido}] no se encuentra activo`);

      // const ultNumDocto = VentaRepo.max('', {
      //    where: {
      //       rutEmpresa: prefactura.rutEmpresa
      //    }
      // });

      const tienePorciones = await ProductoPedidoRepo.findOne({
         where: {
            idPedido: prefactura.idPedido
         },
         include: [{
           model: Producto,
           as: 'producto',
           where: {
             usaPorciones: true
           }
         }]
      });
      if ( tienePorciones ) throw new RequestError(`Pedido [${prefactura.idPedido}] contiene productos porcionados`);

      const prodsPedido = await ProductoPedidoRepo.findAll({
         where: {
            idPedido: prefactura.idPedido
         },
         include: [{
            model: Producto,
            as: 'producto',
            include: [{
               model: Stock,
               as: 'stocks',
               required: false,
               where: {
                  idBodega: BodegaEnum.CENTRAL
               }
            }]
         }]
      });
      
      const iva = await ImpuestoRepo.findByPk( ImpuestoEnum.IVA );
      if ( !iva ) throw new RequestError(`IVA no existe`);
      const espec = await ImpuestoRepo.findByPk( ImpuestoEnum.ESPEC );
      if ( !espec ) throw new RequestError(`ESPEC no existe`);

      let montoNetoTotal = 0;
      let montoILA = 0;
      let montoESPEC = 0;
      let prodsVenta: ProductoPedido[] = [];
      let mensajes: string[] = [];
      for ( const prodPedido of prodsPedido ) {
         // Si no existe registro de stock no se agrega el producto a la venta
         if ( prodPedido.producto?.stocks?.length === 0 ) {
            const mensaje = `Pedido [${prefactura.idPedido}] producto [${prodPedido.producto.codSerfel}] no tiene stock`;
            mensajes.push(mensaje);
            logger.info(mensaje);
            continue;
         }

         // Se asigna a la venta la cantidad max de stock disponible, en caso que la cantidad del pedido sea mayor
         let cantStock = 0;
         prodPedido.producto?.stocks?.forEach((stock: Stock) => {
            cantStock = stock.cantidad;
         });
         // Si no hay stock disponible no se agrega el producto a la venta
         if ( cantStock == 0 ) {
            const mensaje = `Pedido [${prefactura.idPedido}] producto [${prodPedido.producto?.codSerfel}] no tiene stock disponible`;
            mensajes.push(mensaje);
            logger.info(mensaje);
            continue;
         }
         //logger.info(`Producto [${prodPedido.idProducto}] cantidad [${prodPedido.cantidad}]. Stock: ${cantStock}`)
         // En caso de que el stock no sea suficiente se asigna el máximo disponible
         if ( parseFloat(cantStock.toString()) < parseFloat(prodPedido.cantidad.toString()) ) {
            const mensaje = `Pedido [${prefactura.idPedido}] se altero cantidad de producto [${prodPedido.producto?.codSerfel}] de ${prodPedido.cantidad} a ${cantStock}`;
            mensajes.push(mensaje);
            logger.info(mensaje);
            prodPedido.cantidad = cantStock;
         }

         const subTotal = VentaService.subTotal(prodPedido.cantidad, prodPedido.precioNeto);
         const subTotalConDesc = VentaService.subTotalConDesc(subTotal, prodPedido.porcenDesc);
         montoNetoTotal += subTotalConDesc;
         
         //const producto = await Producto.findByPk(prodPedido.idProducto);
         const producto = prodPedido.producto;
         if (producto && producto.impuesto === ImpuestoEnum.ESPEC && espec) {
            montoESPEC += Math.round(subTotalConDesc * espec.valor / 100);
         } else if (producto && producto.impuesto > 0) {
            const impuesto = await ImpuestoRepo.findByPk(producto.impuesto);
            if (impuesto) {
               montoILA += Math.round(subTotalConDesc * impuesto.valor / 100);
            }
         }
         prodsVenta.push(prodPedido);
      }

      const local = await LocalRepo.findByPk( pedido.idLocal );
      if ( !local ) throw new RequestError(`Local [${pedido.idLocal}] no existe`);
      const cliente = await ClienteRepo.findByPk( local.rutCliente );
      if ( !cliente ) throw new RequestError(`Cliente [${local.rutCliente}] no existe`);
      const empresa = await EmpresaRepo.findByPk( prefactura.rutEmpresa );
      if ( !empresa ) throw new RequestError(`Empresa [${prefactura.rutEmpresa}] no existe`);

      venta = VentaRepo.build();
      venta.idPedido = prefactura.idPedido;
      venta.idUsuarioMod = idUsuario;
      venta.fecha = new Date();
      venta.rutCliente = local.rutCliente;
      venta.idLocal = pedido.idLocal;
      venta.idTipoDoctoEmitido = TipoDoctoEnum.FACTURA;
      venta.numDoctoEmitido = 0;
      venta.idFormaPago = local.idFormaPago;
      venta.idUsuarioVenta = pedido.idUsuario;
      venta.idListaPrecio = cliente.idListaPrecio;
      //venta.idListaPrecio = pedido.idListaPrecio;
      venta.idEstado = EstadoEnum.FINALIZADO;
      venta.rutEmpresa = prefactura.rutEmpresa;
      venta.iva = Math.round(montoNetoTotal * iva.valor / 100);
      venta.espec = montoESPEC;
      venta.iaba = montoILA;
      venta.subTotal = montoNetoTotal;
      venta.precioTotal = montoNetoTotal + montoESPEC + montoILA + venta.iva;
      venta.idUsuarioMod = idUsuario;
      venta.ultFechaMod = new Date();
      await venta.save();
      logger.info('Venta creada', {idPedido: prefactura.idPedido, idVenta: venta.idVenta});

      const clienteEmpresaInterna = await EmpresaRepo.findByPk( venta.rutCliente );
      for ( const prodPedido of prodsVenta ) {
         let prodVenta = ProductoVentaRepo.build();
         prodVenta.idVenta = venta.idVenta;
         prodVenta.idProducto = prodPedido.idProducto;
         prodVenta.cantidad = prodPedido.cantidad;
         prodVenta.precio = prodPedido.precioNeto;  // Este precio es el neto hoy, deberia ser con impuestos agregados
         prodVenta.porcenDesc = prodPedido.porcenDesc;
         prodVenta.precioNeto = prodPedido.precioNeto;
         await prodVenta.save();

         // 20160901 Se solicito que las ventas a empresas internas no descuenten Stock
         if ( prodVenta && !clienteEmpresaInterna ) {
            await StockRepo.reduceStock(BodegaEnum.CENTRAL, prodVenta.idProducto, prodVenta.cantidad);
         }
      }

      pedido.idEstado = EstadoEnum.FINALIZADO;
      await pedido.save();

      return new PrefacturaResp(venta, mensajes);
   }

   public static subTotal = (cantidad: number, precio: number): number => {
      return Math.round(cantidad * precio);
   }
  
   public static montoDescSubTotal = (subTotal: number, porcenDesc: number): number => {
      return Math.round(subTotal * porcenDesc / 100);
   }
  
   public static subTotalConDesc = (subTotal: number, porcenDesc: number): number => {
      const montoDesc = VentaService.montoDescSubTotal(subTotal, porcenDesc);
      return subTotal - montoDesc;
   }
  
   public static montoDescuento = (precio: number, porcenDesc: number): number => {
      return Math.round(precio * porcenDesc / 100);
   }
}