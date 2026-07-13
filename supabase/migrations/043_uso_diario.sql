-- Tiempo de uso por día y usuario, para poder calcular totales por semana
-- (lunes-domingo). Una fila por usuario y día; los latidos van sumando.
create table if not exists uso_diario (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  dia date not null,
  segundos bigint not null default 0,
  unique (usuario, dia)
);
create index if not exists idx_uso_diario_dia on uso_diario(dia);

alter table uso_diario enable row level security;
drop policy if exists "auth_all" on uso_diario;
create policy "auth_all" on uso_diario for all to authenticated using (true) with check (true);
