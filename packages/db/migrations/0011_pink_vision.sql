INSERT INTO `40_p_forma_pago` (id_forma_pago, nom_forma_pago, desc_forma_pago)
SELECT id_tipo_docto, nom_tipo_docto, desc_tipo_docto
FROM `10_p_tipo_docto`
WHERE id_tipo_docto BETWEEN 3 AND 8
ON DUPLICATE KEY UPDATE nom_forma_pago = VALUES(nom_forma_pago), desc_forma_pago = VALUES(desc_forma_pago);
--> statement-breakpoint
INSERT IGNORE INTO `40_p_forma_pago` (id_forma_pago, nom_forma_pago, desc_forma_pago) VALUES (7, 'CREDITO', 'Pago a credito');
--> statement-breakpoint
UPDATE `10_m_local_cliente` l LEFT JOIN `40_p_forma_pago` f ON l.id_forma_pago = f.id_forma_pago SET l.id_forma_pago = 7 WHERE f.id_forma_pago IS NULL;
--> statement-breakpoint
ALTER TABLE `30_m_pedido` DROP FOREIGN KEY IF EXISTS `ped_loc_clie`;
--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` MODIFY COLUMN `id_local_cliente` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
ALTER TABLE `30_m_pedido` ADD CONSTRAINT `ped_loc_clie` FOREIGN KEY (`id_local_cliente`) REFERENCES `10_m_local_cliente`(`id_local_cliente`) ON DELETE restrict ON UPDATE restrict;
--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` DROP FOREIGN KEY IF EXISTS `loc_clie_forma_pago`;
--> statement-breakpoint
ALTER TABLE `10_m_local_cliente` ADD CONSTRAINT `loc_clie_forma_pago` FOREIGN KEY (`id_forma_pago`) REFERENCES `40_p_forma_pago`(`id_forma_pago`) ON DELETE restrict ON UPDATE restrict;
