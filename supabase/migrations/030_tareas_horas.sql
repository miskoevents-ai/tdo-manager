-- 030 · Horas estimadas por tarea.
-- Estimación aproximada de cuánto lleva cada tarea, para dimensionar la carga
-- de trabajo de cada persona.

alter table tareas add column if not exists horas_estimadas numeric;
