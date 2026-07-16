import { mysqlTable, foreignKey, int, varchar, datetime, index, date, decimal, smallint, tinyint, primaryKey } from "drizzle-orm/mysql-core"

// NOTE: JS identifiers cannot start with a digit; legacy table names like "10_m_cliente" are
// prefixed with "t" in the variable name only. SQL table/column names are preserved verbatim.
//
// Manual adjustments from drizzle-kit introspection output:
// 1. All export identifiers prefixed with "t" — JS identifiers cannot start with digits.
// 2. Added primaryKey() constraints — drizzle-kit missed them (legacy dump uses separate ALTER TABLE).
// 3. Added tinyint to imports — was used but not imported.
// 4. Added primaryKey to imports — needed for composite/single PK declarations.
// 5. bit(1) column usa_porciones on 20_m_producto was commented-out by drizzle-kit; restored as tinyint(1).
// 6. .default('NULL') patterns replaced with nullable columns (drop default, column already nullable).
// 7. .default('\'') patterns replaced with .default('') — drizzle-kit escaped the empty-string default incorrectly.
// 8. anio JS property name used for the "año" column in cierre tables — "ñ" in a compound PK reference
//    caused invalid object-member syntax; property renamed to anio while SQL column name stays "año".
// 9. Removed unused `mysqlSchema` import that drizzle-kit included by default.
// 10. All inline .references() FK calls converted to explicit table-level foreignKey({name: "..."})
//     entries using legacy constraint names from the original dump, ensuring migration SQL names ≤64 chars
//     and match the snapshot JSON exactly.
// 11. Tables reordered in topological dependency order to eliminate forward references (required because
//     foreignKey() evaluates foreignColumns eagerly, unlike the .references() lambda approach).

// ── Leaf tables (no FK dependencies) ──────────────────────────────────────────

export const t10PTipoDocto = mysqlTable("10_p_tipo_docto", {
	idTipoDocto: int("id_tipo_docto").notNull(),
	nomTipoDocto: varchar("nom_tipo_docto", { length: 35 }).notNull(),
	descTipoDocto: varchar("desc_tipo_docto", { length: 150 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idTipoDocto], name: "PRIMARY" }),
]);

export const t10PTipoUsuario = mysqlTable("10_p_tipo_usuario", {
	idTipoUsuario: int("id_tipo_usuario").notNull(),
	nomTipoUsuario: varchar("nom_tipo_usuario", { length: 15 }).notNull(),
	descTipoUsuario: varchar("desc_tipo_usuario", { length: 50 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idTipoUsuario], name: "PRIMARY" }),
]);

export const t20PMarca = mysqlTable("20_p_marca", {
	idMarca: int("id_marca").notNull(),
	nomMarca: varchar("nom_marca", { length: 50 }).notNull(),
	descMarca: varchar("desc_marca", { length: 200 }).default('').notNull(),
},
(table) => [
	primaryKey({ columns: [table.idMarca], name: "PRIMARY" }),
]);

export const t20PUnidadMedida = mysqlTable("20_p_unidad_medida", {
	idUm: int("id_UM").notNull(),
	nomUm: varchar("nom_UM", { length: 15 }).notNull(),
	descUm: varchar("desc_UM", { length: 150 }).default('').notNull(),
},
(table) => [
	primaryKey({ columns: [table.idUm], name: "PRIMARY" }),
]);

export const t40MListaPrecio = mysqlTable("40_m_lista_precio", {
	idListaPrecio: int("id_lista_precio").notNull(),
	nomListaPrecio: varchar("nom_lista_precio", { length: 15 }).notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idListaPrecio], name: "PRIMARY" }),
]);

export const t40MMotivoNotaCredito = mysqlTable("40_m_motivo_nota_credito", {
	idMotivo: int("id_motivo").notNull(),
	nomMotivo: varchar("nom_motivo", { length: 50 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idMotivo], name: "PRIMARY" }),
]);

