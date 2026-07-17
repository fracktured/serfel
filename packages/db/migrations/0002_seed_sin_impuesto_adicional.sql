-- Custom SQL migration file, put your code below! --

-- Seed the "Sin Imp. Adicional" row (id 0) so products with no additional tax
-- have a proper 99_p_impuesto entry to reference in the dropdown. Idempotent:
-- re-running the migration (or replaying it in another environment) is safe.
INSERT INTO `99_p_impuesto` (`id_impuesto`, `nom_impuesto`, `valor`, `id_imp_iss`)
VALUES (0, 'Sin Imp. Adicional', 0, 0)
ON DUPLICATE KEY UPDATE `nom_impuesto` = VALUES(`nom_impuesto`);
