-- id_usuario is the parent of many FK constraints (bod_usu_mod, ped_usu, ruta_usu,
-- venta_usu, ...). MariaDB runs MODIFY ... AUTO_INCREMENT as a table COPY, which it
-- refuses (errno 1834) when the parent table has FK children with data. The ALTER
-- changes no data, so disabling FK checks for the rebuild is safe.
SET FOREIGN_KEY_CHECKS = 0;
--> statement-breakpoint
ALTER TABLE `10_m_usuario` MODIFY COLUMN `id_usuario` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS = 1;
