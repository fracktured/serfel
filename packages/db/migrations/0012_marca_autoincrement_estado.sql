-- 20_p_marca: add soft-delete state, then make id_marca AUTO_INCREMENT.
-- id_marca is the parent of prod_marca (20_m_producto). MariaDB runs
-- MODIFY ... AUTO_INCREMENT as a table COPY, refused (errno 1834) when the
-- parent has FK children with data — so disable FK checks for the rebuild
-- (the ALTER changes no data). A possible id_marca = 0 row would collide
-- (errno 1062) without NO_AUTO_VALUE_ON_ZERO, which keeps the literal 0 and
-- starts AUTO_INCREMENT from MAX+1. Session vars are saved and restored so
-- nothing leaks onto the pooled connection.
ALTER TABLE `20_p_marca` ADD COLUMN `id_estado` int NOT NULL DEFAULT 1;
--> statement-breakpoint
SET @serfel_old_fk = @@session.foreign_key_checks;
--> statement-breakpoint
SET @serfel_old_sql_mode = @@session.sql_mode;
--> statement-breakpoint
SET SESSION foreign_key_checks = 0;
--> statement-breakpoint
SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',NO_AUTO_VALUE_ON_ZERO');
--> statement-breakpoint
ALTER TABLE `20_p_marca` MODIFY COLUMN `id_marca` int AUTO_INCREMENT NOT NULL;
--> statement-breakpoint
SET SESSION sql_mode = @serfel_old_sql_mode;
--> statement-breakpoint
SET SESSION foreign_key_checks = @serfel_old_fk;
