SET FOREIGN_KEY_CHECKS=0;
--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` MODIFY COLUMN `id_local_cliente` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS=1;
--> statement-breakpoint
INSERT INTO `40_p_forma_pago` (id_forma_pago, nom_forma_pago, desc_forma_pago)
SELECT id_tipo_docto, nom_tipo_docto, desc_tipo_docto
FROM `10_p_tipo_docto`
WHERE id_tipo_docto BETWEEN 3 AND 8
ON DUPLICATE KEY UPDATE nom_forma_pago = VALUES(nom_forma_pago), desc_forma_pago = VALUES(desc_forma_pago);
--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` ADD CONSTRAINT `loc_clie_forma_pago` FOREIGN KEY (`id_forma_pago`) REFERENCES `40_p_forma_pago`(`id_forma_pago`) ON DELETE restrict ON UPDATE restrict;
