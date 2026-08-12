CREATE TABLE `50_m_stock_log` (
	`id_stock_log` int AUTO_INCREMENT NOT NULL,
	`id_bodega` int NOT NULL,
	`id_producto` int NOT NULL,
	`cantidad_antes` decimal(18,3),
	`cantidad_nueva` decimal(18,3) NOT NULL,
	`diferencia` decimal(18,3) NOT NULL,
	`fecha` datetime NOT NULL,
	`id_usuario` int NOT NULL,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id_stock_log`)
);
--> statement-breakpoint
ALTER TABLE `50_m_stock_log` ADD CONSTRAINT `stock_log_bod` FOREIGN KEY (`id_bodega`) REFERENCES `50_m_bodega`(`id_bodega`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_stock_log` ADD CONSTRAINT `stock_log_prod` FOREIGN KEY (`id_producto`) REFERENCES `20_m_producto`(`id_producto`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `50_m_stock_log` ADD CONSTRAINT `stock_log_usu` FOREIGN KEY (`id_usuario`) REFERENCES `10_m_usuario`(`id_usuario`) ON DELETE restrict ON UPDATE restrict;