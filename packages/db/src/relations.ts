import { relations } from "drizzle-orm/relations";
import { t99PEstado, t10MCliente, t40MListaPrecio, t10MEmpresa, t10MUsuario, t10MLocalCliente, t10PTipoUsuario, t20MPorcion, t20MProducto, t20PUnidadMedida, t20PMarca, t20PTipoProducto, t30MPedido, t30MProductoPedido, t40MVenta, t40MNotaCredito, t40MPrecioProducto, t40MProductoVenta, t40MProdNotaCredito, t40MRuta, t10PTipoDocto, t50MBodega, t50PTipoBodega, t50MCierreMensualBodega, t50MCierreMensualBodegaProducto, t50MMermas, t50MNivelProductoBodega, t50MProductoRecepcion, t50MRecepcionCompra, t70MProveedor, t50MStock, t60MPago } from "./schema";

export const t10MClienteRelations = relations(t10MCliente, ({one, many}) => ({
	t99PEstado: one(t99PEstado, {
		fields: [t10MCliente.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t40MListaPrecio: one(t40MListaPrecio, {
		fields: [t10MCliente.idListaPrecio],
		references: [t40MListaPrecio.idListaPrecio]
	}),
	t10MLocalClientes: many(t10MLocalCliente),
	t40MVentas: many(t40MVenta),
}));

export const t99PEstadoRelations = relations(t99PEstado, ({many}) => ({
	t10MClientes: many(t10MCliente),
	t10MEmpresas: many(t10MEmpresa),
	t10MLocalClientes: many(t10MLocalCliente),
	t10MUsuarios: many(t10MUsuario),
	t20MPorcions: many(t20MPorcion),
	t20MProductos: many(t20MProducto),
	t30MPedidos: many(t30MPedido),
	t40MNotaCreditos: many(t40MNotaCredito),
	t40MRutas: many(t40MRuta),
	t40MVentas: many(t40MVenta),
	t50MBodegas: many(t50MBodega),
	t50MRecepcionCompras: many(t50MRecepcionCompra),
	t70MProveedors: many(t70MProveedor),
}));

export const t40MListaPrecioRelations = relations(t40MListaPrecio, ({many}) => ({
	t10MClientes: many(t10MCliente),
	t30MPedidos: many(t30MPedido),
	t40MPrecioProductos: many(t40MPrecioProducto),
	t40MVentas: many(t40MVenta),
}));

export const t10MEmpresaRelations = relations(t10MEmpresa, ({one, many}) => ({
	t99PEstado: one(t99PEstado, {
		fields: [t10MEmpresa.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t10MEmpresa.idUsuarioMod],
		references: [t10MUsuario.idUsuario]
	}),
	t40MVentas: many(t40MVenta),
}));

export const t10MUsuarioRelations = relations(t10MUsuario, ({one, many}) => ({
	t10MEmpresas: many(t10MEmpresa),
	t99PEstado: one(t99PEstado, {
		fields: [t10MUsuario.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t10PTipoUsuario: one(t10PTipoUsuario, {
		fields: [t10MUsuario.idTipoUsuario],
		references: [t10PTipoUsuario.idTipoUsuario]
	}),
	t20MPorcions: many(t20MPorcion),
	t20MProductos: many(t20MProducto),
	t20PTipoProductos: many(t20PTipoProducto),
	t30MPedidos: many(t30MPedido),
	t40MNotaCreditos: many(t40MNotaCredito),
	t40MRutas: many(t40MRuta),
	t40MVentas: many(t40MVenta),
	t50MBodegas: many(t50MBodega),
	t50MCierreMensualBodegas: many(t50MCierreMensualBodega),
	t50MRecepcionCompras: many(t50MRecepcionCompra),
	t70MProveedors: many(t70MProveedor),
}));

export const t10MLocalClienteRelations = relations(t10MLocalCliente, ({one, many}) => ({
	t10MCliente: one(t10MCliente, {
		fields: [t10MLocalCliente.rutCliente],
		references: [t10MCliente.rutCliente]
	}),
	t99PEstado: one(t99PEstado, {
		fields: [t10MLocalCliente.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t30MPedidos: many(t30MPedido),
}));

export const t10PTipoUsuarioRelations = relations(t10PTipoUsuario, ({many}) => ({
	t10MUsuarios: many(t10MUsuario),
}));

export const t20MPorcionRelations = relations(t20MPorcion, ({one}) => ({
	t99PEstado: one(t99PEstado, {
		fields: [t20MPorcion.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t20MPorcion.idProducto],
		references: [t20MProducto.idProducto]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t20MPorcion.idUsuario],
		references: [t10MUsuario.idUsuario]
	}),
}));

export const t20MProductoRelations = relations(t20MProducto, ({one, many}) => ({
	t20MPorcions: many(t20MPorcion),
	t20PUnidadMedida: one(t20PUnidadMedida, {
		fields: [t20MProducto.idUm],
		references: [t20PUnidadMedida.idUm]
	}),
	t99PEstado: one(t99PEstado, {
		fields: [t20MProducto.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t20PMarca: one(t20PMarca, {
		fields: [t20MProducto.idMarca],
		references: [t20PMarca.idMarca]
	}),
	t20PTipoProducto: one(t20PTipoProducto, {
		fields: [t20MProducto.idTipoProducto],
		references: [t20PTipoProducto.idTipoProducto]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t20MProducto.idUsuarioMod],
		references: [t10MUsuario.idUsuario]
	}),
	t30MProductoPedidos: many(t30MProductoPedido),
	t40MPrecioProductos: many(t40MPrecioProducto),
	t40MProductoVentas: many(t40MProductoVenta),
	t40MProdNotaCreditos: many(t40MProdNotaCredito),
	t50MCierreMensualBodegaProductos: many(t50MCierreMensualBodegaProducto),
	t50MMermas: many(t50MMermas),
	t50MNivelProductoBodegas: many(t50MNivelProductoBodega),
	t50MProductoRecepcions: many(t50MProductoRecepcion),
	t50MStocks: many(t50MStock),
}));

export const t20PUnidadMedidaRelations = relations(t20PUnidadMedida, ({many}) => ({
	t20MProductos: many(t20MProducto),
}));

export const t20PMarcaRelations = relations(t20PMarca, ({many}) => ({
	t20MProductos: many(t20MProducto),
}));

export const t20PTipoProductoRelations = relations(t20PTipoProducto, ({one, many}) => ({
	t20MProductos: many(t20MProducto),
	t10MUsuario: one(t10MUsuario, {
		fields: [t20PTipoProducto.idUsuarioMod],
		references: [t10MUsuario.idUsuario]
	}),
}));

export const t30MPedidoRelations = relations(t30MPedido, ({one, many}) => ({
	t99PEstado: one(t99PEstado, {
		fields: [t30MPedido.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t40MListaPrecio: one(t40MListaPrecio, {
		fields: [t30MPedido.idListaPrecio],
		references: [t40MListaPrecio.idListaPrecio]
	}),
	t10MLocalCliente: one(t10MLocalCliente, {
		fields: [t30MPedido.idLocalCliente],
		references: [t10MLocalCliente.idLocalCliente]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t30MPedido.idUsuario],
		references: [t10MUsuario.idUsuario]
	}),
	t30MProductoPedidos: many(t30MProductoPedido),
}));

export const t30MProductoPedidoRelations = relations(t30MProductoPedido, ({one}) => ({
	t30MPedido: one(t30MPedido, {
		fields: [t30MProductoPedido.idPedido],
		references: [t30MPedido.idPedido]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t30MProductoPedido.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t40MNotaCreditoRelations = relations(t40MNotaCredito, ({one, many}) => ({
	t40MVenta: one(t40MVenta, {
		fields: [t40MNotaCredito.idVenta],
		references: [t40MVenta.idVenta]
	}),
	t99PEstado: one(t99PEstado, {
		fields: [t40MNotaCredito.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t40MNotaCredito.idUsuario],
		references: [t10MUsuario.idUsuario]
	}),
	t40MProdNotaCreditos: many(t40MProdNotaCredito),
}));

export const t40MVentaRelations = relations(t40MVenta, ({one, many}) => ({
	t40MNotaCreditos: many(t40MNotaCredito),
	t40MProductoVentas: many(t40MProductoVenta),
	t10MCliente: one(t10MCliente, {
		fields: [t40MVenta.rutCliente],
		references: [t10MCliente.rutCliente]
	}),
	t10MEmpresa: one(t10MEmpresa, {
		fields: [t40MVenta.rutEmpresa],
		references: [t10MEmpresa.rutEmpresa]
	}),
	t99PEstado: one(t99PEstado, {
		fields: [t40MVenta.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t40MListaPrecio: one(t40MListaPrecio, {
		fields: [t40MVenta.idListaPrecio],
		references: [t40MListaPrecio.idListaPrecio]
	}),
	t10PTipoDocto: one(t10PTipoDocto, {
		fields: [t40MVenta.idTipoDoctoEmitido],
		references: [t10PTipoDocto.idTipoDocto]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t40MVenta.idUsuarioVenta],
		references: [t10MUsuario.idUsuario]
	}),
}));

export const t40MPrecioProductoRelations = relations(t40MPrecioProducto, ({one}) => ({
	t40MListaPrecio: one(t40MListaPrecio, {
		fields: [t40MPrecioProducto.idListaPrecio],
		references: [t40MListaPrecio.idListaPrecio]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t40MPrecioProducto.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t40MProductoVentaRelations = relations(t40MProductoVenta, ({one}) => ({
	t40MVenta: one(t40MVenta, {
		fields: [t40MProductoVenta.idVenta],
		references: [t40MVenta.idVenta]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t40MProductoVenta.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t40MProdNotaCreditoRelations = relations(t40MProdNotaCredito, ({one}) => ({
	t40MNotaCredito: one(t40MNotaCredito, {
		fields: [t40MProdNotaCredito.idNotaCredito],
		references: [t40MNotaCredito.idNotaCredito]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t40MProdNotaCredito.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t40MRutaRelations = relations(t40MRuta, ({one}) => ({
	t99PEstado: one(t99PEstado, {
		fields: [t40MRuta.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t40MRuta.idUsuario],
		references: [t10MUsuario.idUsuario]
	}),
}));

export const t10PTipoDoctoRelations = relations(t10PTipoDocto, ({many}) => ({
	t40MVentas: many(t40MVenta),
	t50MRecepcionCompras: many(t50MRecepcionCompra),
	t60MPagos: many(t60MPago),
}));

export const t50MBodegaRelations = relations(t50MBodega, ({one, many}) => ({
	t99PEstado: one(t99PEstado, {
		fields: [t50MBodega.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t50PTipoBodega: one(t50PTipoBodega, {
		fields: [t50MBodega.idTipoBodega],
		references: [t50PTipoBodega.idTipoBodega]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t50MBodega.idUsuarioMod],
		references: [t10MUsuario.idUsuario]
	}),
	t50MCierreMensualBodegas: many(t50MCierreMensualBodega),
	t50MMermas: many(t50MMermas),
	t50MNivelProductoBodegas: many(t50MNivelProductoBodega),
	t50MRecepcionCompras: many(t50MRecepcionCompra),
	t50MStocks: many(t50MStock),
}));

export const t50PTipoBodegaRelations = relations(t50PTipoBodega, ({many}) => ({
	t50MBodegas: many(t50MBodega),
}));

export const t50MCierreMensualBodegaRelations = relations(t50MCierreMensualBodega, ({one, many}) => ({
	t50MBodega: one(t50MBodega, {
		fields: [t50MCierreMensualBodega.idBodega],
		references: [t50MBodega.idBodega]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t50MCierreMensualBodega.idUsuarioCierre],
		references: [t10MUsuario.idUsuario]
	}),
	t50MCierreMensualBodegaProductos: many(t50MCierreMensualBodegaProducto),
}));

export const t50MCierreMensualBodegaProductoRelations = relations(t50MCierreMensualBodegaProducto, ({one}) => ({
	t50MCierreMensualBodega: one(t50MCierreMensualBodega, {
		fields: [t50MCierreMensualBodegaProducto.anio, t50MCierreMensualBodegaProducto.mes, t50MCierreMensualBodegaProducto.idBodega],
		references: [t50MCierreMensualBodega.anio, t50MCierreMensualBodega.mes, t50MCierreMensualBodega.idBodega]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t50MCierreMensualBodegaProducto.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t50MMermasRelations = relations(t50MMermas, ({one}) => ({
	t50MBodega: one(t50MBodega, {
		fields: [t50MMermas.idBodega],
		references: [t50MBodega.idBodega]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t50MMermas.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t50MNivelProductoBodegaRelations = relations(t50MNivelProductoBodega, ({one}) => ({
	t50MBodega: one(t50MBodega, {
		fields: [t50MNivelProductoBodega.idBodega],
		references: [t50MBodega.idBodega]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t50MNivelProductoBodega.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t50MProductoRecepcionRelations = relations(t50MProductoRecepcion, ({one}) => ({
	t20MProducto: one(t20MProducto, {
		fields: [t50MProductoRecepcion.idProducto],
		references: [t20MProducto.idProducto]
	}),
	t50MRecepcionCompra: one(t50MRecepcionCompra, {
		fields: [t50MProductoRecepcion.idRecepcion],
		references: [t50MRecepcionCompra.idRecepcion]
	}),
}));

export const t50MRecepcionCompraRelations = relations(t50MRecepcionCompra, ({one, many}) => ({
	t50MProductoRecepcions: many(t50MProductoRecepcion),
	t50MBodega: one(t50MBodega, {
		fields: [t50MRecepcionCompra.idBodega],
		references: [t50MBodega.idBodega]
	}),
	t99PEstado: one(t99PEstado, {
		fields: [t50MRecepcionCompra.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t70MProveedor: one(t70MProveedor, {
		fields: [t50MRecepcionCompra.rutProveedor],
		references: [t70MProveedor.rutProveedor]
	}),
	t10PTipoDocto: one(t10PTipoDocto, {
		fields: [t50MRecepcionCompra.idTipoDocto],
		references: [t10PTipoDocto.idTipoDocto]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t50MRecepcionCompra.idUsuarioRecepcion],
		references: [t10MUsuario.idUsuario]
	}),
}));

export const t70MProveedorRelations = relations(t70MProveedor, ({one, many}) => ({
	t50MRecepcionCompras: many(t50MRecepcionCompra),
	t99PEstado: one(t99PEstado, {
		fields: [t70MProveedor.idEstado],
		references: [t99PEstado.idEstado]
	}),
	t10MUsuario: one(t10MUsuario, {
		fields: [t70MProveedor.idUsuarioMod],
		references: [t10MUsuario.idUsuario]
	}),
}));

export const t50MStockRelations = relations(t50MStock, ({one}) => ({
	t50MBodega: one(t50MBodega, {
		fields: [t50MStock.idBodega],
		references: [t50MBodega.idBodega]
	}),
	t20MProducto: one(t20MProducto, {
		fields: [t50MStock.idProducto],
		references: [t20MProducto.idProducto]
	}),
}));

export const t60MPagoRelations = relations(t60MPago, ({one}) => ({
	t10PTipoDocto: one(t10PTipoDocto, {
		fields: [t60MPago.idFormaPago],
		references: [t10PTipoDocto.idTipoDocto]
	}),
}));
