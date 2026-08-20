-- 20_m_producto.usa_porciones is bit(1) in the legacy DB, which mysql2 returns
-- as a Node Buffer ({type:"Buffer",data:[1]}) instead of a number. The Drizzle
-- schema already declares it tinyint (drizzle-kit could not parse bit(1)), so
-- the runtime value diverged from the type and the frontend's `=== 1` check
-- never matched. Convert the real column to tinyint(1) so it matches the schema
-- and mysql2 returns a plain 0/1. Existing b'0'/b'1' values cast cleanly. It is
-- a plain column (no PK/FK), so a simple MODIFY needs no FK-check dance.
ALTER TABLE `20_m_producto` MODIFY COLUMN `usa_porciones` tinyint(1) NOT NULL;
