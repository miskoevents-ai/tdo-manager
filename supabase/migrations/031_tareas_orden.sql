-- 031 · Orden manual de las tarjetas de tareas (tablero tipo Trello).
-- Permite arrastrar y colocar en cualquier posición dentro de una columna.

alter table tareas add column if not exists orden numeric;
