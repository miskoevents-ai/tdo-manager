-- Modalidades en el presupuesto: permite ofrecer varias opciones EXCLUYENTES
-- dentro de una misma oportunidad (p. ej. "C&C" vs "Con montaje/desmontaje").
-- El cliente elige UNA; no se suman entre sí.
--
-- Semántica de la columna:
--   modalidad IS NULL  → línea COMÚN (va incluida en todas las opciones).
--   modalidad = 'texto' → línea que solo cuenta en esa opción.
-- El total de cada opción = líneas comunes + líneas de esa modalidad.
alter table presupuesto_lineas add column if not exists modalidad text;