export const t40MNotaCreditoCompra = mysqlTable("40_m_nota_credito_compra", {
	idNcCompra: int("id_nc_compra").autoincrement().notNull(),
	idRecepcion: int("id_recepcion").notNull(),
	numNcCompra: int("num_nc_compra").notNull(),
	fechaNcCompra: datetime("fecha_nc_compra", { mode: 'string'}).notNull(),
	idTipoDocto: int("id_tipo_docto").notNull(),
	iva: int("iva").notNull(),
	iaba: int("iaba").notNull(),
	espec: int("espec").notNull(),
	subtotal: int("subtotal").notNull(),
	precioTotal: int("precio_total").notNull(),
	idUsuario: int("id_usuario").notNull(),
	idEstado: int("id_estado").notNull(),
	urlPdf: varchar("url_PDF", { length: 255 }).notNull(),
	codRefNde: smallint("cod_ref_nde").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idNcCompra], name: "PRIMARY" }),
]);

export const t40MNotaDebito = mysqlTable("40_m_nota_debito", {
	idNotaDebito: int("id_nota_debito").autoincrement().notNull(),
	idNotaCredito: int("id_nota_credito").notNull(),
	numNotaDebitoElect: int("num_nota_debito_elect").notNull(),
	rutEmpresa: int("rut_empresa").notNull(),
	iva: int("iva").notNull(),
	iaba: int("iaba").notNull(),
	espec: int("espec").notNull(),
	subtotal: int("subtotal").notNull(),
	idUsuario: int("id_usuario").notNull(),
	fechaNotaDebito: datetime("fecha_nota_debito", { mode: 'string'}).notNull(),
	precioTotal: int("precio_total").notNull(),
	idEstado: int("id_estado").notNull(),
	urlPdf: varchar("url_PDF", { length: 255 }).notNull(),
	codRefNde: smallint("cod_ref_nde").notNull(),
	idFolio: int("id_folio").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idNotaDebito], name: "PRIMARY" }),
]);

export const t40MProductoDevolucion = mysqlTable("40_m_producto_devolucion", {
	idVenta: int("id_venta").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	idUsuario: int("id_usuario").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idVenta, table.idProducto], name: "PRIMARY" }),
]);

export const t40MProdNotaCreditoCompra = mysqlTable("40_m_prod_nota_credito_compra", {
	idNcCompra: int("id_nc_compra").autoincrement().notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	precio: int("precio").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idNcCompra, table.idProducto], name: "PRIMARY" }),
	index("prod_nota_prod").on(table.idProducto),
]);

export const t40MRutaLocalCliente = mysqlTable("40_m_ruta_local_cliente", {
	idRuta: int("id_ruta").notNull(),
	idLocalCliente: int("id_local_cliente").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idRuta, table.idLocalCliente], name: "PRIMARY" }),
]);

export const t40PFormaPago = mysqlTable("40_p_forma_pago", {
	idFormaPago: int("id_forma_pago").notNull(),
	nomFormaPago: varchar("nom_forma_pago", { length: 15 }).notNull(),
	descFormaPago: varchar("desc_forma_pago", { length: 150 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idFormaPago], name: "PRIMARY" }),
]);

export const t50PTipoBodega = mysqlTable("50_p_tipo_bodega", {
	idTipoBodega: int("id_tipo_bodega").notNull(),
	nomTipoBodega: varchar("nom_tipo_bodega", { length: 15 }).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idTipoBodega], name: "PRIMARY" }),
]);

export const t99PEstado = mysqlTable("99_p_estado", {
	idEstado: int("id_estado").notNull(),
	nomEstado: varchar("nom_estado", { length: 15 }).notNull(),
	descEstado: varchar("desc_estado", { length: 200 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idEstado], name: "PRIMARY" }),
]);

export const t99PEstadoPago = mysqlTable("99_p_estado_pago", {
	idEstadoPago: tinyint("id_estado_pago").notNull(),
	nomEstadoPago: varchar("nom_estado_pago", { length: 15 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idEstadoPago], name: "PRIMARY" }),
]);

export const t99PImpuesto = mysqlTable("99_p_impuesto", {
	idImpuesto: int("id_impuesto").notNull(),
	nomImpuesto: varchar("nom_impuesto", { length: 20 }).notNull(),
	valor: int("valor").notNull(),
	idImpIss: int("id_imp_iss").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idImpuesto], name: "PRIMARY" }),
]);

