-- ============================================================================
-- Migración 010 — Reuniones con clientes (presenciales u online) ligadas a
-- cada oportunidad: quién la atiende, enlace de videollamada y notas.
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

create table if not exists reuniones (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  fecha date not null,
  hora time,
  modalidad text not null default 'presencial',  -- presencial | online
  atendida_por text,                             -- nombre del socio/equipo que la atiende
  enlace text,                                   -- link de Teams/Meet/Zoom si es online
  lugar text,                                    -- dónde, si es presencial
  notas text,
  realizada boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_reuniones_oportunidad on reuniones(oportunidad_id);
create index if not exists idx_reuniones_fecha on reuniones(fecha);

alter table reuniones enable row level security;
drop policy if exists "auth_all" on reuniones;
create policy "auth_all" on reuniones for all to authenticated using (true) with check (true);
