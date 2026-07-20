-- Bitácora de seguimiento de una oportunidad: notas cronológicas del estado del
-- contacto ("presu enviado, esperando respuesta", "lo hablan entre ellos",
-- "les escribo el martes"…). Cada nota puede llevar un "recordar el <fecha>"
-- que dispara un aviso cuando llega. Autor = quién la escribió.
create table if not exists seguimientos (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  texto text not null,
  recordar date,
  autor text,
  created_at timestamptz not null default now()
);
create index if not exists idx_seguimientos_op on seguimientos(oportunidad_id);
