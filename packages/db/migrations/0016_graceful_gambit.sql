CREATE TABLE `40_m_folios_electronicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fecha_creacion` datetime NOT NULL,
	`rut_empresa` int NOT NULL,
	`id_tipo_docto` int NOT NULL,
	`folio_desde` int NOT NULL,
	`folio_hasta` int NOT NULL,
	`ult_folio` int NOT NULL DEFAULT 0,
	CONSTRAINT `PRIMARY` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `40_m_nota_credito` MODIFY COLUMN `id_nota_credito` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
CREATE INDEX `folios_emp_tipo` ON `40_m_folios_electronicos` (`rut_empresa`,`id_tipo_docto`);