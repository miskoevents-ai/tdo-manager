-- Calculadora de precio: guarda la foto del cálculo hecho al presupuestar
-- (uno por oportunidad), para poder comparar luego estimado vs real.
create table if not exists calculos_precio (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null unique references oportunidades(id) on delete cascade,
  inputs jsonb not null default '{}'::jsonb,
  resultado jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table calculos_precio enable row level security;
drop policy if exists "auth_all" on calculos_precio;
create policy "auth_all" on calculos_precio for all to authenticated using (true) with check (true);