export const t99PIva = mysqlTable("99_p_iva", {
	iva: int("iva").notNull(),
},
(table) => [
	primaryKey({ columns: [table.iva], name: "PRIMARY" }),
]);

// ── Single-level FK tables ─────────────────────────────────────────────────────

export const t60MPago = mysqlTable("60_m_pago", {
	idPago: int("id_pago").autoincrement().notNull(),
	idVenta: int("id_venta").notNull(),
	fecha: datetime("fecha", { mode: 'string'}).notNull(),
	monto: int("monto").notNull(),
	idFormaPago: int("id_forma_pago").notNull(),
	observaciones: varchar("observaciones", { length: 50 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idPago], name: "PRIMARY" }),
	index("fk_pago_venta").on(table.idVenta),
	foreignKey({ name: "fk_pago_tipo_docto", columns: [table.idFormaPago], foreignColumns: [t10PTipoDocto.idTipoDocto] }).onDelete("cascade").onUpdate("restrict"),
]);

export const t10MUsuario = mysqlTable("10_m_usuario", {
	idUsuario: int("id_usuario").notNull(),
	rutUsuario: int("rut_usuario").notNull(),
	dvUsuario: varchar("dv_usuario", { length: 1 }).notNull(),
	nomUsuario: varchar("nom_usuario", { length: 50 }).notNull(),
	apellPatUsuario: varchar("apell_pat_usuario", { length: 30 }).notNull(),
	apellMatUsuario: varchar("apell_mat_usuario", { length: 30 }).notNull(),
	password: varchar("password", { length: 50 }).notNull(),
	idTipoUsuario: int("id_tipo_usuario").notNull(),
	telefonoUsuario: varchar("telefono_usuario", { length: 15 }),
	direccionUsuario: varchar("direccion_usuario", { length: 200 }).notNull(),
	emailUsuario: varchar("email_usuario", { length: 50 }),
	numUsuario: int("num_usuario").default(0).notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
	fechaActProductos: datetime("fecha_act_productos", { mode: 'string'}),
},
(table) => [
	primaryKey({ columns: [table.idUsuario], name: "PRIMARY" }),
	foreignKey({ name: "usu_tipo_usu", columns: [table.idTipoUsuario], foreignColumns: [t10PTipoUsuario.idTipoUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "usu_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t10MCliente = mysqlTable("10_m_cliente", {
	rutCliente: int("rut_cliente").notNull(),
	dvCliente: varchar("dv_cliente", { length: 1 }).notNull(),
	razonSocial: varchar("razon_social", { length: 50 }).notNull(),
	nomFantasia: varchar("nom_fantasia", { length: 50 }).default('').notNull(),
	telefonoCliente: varchar("telefono_cliente", { length: 15 }),
	direccionCliente: varchar("direccion_cliente", { length: 200 }).default('').notNull(),
	comuna: varchar("comuna", { length: 20 }).default('').notNull(),
	ciudad: varchar("ciudad", { length: 25 }).default('').notNull(),
	emailCliente: varchar("email_cliente", { length: 50 }),
	idListaPrecio: int("id_lista_precio").default(1).notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
	permiteVentaDeuda: tinyint("permite_venta_deuda").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.rutCliente], name: "PRIMARY" }),
	foreignKey({ name: "clie_list_prec", columns: [table.idListaPrecio], foreignColumns: [t40MListaPrecio.idListaPrecio] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "clie_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t10MLocalCliente = mysqlTable("10_m_local_cliente", {
	idLocalCliente: int("id_local_cliente").notNull(),
	rutCliente: int("rut_cliente").notNull(),
	nomLocalCliente: varchar("nom_local_cliente", { length: 30 }).notNull(),
	telefonoLocalCliente: varchar("telefono_local_cliente", { length: 15 }),
	direccionLocalCliente: varchar("direccion_local_cliente", { length: 200 }).default(''),
	comunaLocalCliente: varchar("comuna_local_cliente", { length: 30 }).default(''),
	emailLocalCliente: varchar("email_local_cliente", { length: 50 }),
	giro: varchar("giro", { length: 30 }).default(''),
	nomContacto: varchar("nom_contacto", { length: 50 }).default(''),
	apellPatContacto: varchar("apell_pat_contacto", { length: 30 }).default(''),
	apellMatContacto: varchar("apell_mat_contacto", { length: 30 }).default(''),
	telefonoContacto: varchar("telefono_contacto", { length: 15 }),
	emailContacto: varchar("email_contacto", { length: 50 }),
	topeVenta: int("tope_venta").default(0).notNull(),
	topeCredito: int("tope_credito").default(0).notNull(),
	idVendedor: int("id_vendedor").default(5).notNull(),
	idFormaPago: int("id_forma_pago").default(7).notNull(),
	comuna: varchar("comuna", { length: 20 }).default(''),
	observaciones: varchar("observaciones", { length: 200 }).default(''),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
	permiteVentaTopeMensual: tinyint("permite_venta_tope_mensual").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idLocalCliente], name: "PRIMARY" }),
	foreignKey({ name: "loc_clie_clie", columns: [table.rutCliente], foreignColumns: [t10MCliente.rutCliente] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "loc_clie_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t10MEmpresa = mysqlTable("10_m_empresa", {
	rutEmpresa: int("rut_empresa").notNull(),
	dvEmpresa: varchar("dv_empresa", { length: 1 }).notNull(),
	razonSocial: varchar("razon_social", { length: 50 }).notNull(),
	nomFantasia: varchar("nom_fantasia", { length: 50 }).notNull(),
	direccionEmpresa: varchar("direccion_empresa", { length: 255 }).notNull(),
	accesoRapido: int("acceso_rapido").default(0).notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
	giro: varchar("giro", { length: 100 }).notNull(),
	codActividadEconomica: int("cod_actividad_economica").notNull(),
	comuna: varchar("comuna", { length: 25 }).notNull(),
	ciudad: varchar("ciudad", { length: 25 }).notNull(),
	rutRepresentanteLegal: int("rut_representante_legal").notNull(),
	dvRepresentanteLegal: varchar("dv_representante_legal", { length: 1 }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	fechaAprobacionSii: date("fecha_aprobacion_SII", { mode: 'string' }).notNull(),
	numAprobacionSii: int("num_aprobacion_SII").notNull(),
},
(table) => [
	primaryKey({ columns: [table.rutEmpresa, table.ultFechaMod], name: "PRIMARY" }),
	index("rut_empresa").on(table.rutEmpresa),
	foreignKey({ name: "emp_usu", columns: [table.idUsuarioMod], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "emp_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t20PTipoProducto = mysqlTable("20_p_tipo_producto", {
	idTipoProducto: int("id_tipo_producto").notNull(),
	nomTipoProducto: varchar("nom_tipo_producto", { length: 15 }).notNull(),
	descTipoProducto: varchar("desc_tipo_producto", { length: 200 }).default('').notNull(),
	nivel1: int("nivel_1").default(0).notNull(),
	nivel2: int("nivel_2").default(0).notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idTipoProducto], name: "PRIMARY" }),
	index("niv1_tipo_pro").on(table.nivel1),
	foreignKey({ name: "tipo_pro_usu", columns: [table.idUsuarioMod], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t40MRuta = mysqlTable("40_m_ruta", {
	idRuta: int("id_ruta").notNull(),
	nomRuta: varchar("nom_ruta", { length: 50 }).default('').notNull(),
	idUsuario: int("id_usuario").notNull(),
	numDia: int("num_dia").notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idRuta], name: "PRIMARY" }),
	foreignKey({ name: "ruta_usu", columns: [table.idUsuario], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "ruta_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MBodega = mysqlTable("50_m_bodega", {
	idBodega: int("id_bodega").notNull(),
	nomBodega: varchar("nom_bodega", { length: 30 }).notNull(),
	descBodega: varchar("desc_bodega", { length: 200 }).notNull(),
	idTipoBodega: int("id_tipo_bodega").notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idBodega], name: "PRIMARY" }),
	foreignKey({ name: "bod_tipo_bod", columns: [table.idTipoBodega], foreignColumns: [t50PTipoBodega.idTipoBodega] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "bod_usu_mod", columns: [table.idUsuarioMod], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "bod_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t70MProveedor = mysqlTable("70_m_proveedor", {
	rutProveedor: int("rut_proveedor").notNull(),
	dvProveedor: varchar("dv_proveedor", { length: 1 }).notNull(),
	razonSocial: varchar("razon_social", { length: 50 }).notNull(),
	nomFantasia: varchar("nom_fantasia", { length: 50 }).notNull(),
	direccionProveedor: varchar("direccion_proveedor", { length: 200 }).notNull(),
	giro: varchar("giro", { length: 100 }),
	fono1: varchar("fono_1", { length: 15 }),
	fono2: varchar("fono_2", { length: 15 }),
	email: varchar("email", { length: 50 }),
	condPago: varchar("cond_pago", { length: 50 }),
	glosaPago: varchar("glosa_pago", { length: 50 }),
	nomVendedor: varchar("nom_vendedor", { length: 200 }),
	fonoVendedor: varchar("fono_vendedor", { length: 15 }),
	emailVendedor: varchar("email_vendedor", { length: 50 }),
	observaciones: varchar("observaciones", { length: 200 }),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.rutProveedor], name: "PRIMARY" }),
	foreignKey({ name: "prov_usu", columns: [table.idUsuarioMod], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prov_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

// ── Multi-level FK tables ──────────────────────────────────────────────────────

export const t30MPedido = mysqlTable("30_m_pedido", {
	idPedido: int("id_pedido").notNull(),
	fechaPedido: datetime("fecha_pedido", { mode: 'string'}).notNull(),
	idLocalCliente: int("id_local_cliente").notNull(),
	diaRuta: int("dia_ruta").default(0).notNull(),
	idFormaPago: int("id_forma_pago").default(0).notNull(),
	tiempo: int("tiempo").default(0).notNull(),
	precioTotal: int("precio_total").notNull(),
	idUsuario: int("id_usuario").default(5).notNull(),
	idListaPrecio: int("id_lista_precio").notNull(),
	idEstado: int("id_estado").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idPedido], name: "PRIMARY" }),
	foreignKey({ name: "ped_loc_clie", columns: [table.idLocalCliente], foreignColumns: [t10MLocalCliente.idLocalCliente] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "ped_usu", columns: [table.idUsuario], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "ped_lis_prec", columns: [table.idListaPrecio], foreignColumns: [t40MListaPrecio.idListaPrecio] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "ped_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t40MVenta = mysqlTable("40_m_venta", {
	idVenta: int("id_venta").autoincrement().notNull(),
	idListaPrecio: int("id_lista_precio").notNull(),
	idUsuarioVenta: int("id_usuario_venta").notNull(),
	iva: int("iva").default(0).notNull(),
	iaba: int("iaba").default(0).notNull(),
	espec: int("espec").default(0).notNull(),
	subTotal: int("sub_total").default(0).notNull(),
	precioTotal: int("precio_total").notNull(),
	numDoctoEmitido: int("num_docto_emitido").notNull(),
	idTipoDoctoEmitido: int("id_tipo_docto_emitido").notNull(),
	rutEmpresa: int("rut_empresa").notNull(),
	rutCliente: int("rut_cliente").notNull(),
	idLocalCliente: int("id_local_cliente").notNull(),
	idFormaPago: int("id_forma_pago").default(0).notNull(),
	idPedido: int("id_pedido").default(0).notNull(),
	fechaVenta: datetime("fecha_venta", { mode: 'string'}).notNull(),
	entregado: int("entregado").default(0).notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").notNull(),
	idFolio: int("id_folio").default(0).notNull(),
	urlPdf: varchar("url_PDF", { length: 255 }).default('').notNull(),
	urlPdfOriginal: varchar("url_PDF_original", { length: 100 }).default('').notNull(),
	urlPdfCedible: varchar("url_PDF_cedible", { length: 100 }).default('').notNull(),
	observaciones: varchar("observaciones", { length: 150 }).default('').notNull(),
	periodoLibro: varchar("periodo_libro", { length: 255 }).default('').notNull(),
	idEstadoPago: tinyint("id_estado_pago").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idVenta], name: "PRIMARY" }),
	index("venta_ped").on(table.idPedido),
	index("IDX_idLocalClienteFechaVenta").on(table.idLocalCliente, table.fechaVenta),
	foreignKey({ name: "venta_lis_prec", columns: [table.idListaPrecio], foreignColumns: [t40MListaPrecio.idListaPrecio] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "venta_usu", columns: [table.idUsuarioVenta], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "venta_tipo_docto", columns: [table.idTipoDoctoEmitido], foreignColumns: [t10PTipoDocto.idTipoDocto] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "venta_emp", columns: [table.rutEmpresa], foreignColumns: [t10MEmpresa.rutEmpresa] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "venta_clie", columns: [table.rutCliente], foreignColumns: [t10MCliente.rutCliente] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "venta_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t20MProducto = mysqlTable("20_m_producto", {
	idProducto: int("id_producto").autoincrement().notNull(),
	nomProducto: varchar("nom_producto", { length: 200 }).notNull(),
	descProducto: varchar("desc_producto", { length: 200 }).notNull(),
	codBarraProducto: varchar("cod_barra_producto", { length: 200 }).notNull(),
	idTipoProducto: int("id_tipo_producto").notNull(),
	idMarca: int("id_marca").notNull(),
	idUm: int("id_UM").notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
	costoProm: decimal("costo_prom", { precision: 18, scale: 2 }).default('0.00'),
	ultFechaCompra: datetime("ult_fecha_compra", { mode: 'string'}),
	codSerfel: int("cod_serfel").default(0).notNull(),
	impuesto: int("impuesto").default(0).notNull(),
	// bit(1) mapped to tinyint(1) — drizzle-kit could not parse bit(1) natively
	usaPorciones: tinyint("usa_porciones").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idProducto], name: "PRIMARY" }),
	index("ind_serfel").on(table.codSerfel),
	index("ind_nombre").on(table.nomProducto),
	foreignKey({ name: "prod_tipo_prod", columns: [table.idTipoProducto], foreignColumns: [t20PTipoProducto.idTipoProducto] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_marca", columns: [table.idMarca], foreignColumns: [t20PMarca.idMarca] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_UM", columns: [table.idUm], foreignColumns: [t20PUnidadMedida.idUm] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_usu", columns: [table.idUsuarioMod], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MCierreMensualBodega = mysqlTable("50_m_cierre_mensual_bodega", {
	// JS property "anio" maps to SQL column "año" — "ñ" in a compound PK causes syntax issues in generated code
	anio: int("año").notNull(),
	mes: int("mes").notNull(),
	idBodega: int("id_bodega").notNull(),
	idUsuarioCierre: int("id_usuario_cierre").notNull(),
	fechaCierreBodega: datetime("fecha_cierre_bodega", { mode: 'string'}).notNull(),
	observaciones: varchar("observaciones", { length: 255 }),
},
(table) => [
	primaryKey({ columns: [table.anio, table.mes, table.idBodega], name: "PRIMARY" }),
	index("mes").on(table.mes),
	foreignKey({ name: "cierre_bod_bod", columns: [table.idBodega], foreignColumns: [t50MBodega.idBodega] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "cierre_bod_usu", columns: [table.idUsuarioCierre], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MRecepcionCompra = mysqlTable("50_m_recepcion_compra", {
	idRecepcion: int("id_recepcion").notNull(),
	rutProveedor: int("rut_proveedor").notNull(),
	rutEmpresa: int("rut_empresa").notNull(),
	idTipoDocto: int("id_tipo_docto").notNull(),
	numDocto: int("num_docto").notNull(),
	fechaEmisionDocto: datetime("fecha_emision_docto", { mode: 'string'}).notNull(),
	idBodega: int("id_bodega").notNull(),
	idUsuarioRecepcion: int("id_usuario_recepcion").notNull(),
	idEstado: int("id_estado").notNull(),
	idTipoPago: int("id_tipo_pago"),
	observacion: varchar("observacion", { length: 200 }),
	totalNeto: int("total_neto").default(0).notNull(),
	iva: int("iva").default(0).notNull(),
	montoTotal: int("monto_total").default(0).notNull(),
	periodoLibro: varchar("periodo_libro", { length: 7 }).default('0').notNull(),
},
(table) => [
	primaryKey({ columns: [table.idRecepcion], name: "PRIMARY" }),
	foreignKey({ name: "recep_prov", columns: [table.rutProveedor], foreignColumns: [t70MProveedor.rutProveedor] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "recep_tipo_docto", columns: [table.idTipoDocto], foreignColumns: [t10PTipoDocto.idTipoDocto] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "recep_bod", columns: [table.idBodega], foreignColumns: [t50MBodega.idBodega] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "recep_usu", columns: [table.idUsuarioRecepcion], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "recep_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t40MNotaCredito = mysqlTable("40_m_nota_credito", {
	idNotaCredito: int("id_nota_credito").notNull(),
	idVenta: int("id_venta").notNull(),
	numNotaCredito: int("num_nota_credito").default(0).notNull(),
	idTipoDoctoEmitido: int("id_tipo_docto_emitido").notNull(),
	rutEmpresa: int("rut_empresa").default(0).notNull(),
	iva: int("iva").default(0).notNull(),
	iaba: int("iaba").default(0).notNull(),
	espec: int("espec").default(0).notNull(),
	subTotal: int("sub_total").default(0).notNull(),
	idMotivo: int("id_motivo").default(1).notNull(),
	idUsuario: int("id_usuario").notNull(),
	fechaNotaCredito: datetime("fecha_nota_credito", { mode: 'string'}).notNull(),
	precioTotal: int("precio_total").default(0).notNull(),
	idEstado: int("id_estado").notNull(),
	esNotaCredElectronica: smallint("es_nota_cred_electronica").notNull(),
	urlPdfOriginal: varchar("url_PDF_original", { length: 255 }).default('').notNull(),
	urlPdfCedible: varchar("url_PDF_cedible", { length: 100 }).default('').notNull(),
	idUsuarioMod: int("id_usuario_mod").default(1).notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}),
	idFolio: int("id_folio").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idNotaCredito], name: "PRIMARY" }),
	index("nota_cred_venta").on(table.idVenta),
	foreignKey({ name: "fk_nota_cred_venta", columns: [table.idVenta], foreignColumns: [t40MVenta.idVenta] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "nota_cred_usu", columns: [table.idUsuario], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "nota_cred_est", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t20MPorcion = mysqlTable("20_m_porcion", {
	idPorcion: int("id_porcion").autoincrement().notNull(),
	idProducto: int("id_producto").notNull(),
	fecha: datetime("fecha", { mode: 'string'}).notNull(),
	grupo: int("grupo").notNull(),
	numero: int("numero").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	idVenta: int("id_venta"),
	idUsuario: int("id_usuario").notNull(),
	idEstado: int("id_estado").notNull(),
},
(table) => [
	primaryKey({ columns: [table.idPorcion], name: "PRIMARY" }),
	index("fk_porcion_venta").on(table.idVenta),
	foreignKey({ name: "fk_porcion_producto", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("cascade").onUpdate("restrict"),
	foreignKey({ name: "fk_porcion_usuario", columns: [table.idUsuario], foreignColumns: [t10MUsuario.idUsuario] }).onDelete("cascade").onUpdate("restrict"),
	foreignKey({ name: "fk_porcion_estado", columns: [table.idEstado], foreignColumns: [t99PEstado.idEstado] }).onDelete("cascade").onUpdate("restrict"),
]);

export const t30MProductoPedido = mysqlTable("30_m_producto_pedido", {
	idPedido: int("id_pedido").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	precio: int("precio").notNull(),
	porcenDesc: int("porcen_desc").notNull(),
	precioNeto: int("precio_neto").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idPedido, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "prod_ped_ped", columns: [table.idPedido], foreignColumns: [t30MPedido.idPedido] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_ped_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t40MPrecioProducto = mysqlTable("40_m_precio_producto", {
	idListaPrecio: int("id_lista_precio").notNull(),
	idProducto: int("id_producto").notNull(),
	precioNeto: int("precio_neto").notNull(),
	precio: int("precio").notNull(),
	porcenDesc: int("porcen_desc").default(0).notNull(),
	maxPorcenDesc: int("max_porcen_desc").default(0).notNull(),
	cantTramo1: int("cant_tramo1").default(0).notNull(),
	maxPorcenTramo1: int("max_porcen_tramo1").default(0).notNull(),
	cantTramo2: int("cant_tramo2").default(0).notNull(),
	maxPorcenTramo2: int("max_porcen_tramo2").default(0).notNull(),
	cantTramo3: int("cant_tramo3").default(0).notNull(),
	maxPorcenTramo3: int("max_porcen_tramo3").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idListaPrecio, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "prec_prod_list_prec", columns: [table.idListaPrecio], foreignColumns: [t40MListaPrecio.idListaPrecio] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prec_prod_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t40MProductoVenta = mysqlTable("40_m_producto_venta", {
	idVenta: int("id_venta").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	precio: int("precio").notNull(),
	porcenDesc: int("porcen_desc").notNull(),
	precioNeto: int("precio_neto").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idVenta, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "fk_prod_venta_venta", columns: [table.idVenta], foreignColumns: [t40MVenta.idVenta] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_venta_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MMermas = mysqlTable("50_m_mermas", {
	idBodega: int("id_bodega").notNull(),
	fechaMerma: datetime("fecha_merma", { mode: 'string'}).notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	motivoMerma: varchar("motivo_merma", { length: 255 }).notNull(),
	idUsuarioMerma: int("id_usuario_merma").notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idBodega, table.fechaMerma, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "merma_bod", columns: [table.idBodega], foreignColumns: [t50MBodega.idBodega] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "merma_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MNivelProductoBodega = mysqlTable("50_m_nivel_producto_bodega", {
	idBodega: int("id_bodega").notNull(),
	idProducto: int("id_producto").notNull(),
	minimo: int("minimo").notNull(),
	meses: int("meses").notNull(),
	puntoOrden: int("punto_orden").notNull(),
	idUsuarioMod: int("id_usuario_mod").notNull(),
	ultFechaMod: datetime("ult_fecha_mod", { mode: 'string'}).notNull(),
	idEstado: int("id_estado").default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idBodega, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "niv_bod", columns: [table.idBodega], foreignColumns: [t50MBodega.idBodega] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "niv_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MStock = mysqlTable("50_m_stock", {
	idBodega: int("id_bodega").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idBodega, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "stock_bod", columns: [table.idBodega], foreignColumns: [t50MBodega.idBodega] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "stock_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MCierreMensualBodegaProducto = mysqlTable("50_m_cierre_mensual_bodega_producto", {
	// JS property "anio" maps to SQL column "año" — same as above
	anio: int("año").notNull(),
	mes: int("mes").notNull(),
	idBodega: int("id_bodega").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.anio, table.mes, table.idBodega, table.idProducto], name: "PRIMARY" }),
	index("bod_cierre_bod_prod").on(table.idBodega),
	index("mes_cierre_bod_prod").on(table.mes),
	foreignKey({
			name: "año_cierre_bod_prod",
			columns: [table.anio, table.mes, table.idBodega],
			foreignColumns: [t50MCierreMensualBodega.anio, t50MCierreMensualBodega.mes, t50MCierreMensualBodega.idBodega],
		}).onUpdate("restrict").onDelete("restrict"),
	foreignKey({ name: "prod_cierre_bod_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t50MProductoRecepcion = mysqlTable("50_m_producto_recepcion", {
	idRecepcion: int("id_recepcion").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	valor: decimal("valor", { precision: 18, scale: 3 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idRecepcion, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "prod_recep_recep", columns: [table.idRecepcion], foreignColumns: [t50MRecepcionCompra.idRecepcion] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_recep_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);

export const t40MProdNotaCredito = mysqlTable("40_m_prod_nota_credito", {
	idNotaCredito: int("id_nota_credito").notNull(),
	idProducto: int("id_producto").notNull(),
	cantidad: decimal("cantidad", { precision: 18, scale: 3 }).notNull(),
	precio: int("precio").default(0).notNull(),
	porcenDesc: int("porcen_desc").default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.idNotaCredito, table.idProducto], name: "PRIMARY" }),
	foreignKey({ name: "prod_nota_nota_cred", columns: [table.idNotaCredito], foreignColumns: [t40MNotaCredito.idNotaCredito] }).onDelete("restrict").onUpdate("restrict"),
	foreignKey({ name: "prod_nota_prod", columns: [table.idProducto], foreignColumns: [t20MProducto.idProducto] }).onDelete("restrict").onUpdate("restrict"),
]);
