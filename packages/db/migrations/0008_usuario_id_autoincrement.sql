-- id_usuario is the parent of many FK constraints (bod_usu_mod, ped_usu, ruta_usu,
-- venta_usu, ...). MariaDB runs MODIFY ... AUTO_INCREMENT as a table COPY, which it
-- refuses (errno 1834) when the parent table has FK children with data — so disable
-- FK checks for the rebuild (the ALTER changes no data).
-- The table also has a row with id_usuario = 0; without NO_AUTO_VALUE_ON_ZERO the
-- copy would resequence that 0 and collide (errno 1062). NO_AUTO_VALUE_ON_ZERO keeps
-- the literal 0 and starts AUTO_INCREMENT from MAX+1.
-- Both session settings are saved and restored so nothing leaks onto the pooled
-- connection (connectionLimit=1 everywhere, so the user vars persist reliably).
SET @serfel_old_fk = @@session.foreign_key_checks;
--> statement-breakpoint
SET @serfel_old_sql_mode = @@session.sql_mode;
--> statement-breakpoint
SET SESSION foreign_key_checks = 0;
--> statement-breakpoint
SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',NO_AUTO_VALUE_ON_ZERO');
--> statement-breakpoint
ALTER TABLE `10_m_usuario` MODIFY COLUMN `id_usuario` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET SESSION sql_mode = @serfel_old_sql_mode;
--> statement-breakpoint
SET SESSION foreign_key_checks = @serfel_old_fk;
