-- Desglose de un movimiento de tesorería en líneas (concepto + importe): p. ej.
-- "Material navideño 900 €" → Guirnaldas 300 · Árbol 400 · Luces 200. Se guarda
-- como JSON en la propia fila. Y un "evento de referencia" en texto libre para
-- nombrar el evento aunque no sea una oportunidad del sistema.
-- Opcionales: el server action usa fallback tolerante.
alter table tesoreria add column if not exists desglose jsonb;
alter table tesoreria add column if not exists evento_ref text;
