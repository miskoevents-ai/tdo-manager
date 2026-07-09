-- Foto por línea de presupuesto: base del presupuesto visual. Puede ser la
-- foto de un artículo de la galería (inventario/catálogo) o una URL externa
-- (p. ej. una imagen generada con IA). Guarda URL completa o nombre de
-- archivo del bucket del catálogo.
alter table presupuesto_lineas add column if not exists foto text;
