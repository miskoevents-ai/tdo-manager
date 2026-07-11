-- 029 · Sueldos del equipo y fase de imputación de horas.
-- Cada persona puede tener un sueldo mensual que cambia con el tiempo (p. ej.
-- Cristina: 1000 € desde julio, y otra cifra desde septiembre). Las horas se
-- imputan a un proyecto marcando la fase: comercial, pre-evento, durante el
-- evento o post-evento.

alter table partes_horas add column if not exists fase text;

create table if not exists sueldos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid references equipo(id) on delete cascade,
  desde date not null,          -- primer día del mes desde el que rige (YYYY-MM-01)
  importe numeric not null,      -- sueldo mensual bruto
  created_at timestamptz default now()
);

create index if not exists sueldos_equipo_idx on sueldos (equipo_id, desde);
