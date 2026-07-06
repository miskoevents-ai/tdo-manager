-- ============================================================================
-- Migración 014 — Tareas del equipo (pestaña "Tareas").
-- Cualquiera del equipo asigna tareas a cualquiera (socios ↔ Cristina); la
-- persona asignada las marca en curso, hechas o "no puedo" con su comentario.
-- Pueden ir ligadas a un evento y tener fecha límite (si vence, avisa en
-- Inicio). Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  asignada_a text not null,
  creada_por text,
  prioridad text not null default 'normal',   -- baja | normal | alta | urgente
  estado text not null default 'pendiente',   -- pendiente | en_curso | hecha | no_puedo
  fecha_limite date,
  oportunidad_id uuid references oportunidades(id) on delete set null,
  comentario text,                            -- respuesta de quien la hace
  completada_en timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_tareas_estado on tareas(estado);
create index if not exists idx_tareas_asignada on tareas(asignada_a);
create index if not exists idx_tareas_fecha_limite on tareas(fecha_limite);

alter table tareas enable row level security;
drop policy if exists "auth_all" on tareas;
create policy "auth_all" on tareas for all to authenticated using (true) with check (true);
