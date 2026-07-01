-- ============================================================================
-- Migración 005 — Costes del evento (escandallo/margen)
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

-- Ajustes configurables (clave-valor). Ej.: precio por km de gasolina.
create table if not exists ajustes (
  clave text primary key,
  valor text,
  updated_at timestamptz not null default now()
);
insert into ajustes (clave, valor) values ('km_precio', '0.26')
on conflict (clave) do nothing;

-- Enlace desplazamiento -> su movimiento de tesorería (para borrarlo en cascada lógica)
alter table desplazamientos add column if not exists tesoreria_id uuid references tesoreria(id) on delete set null;
alter table desplazamientos add column if not exists ida_vuelta boolean not null default true;

-- Distancia del lugar/finca (km desde el local), para calcular la gasolina sola
alter table lugares add column if not exists distancia_km numeric;

-- Fecha prevista de devolución de la fianza (para avisos y calendario)
alter table oportunidades add column if not exists fecha_devolucion_fianza date;

-- RLS ajustes
alter table ajustes enable row level security;
drop policy if exists "auth_all" on ajustes;
create policy "auth_all" on ajustes for all to authenticated using (true) with check (true);
