CREATE TABLE `10_m_cliente` (
	`rut_cliente` int NOT NULL,
	`dv_cliente` varchar(1) NOT NULL,
	`razon_social` varchar(50) NOT NULL,
	`nom_fantasia` varchar(50) NOT NULL DEFAULT '',
	`telefono_cliente` varchar(15),
	`direccion_cliente` varchar(200) NOT NULL DEFAULT '',
	`comuna` varchar(20) NOT NULL DEFAULT '',
	`ciudad` varchar(25) NOT NULL DEFAULT '',
	`email_cliente` varchar(50),
	`id_lista_precio` int NOT NULL DEFAULT 1,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	`permite_venta_deuda` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`rut_cliente`)
);
--> statement-breakpoint
CREATE TABLE `10_m_empresa` (
	`rut_empresa` int NOT NULL,
	`dv_empresa` varchar(1) NOT NULL,
	`razon_social` varchar(50) NOT NULL,
	`nom_fantasia` varchar(50) NOT NULL,
	`direccion_empresa` varchar(255) NOT NULL,
	`acceso_rapido` int NOT NULL DEFAULT 0,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	`giro` varchar(100) NOT NULL,
	`cod_actividad_economica` int NOT NULL,
	`comuna` varchar(25) NOT NULL,
	`ciudad` varchar(25) NOT NULL,
	`rut_representante_legal` int NOT NULL,
	`dv_representante_legal` varchar(1) NOT NULL,
	`fecha_aprobacion_SII` date NOT NULL,
	`num_aprobacion_SII` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`rut_empresa`,`ult_fecha_mod`)
);
--> statement-breakpoint
CREATE TABLE `10_m_local_cliente` (
	`id_local_cliente` int NOT NULL,
	`rut_cliente` int NOT NULL,
	`nom_local_cliente` varchar(30) NOT NULL,
	`telefono_local_cliente` varchar(15),
	`direccion_local_cliente` varchar(200) DEFAULT '',
	`comuna_local_cliente` varchar(30) DEFAULT '',
	`email_local_cliente` varchar(50),
	`giro` varchar(30) DEFAULT '',
	`nom_contacto` varchar(50) DEFAULT '',
	`apell_pat_contacto` varchar(30) DEFAULT '',
	`apell_mat_contacto` varchar(30) DEFAULT '',
	`telefono_contacto` varchar(15),
	`email_contacto` varchar(50),
	`tope_venta` int NOT NULL DEFAULT 0,
	`tope_credito` int NOT NULL DEFAULT 0,
	`id_vendedor` int NOT NULL DEFAULT 5,
	`id_forma_pago` int NOT NULL DEFAULT 7,
	`comuna` varchar(20) DEFAULT '',
	`observaciones` varchar(200) DEFAULT '',
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	`permite_venta_tope_mensual` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_local_cliente`)
);
--> statement-breakpoint
CREATE TABLE `10_m_usuario` (
	`id_usuario` int NOT NULL,
	`rut_usuario` int NOT NULL,
	`dv_usuario` varchar(1) NOT NULL,
	`nom_usuario` varchar(50) NOT NULL,
	`apell_pat_usuario` varchar(30) NOT NULL,
	`apell_mat_usuario` varchar(30) NOT NULL,
	`password` varchar(50) NOT NULL,
	`id_tipo_usuario` int NOT NULL,
	`telefono_usuario` varchar(15),
	`direccion_usuario` varchar(200) NOT NULL,
	`email_usuario` varchar(50),
	`num_usuario` int NOT NULL DEFAULT 0,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	`fecha_act_productos` datetime,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_usuario`)
);
--> statement-breakpoint
CREATE TABLE `10_p_tipo_docto` (
	`id_tipo_docto` int NOT NULL,
	`nom_tipo_docto` varchar(35) NOT NULL,
	`desc_tipo_docto` varchar(150) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_tipo_docto`)
);
--> statement-breakpoint
CREATE TABLE `10_p_tipo_usuario` (
	`id_tipo_usuario` int NOT NULL,
	`nom_tipo_usuario` varchar(15) NOT NULL,
	`desc_tipo_usuario` varchar(50) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_tipo_usuario`)
);
--> statement-breakpoint
CREATE TABLE `20_m_porcion` (
	`id_porcion` int AUTO_INCREMENT NOT NULL,
	`id_producto` int NOT NULL,
	`fecha` datetime NOT NULL,
	`grupo` int NOT NULL,
	`numero` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`id_venta` int,
	`id_usuario` int NOT NULL,
	`id_estado` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_porcion`)
);
--> statement-breakpoint
CREATE TABLE `20_m_producto` (
	`id_producto` int NOT NULL,
	`nom_producto` varchar(200) NOT NULL,
	`desc_producto` varchar(200) NOT NULL,
	`cod_barra_producto` varchar(200) NOT NULL,
	`id_tipo_producto` int NOT NULL,
	`id_marca` int NOT NULL,
	`id_UM` int NOT NULL,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	`costo_prom` decimal(18,2) DEFAULT '0.00',
	`ult_fecha_compra` datetime,
	`cod_serfel` int NOT NULL DEFAULT 0,
	`impuesto` int NOT NULL DEFAULT 0,
	`usa_porciones` tinyint NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `20_p_marca` (
	`id_marca` int NOT NULL,
	`nom_marca` varchar(50) NOT NULL,
	`desc_marca` varchar(200) NOT NULL DEFAULT '',
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_marca`)
);
--> statement-breakpoint
CREATE TABLE `20_p_tipo_producto` (
	`id_tipo_producto` int NOT NULL,
	`nom_tipo_producto` varchar(15) NOT NULL,
	`desc_tipo_producto` varchar(200) NOT NULL DEFAULT '',
	`nivel_1` int NOT NULL DEFAULT 0,
	`nivel_2` int NOT NULL DEFAULT 0,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_tipo_producto`)
);
--> statement-breakpoint
CREATE TABLE `20_p_unidad_medida` (
	`id_UM` int NOT NULL,
	`nom_UM` varchar(15) NOT NULL,
	`desc_UM` varchar(150) NOT NULL DEFAULT '',
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_UM`)
);
--> statement-breakpoint
CREATE TABLE `30_m_pedido` (
	`id_pedido` int NOT NULL,
	`fecha_pedido` datetime NOT NULL,
	`id_local_cliente` int NOT NULL,
	`dia_ruta` int NOT NULL DEFAULT 0,
	`id_forma_pago` int NOT NULL DEFAULT 0,
	`tiempo` int NOT NULL DEFAULT 0,
	`precio_total` int NOT NULL,
	`id_usuario` int NOT NULL DEFAULT 5,
	`id_lista_precio` int NOT NULL,
	`id_estado` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_pedido`)
);
--> statement-breakpoint
CREATE TABLE `30_m_producto_pedido` (
	`id_pedido` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`precio` int NOT NULL,
	`porcen_desc` int NOT NULL,
	`precio_neto` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_pedido`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `40_m_lista_precio` (
	`id_lista_precio` int NOT NULL,
	`nom_lista_precio` varchar(15) NOT NULL,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_lista_precio`)
);
--> statement-breakpoint
CREATE TABLE `40_m_motivo_nota_credito` (
	`id_motivo` int NOT NULL,
	`nom_motivo` varchar(50) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_motivo`)
);
--> statement-breakpoint
CREATE TABLE `40_m_nota_credito` (
	`id_nota_credito` int NOT NULL,
	`id_venta` int NOT NULL,
	`num_nota_credito` int NOT NULL DEFAULT 0,
	`id_tipo_docto_emitido` int NOT NULL,
	`rut_empresa` int NOT NULL DEFAULT 0,
	`iva` int NOT NULL DEFAULT 0,
	`iaba` int NOT NULL DEFAULT 0,
	`espec` int NOT NULL DEFAULT 0,
	`sub_total` int NOT NULL DEFAULT 0,
	`id_motivo` int NOT NULL DEFAULT 1,
	`id_usuario` int NOT NULL,
	`fecha_nota_credito` datetime NOT NULL,
	`precio_total` int NOT NULL DEFAULT 0,
	`id_estado` int NOT NULL,
	`es_nota_cred_electronica` smallint NOT NULL,
	`url_PDF_original` varchar(255) NOT NULL DEFAULT '',
	`url_PDF_cedible` varchar(100) NOT NULL DEFAULT '',
	`id_usuario_mod` int NOT NULL DEFAULT 1,
	`ult_fecha_mod` datetime,
	`id_folio` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_nota_credito`)
);
--> statement-breakpoint
CREATE TABLE `40_m_nota_credito_compra` (
	`id_nc_compra` int AUTO_INCREMENT NOT NULL,
	`id_recepcion` int NOT NULL,
	`num_nc_compra` int NOT NULL,
	`fecha_nc_compra` datetime NOT NULL,
	`id_tipo_docto` int NOT NULL,
	`iva` int NOT NULL,
	`iaba` int NOT NULL,
	`espec` int NOT NULL,
	`subtotal` int NOT NULL,
	`precio_total` int NOT NULL,
	`id_usuario` int NOT NULL,
	`id_estado` int NOT NULL,
	`url_PDF` varchar(255) NOT NULL,
	`cod_ref_nde` smallint NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_nc_compra`)
);
--> statement-breakpoint
CREATE TABLE `40_m_nota_debito` (
	`id_nota_debito` int AUTO_INCREMENT NOT NULL,
	`id_nota_credito` int NOT NULL,
	`num_nota_debito_elect` int NOT NULL,
	`rut_empresa` int NOT NULL,
	`iva` int NOT NULL,
	`iaba` int NOT NULL,
	`espec` int NOT NULL,
	`subtotal` int NOT NULL,
	`id_usuario` int NOT NULL,
	`fecha_nota_debito` datetime NOT NULL,
	`precio_total` int NOT NULL,
	`id_estado` int NOT NULL,
	`url_PDF` varchar(255) NOT NULL,
	`cod_ref_nde` smallint NOT NULL,
	`id_folio` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_nota_debito`)
);
--> statement-breakpoint
CREATE TABLE `40_m_precio_producto` (
	`id_lista_precio` int NOT NULL,
	`id_producto` int NOT NULL,
	`precio_neto` int NOT NULL,
	`precio` int NOT NULL,
	`porcen_desc` int NOT NULL DEFAULT 0,
	`max_porcen_desc` int NOT NULL DEFAULT 0,
	`cant_tramo1` int NOT NULL DEFAULT 0,
	`max_porcen_tramo1` int NOT NULL DEFAULT 0,
	`cant_tramo2` int NOT NULL DEFAULT 0,
	`max_porcen_tramo2` int NOT NULL DEFAULT 0,
	`cant_tramo3` int NOT NULL DEFAULT 0,
	`max_porcen_tramo3` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_lista_precio`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `40_m_prod_nota_credito` (
	`id_nota_credito` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`precio` int NOT NULL DEFAULT 0,
	`porcen_desc` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_nota_credito`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `40_m_prod_nota_credito_compra` (
	`id_nc_compra` int AUTO_INCREMENT NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`precio` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_nc_compra`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `40_m_producto_devolucion` (
	`id_venta` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`id_usuario` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_venta`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `40_m_producto_venta` (
	`id_venta` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`precio` int NOT NULL,
	`porcen_desc` int NOT NULL,
	`precio_neto` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_venta`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `40_m_ruta` (
	`id_ruta` int NOT NULL,
	`nom_ruta` varchar(50) NOT NULL DEFAULT '',
	`id_usuario` int NOT NULL,
	`num_dia` int NOT NULL,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_ruta`)
);
--> statement-breakpoint
CREATE TABLE `40_m_ruta_local_cliente` (
	`id_ruta` int NOT NULL,
	`id_local_cliente` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_ruta`,`id_local_cliente`)
);
--> statement-breakpoint
CREATE TABLE `40_m_venta` (
	`id_venta` int AUTO_INCREMENT NOT NULL,
	`id_lista_precio` int NOT NULL,
	`id_usuario_venta` int NOT NULL,
	`iva` int NOT NULL DEFAULT 0,
	`iaba` int NOT NULL DEFAULT 0,
	`espec` int NOT NULL DEFAULT 0,
	`sub_total` int NOT NULL DEFAULT 0,
	`precio_total` int NOT NULL,
	`num_docto_emitido` int NOT NULL,
	`id_tipo_docto_emitido` int NOT NULL,
	`rut_empresa` int NOT NULL,
	`rut_cliente` int NOT NULL,
	`id_local_cliente` int NOT NULL,
	`id_forma_pago` int NOT NULL DEFAULT 0,
	`id_pedido` int NOT NULL DEFAULT 0,
	`fecha_venta` datetime NOT NULL,
	`entregado` int NOT NULL DEFAULT 0,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL,
	`id_folio` int NOT NULL DEFAULT 0,
	`url_PDF` varchar(255) NOT NULL DEFAULT '',
	`url_PDF_original` varchar(100) NOT NULL DEFAULT '',
	`url_PDF_cedible` varchar(100) NOT NULL DEFAULT '',
	`observaciones` varchar(150) NOT NULL DEFAULT '',
	`periodo_libro` varchar(255) NOT NULL DEFAULT '',
	`id_estado_pago` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_venta`)
);
--> statement-breakpoint
CREATE TABLE `40_p_forma_pago` (
	`id_forma_pago` int NOT NULL,
	`nom_forma_pago` varchar(15) NOT NULL,
	`desc_forma_pago` varchar(150) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_forma_pago`)
);
--> statement-breakpoint
CREATE TABLE `50_m_bodega` (
	`id_bodega` int NOT NULL,
	`nom_bodega` varchar(30) NOT NULL,
	`desc_bodega` varchar(200) NOT NULL,
	`id_tipo_bodega` int NOT NULL,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_bodega`)
);
--> statement-breakpoint
CREATE TABLE `50_m_cierre_mensual_bodega` (
	`año` int NOT NULL,
	`mes` int NOT NULL,
	`id_bodega` int NOT NULL,
	`id_usuario_cierre` int NOT NULL,
	`fecha_cierre_bodega` datetime NOT NULL,
	`observaciones` varchar(255),
	CONSTRAINT `PRIMARY` PRIMARY KEY(`año`,`mes`,`id_bodega`)
);
--> statement-breakpoint
CREATE TABLE `50_m_cierre_mensual_bodega_producto` (
	`año` int NOT NULL,
	`mes` int NOT NULL,
	`id_bodega` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`año`,`mes`,`id_bodega`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `50_m_mermas` (
	`id_bodega` int NOT NULL,
	`fecha_merma` datetime NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`motivo_merma` varchar(255) NOT NULL,
	`id_usuario_merma` int NOT NULL,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_bodega`,`fecha_merma`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `50_m_nivel_producto_bodega` (
	`id_bodega` int NOT NULL,
	`id_producto` int NOT NULL,
	`minimo` int NOT NULL,
	`meses` int NOT NULL,
	`punto_orden` int NOT NULL,
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_bodega`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `50_m_producto_recepcion` (
	`id_recepcion` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	`valor` decimal(18,3) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_recepcion`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `50_m_recepcion_compra` (
	`id_recepcion` int NOT NULL,
	`rut_proveedor` int NOT NULL,
	`rut_empresa` int NOT NULL,
	`id_tipo_docto` int NOT NULL,
	`num_docto` int NOT NULL,
	`fecha_emision_docto` datetime NOT NULL,
	`id_bodega` int NOT NULL,
	`id_usuario_recepcion` int NOT NULL,
	`id_estado` int NOT NULL,
	`id_tipo_pago` int,
	`observacion` varchar(200),
	`total_neto` int NOT NULL DEFAULT 0,
	`iva` int NOT NULL DEFAULT 0,
	`monto_total` int NOT NULL DEFAULT 0,
	`periodo_libro` varchar(7) NOT NULL DEFAULT '0',
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_recepcion`)
);
--> statement-breakpoint
CREATE TABLE `50_m_stock` (
	`id_bodega` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad` decimal(18,3) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_bodega`,`id_producto`)
);
--> statement-breakpoint
CREATE TABLE `50_p_tipo_bodega` (
	`id_tipo_bodega` int NOT NULL,
	`nom_tipo_bodega` varchar(15) NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_tipo_bodega`)
);
--> statement-breakpoint
CREATE TABLE `60_m_pago` (
	`id_pago` int AUTO_INCREMENT NOT NULL,
	`id_venta` int NOT NULL,
	`fecha` datetime NOT NULL,
	`monto` int NOT NULL,
	`id_forma_pago` int NOT NULL,
	`observaciones` varchar(50) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_pago`)
);
--> statement-breakpoint
CREATE TABLE `70_m_proveedor` (
	`rut_proveedor` int NOT NULL,
	`dv_proveedor` varchar(1) NOT NULL,
	`razon_social` varchar(50) NOT NULL,
	`nom_fantasia` varchar(50) NOT NULL,
	`direccion_proveedor` varchar(200) NOT NULL,
	`giro` varchar(100),
	`fono_1` varchar(15),
	`fono_2` varchar(15),
	`email` varchar(50),
	`cond_pago` varchar(50),
	`glosa_pago` varchar(50),
	`nom_vendedor` varchar(200),
	`fono_vendedor` varchar(15),
	`email_vendedor` varchar(50),
	`observaciones` varchar(200),
	`id_usuario_mod` int NOT NULL,
	`ult_fecha_mod` datetime NOT NULL,
	`id_estado` int NOT NULL DEFAULT 1,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`rut_proveedor`)
);
--> statement-breakpoint
CREATE TABLE `99_p_estado` (
	`id_estado` int NOT NULL,
	`nom_estado` varchar(15) NOT NULL,
	`desc_estado` varchar(200) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_estado`)
);
--> statement-breakpoint
CREATE TABLE `99_p_estado_pago` (
	`id_estado_pago` tinyint NOT NULL,
	`nom_estado_pago` varchar(15) NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_estado_pago`)
);
--> statement-breakpoint
CREATE TABLE `99_p_impuesto` (
	`id_impuesto` int NOT NULL,
	`nom_impuesto` varchar(20) NOT NULL,
	`valor` int NOT NULL,
	`id_imp_iss` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_impuesto`)
);
--> statement-breakpoint
CREATE TABLE `99_p_iva` (
	`iva` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`iva`)
);
--> statement-breakpoint
ALTER TABLE `10_m_cliente` ADD CONSTRAINT `10_m_cliente_id_lista_precio_40_m_lista_precio_id_lista_recio_fk` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio`(`id_lista_precio`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_cliente` ADD CONSTRAINT `10_m_cliente_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_empresa` ADD CONSTRAINT `10_m_empresa_id_usuario_mod_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_empresa` ADD CONSTRAINT `10_m_empresa_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` ADD CONSTRAINT `10_m_local_cliente_rut_cliente_10_m_cliente_rut_cliente_fk` FOREIGN KEY (`rut_cliente`) REFERENCES `10_m_cliente`(`rut_cliente`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` ADD CONSTRAINT `10_m_local_cliente_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_usuario` ADD CONSTRAINT `10_m_usuario_id_tipo_usuario_10_p_tipo_usuario_id_tipo__uario_fk` FOREIGN KEY (`id_tipo_usuario`) REFERENCES `10_p_tipo_usuario`(`id_tipo_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `10_m_usuario` ADD CONSTRAINT `10_m_usuario_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_porcion` ADD CONSTRAINT `20_m_porcion_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_porcion` ADD CONSTRAINT `20_m_porcion_id_usuario_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_porcion` ADD CONSTRAINT `20_m_porcion_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_producto` ADD CONSTRAINT `20_m_producto_id_tipo_producto_20_p_tipo_producto_id_ti_ducto_fk` FOREIGN KEY (`id_tipo_producto`) REFERENCES `20_p_tipo_producto`(`id_tipo_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_producto` ADD CONSTRAINT `20_m_producto_id_marca_20_p_marca_id_marca_fk` FOREIGN KEY (`id_marca`) REFERENCES `20_p_marca`(`id_marca`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_producto` ADD CONSTRAINT `20_m_producto_id_UM_20_p_unidad_medida_id_UM_fk` FOREIGN KEY (`id_UM`) REFERENCES `20_p_unidad_medida`(`id_UM`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_producto` ADD CONSTRAINT `20_m_producto_id_usuario_mod_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_m_producto` ADD CONSTRAINT `20_m_producto_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `20_p_tipo_producto` ADD CONSTRAINT `20_p_tipo_producto_id_usuario_mod_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `30_m_pedido` ADD CONSTRAINT `30_m_pedido_id_local_cliente_10_m_local_cliente_id_loca_iente_fk` FOREIGN KEY (`id_local_cliente`) REFERENCES `10_m_local_cliente`(`id_local_cliente`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `30_m_pedido` ADD CONSTRAINT `30_m_pedido_id_usuario_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `30_m_pedido` ADD CONSTRAINT `30_m_pedido_id_lista_precio_40_m_lista_precio_id_lista_precio_fk` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio`(`id_lista_precio`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `30_m_pedido` ADD CONSTRAINT `30_m_pedido_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `30_m_producto_pedido` ADD CONSTRAINT `30_m_producto_pedido_id_pedido_30_m_pedido_id_pedido_fk` FOREIGN KEY (`id_pedido`) REFERENCES `30_m_pedido`(`id_pedido`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `30_m_producto_pedido` ADD CONSTRAINT `30_m_producto_pedido_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_nota_credito` ADD CONSTRAINT `40_m_nota_credito_id_venta_40_m_venta_id_venta_fk` FOREIGN KEY (`id_venta`) REFERENCES `40_m_venta`(`id_venta`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_nota_credito` ADD CONSTRAINT `40_m_nota_credito_id_usuario_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_nota_credito` ADD CONSTRAINT `40_m_nota_credito_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_precio_producto` ADD CONSTRAINT `40_m_precio_producto_id_lista_precio_40_m_lista_precio__recio_fk` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio`(`id_lista_precio`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_precio_producto` ADD CONSTRAINT `40_m_precio_producto_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_prod_nota_credito` ADD CONSTRAINT `40_m_prod_nota_credito_id_nota_credito_40_m_nota_credit_edito_fk` FOREIGN KEY (`id_nota_credito`) REFERENCES `40_m_nota_credito`(`id_nota_credito`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_prod_nota_credito` ADD CONSTRAINT `40_m_prod_nota_credito_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_producto_venta` ADD CONSTRAINT `40_m_producto_venta_id_venta_40_m_venta_id_venta_fk` FOREIGN KEY (`id_venta`) REFERENCES `40_m_venta`(`id_venta`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_producto_venta` ADD CONSTRAINT `40_m_producto_venta_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_ruta` ADD CONSTRAINT `40_m_ruta_id_usuario_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_ruta` ADD CONSTRAINT `40_m_ruta_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_venta` ADD CONSTRAINT `40_m_venta_id_lista_precio_40_m_lista_precio_id_lista_precio_fk` FOREIGN KEY (`id_lista_precio`) REFERENCES `40_m_lista_precio`(`id_lista_precio`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_venta` ADD CONSTRAINT `40_m_venta_id_usuario_venta_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario_venta`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_venta` ADD CONSTRAINT `40_m_venta_id_tipo_docto_emitido_10_p_tipo_docto_id_tip_docto_fk` FOREIGN KEY (`id_tipo_docto_emitido`) REFERENCES `10_p_tipo_docto`(`id_tipo_docto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_venta` ADD CONSTRAINT `40_m_venta_rut_empresa_10_m_empresa_rut_empresa_fk` FOREIGN KEY (`rut_empresa`) REFERENCES `10_m_empresa`(`rut_empresa`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_venta` ADD CONSTRAINT `40_m_venta_rut_cliente_10_m_cliente_rut_cliente_fk` FOREIGN KEY (`rut_cliente`) REFERENCES `10_m_cliente`(`rut_cliente`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `40_m_venta` ADD CONSTRAINT `40_m_venta_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_bodega` ADD CONSTRAINT `50_m_bodega_id_tipo_bodega_50_p_tipo_bodega_id_tipo_bodega_fk` FOREIGN KEY (`id_tipo_bodega`) REFERENCES `50_p_tipo_bodega`(`id_tipo_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_bodega` ADD CONSTRAINT `50_m_bodega_id_usuario_mod_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_bodega` ADD CONSTRAINT `50_m_bodega_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_cierre_mensual_bodega` ADD CONSTRAINT `50_m_cierre_mensual_bodega_id_bodega_50_m_bodega_id_bodega_fk` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega`(`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_cierre_mensual_bodega` ADD CONSTRAINT `50_m_cierre_mensual_bodega_id_usuario_cierre_10_m_usuar_uario_fk` FOREIGN KEY (`id_usuario_cierre`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_cierre_mensual_bodega_producto` ADD CONSTRAINT `50_m_cierre_mensual_bodega_producto_id_producto_20_m_pr_ducto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_cierre_mensual_bodega_producto` ADD CONSTRAINT `año_cierre_bod_prod` FOREIGN KEY (`año`,`mes`,`id_bodega`) REFERENCES `50_m_cierre_mensual_bodega`(`año`,`mes`,`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_mermas` ADD CONSTRAINT `50_m_mermas_id_bodega_50_m_bodega_id_bodega_fk` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega`(`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_mermas` ADD CONSTRAINT `50_m_mermas_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_nivel_producto_bodega` ADD CONSTRAINT `50_m_nivel_producto_bodega_id_bodega_50_m_bodega_id_bodega_fk` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega`(`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_nivel_producto_bodega` ADD CONSTRAINT `50_m_nivel_producto_bodega_id_producto_20_m_producto_id_ducto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_producto_recepcion` ADD CONSTRAINT `50_m_producto_recepcion_id_recepcion_50_m_recepcion_com_pcion_fk` FOREIGN KEY (`id_recepcion`) REFERENCES `50_m_recepcion_compra`(`id_recepcion`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_producto_recepcion` ADD CONSTRAINT `50_m_producto_recepcion_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_recepcion_compra` ADD CONSTRAINT `50_m_recepcion_compra_rut_proveedor_70_m_proveedor_rut__eedor_fk` FOREIGN KEY (`rut_proveedor`) REFERENCES `70_m_proveedor`(`rut_proveedor`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_recepcion_compra` ADD CONSTRAINT `50_m_recepcion_compra_id_tipo_docto_10_p_tipo_docto_id__docto_fk` FOREIGN KEY (`id_tipo_docto`) REFERENCES `10_p_tipo_docto`(`id_tipo_docto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_recepcion_compra` ADD CONSTRAINT `50_m_recepcion_compra_id_bodega_50_m_bodega_id_bodega_fk` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega`(`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_recepcion_compra` ADD CONSTRAINT `50_m_recepcion_compra_id_usuario_recepcion_10_m_usuario_uario_fk` FOREIGN KEY (`id_usuario_recepcion`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_recepcion_compra` ADD CONSTRAINT `50_m_recepcion_compra_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_stock` ADD CONSTRAINT `50_m_stock_id_bodega_50_m_bodega_id_bodega_fk` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega`(`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_stock` ADD CONSTRAINT `50_m_stock_id_producto_20_m_producto_id_producto_fk` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `60_m_pago` ADD CONSTRAINT `60_m_pago_id_forma_pago_10_p_tipo_docto_id_tipo_docto_fk` FOREIGN KEY (`id_forma_pago`) REFERENCES `10_p_tipo_docto`(`id_tipo_docto`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `70_m_proveedor` ADD CONSTRAINT `70_m_proveedor_id_usuario_mod_10_m_usuario_id_usuario_fk` FOREIGN KEY (`id_usuario_mod`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `70_m_proveedor` ADD CONSTRAINT `70_m_proveedor_id_estado_99_p_estado_id_estado_fk` FOREIGN KEY (`id_estado`) REFERENCES `99_p_estado`(`id_estado`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `rut_empresa` ON `10_m_empresa` (`rut_empresa`);--> statement-breakpoint
CREATE INDEX `fk_porcion_venta` ON `20_m_porcion` (`id_venta`);--> statement-breakpoint
CREATE INDEX `ind_serfel` ON `20_m_producto` (`cod_serfel`);--> statement-breakpoint
CREATE INDEX `ind_nombre` ON `20_m_producto` (`nom_producto`);--> statement-breakpoint
CREATE INDEX `niv1_tipo_pro` ON `20_p_tipo_producto` (`nivel_1`);--> statement-breakpoint
CREATE INDEX `nota_cred_venta` ON `40_m_nota_credito` (`id_venta`);--> statement-breakpoint
CREATE INDEX `prod_nota_prod` ON `40_m_prod_nota_credito_compra` (`id_producto`);--> statement-breakpoint
CREATE INDEX `venta_ped` ON `40_m_venta` (`id_pedido`);--> statement-breakpoint
CREATE INDEX `IDX_idLocalClienteFechaVenta` ON `40_m_venta` (`id_local_cliente`,`fecha_venta`);--> statement-breakpoint
CREATE INDEX `mes` ON `50_m_cierre_mensual_bodega` (`mes`);--> statement-breakpoint
CREATE INDEX `bod_cierre_bod_prod` ON `50_m_cierre_mensual_bodega_producto` (`id_bodega`);--> statement-breakpoint
CREATE INDEX `mes_cierre_bod_prod` ON `50_m_cierre_mensual_bodega_producto` (`mes`);--> statement-breakpoint
CREATE INDEX `fk_pago_venta` ON `60_m_pago` (`id_venta`);