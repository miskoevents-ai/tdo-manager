-- 033 · Vigencia de las reglas de comisión.
-- Una regla puede tener una fecha "desde" (cuándo empezó a trabajar esa
-- persona). La comisión solo se devenga en eventos cuya fecha sea igual o
-- posterior a "desde"; los eventos anteriores no le generan comisión. Así,
-- al cargar histórico, quien no estaba en el equipo no cobra de esos eventos.
-- Vacío = sin límite (aplica a todo). Ejecutar en Supabase → SQL Editor → Run.

alter table comisiones_config add column if not exists desde date;
