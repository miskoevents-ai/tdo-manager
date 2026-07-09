-- Estimación de costes con detalle: cantidad × precio unitario y tipo de
-- gasto (material, personal, desplazamiento…). El importe sigue guardando el
-- total de la línea para que las sumas existentes no cambien.
alter table costes_estimados add column if not exists cantidad numeric not null default 1;
alter table costes_estimados add column if not exists precio_unitario numeric;
alter table costes_estimados add column if not exists categoria text;
