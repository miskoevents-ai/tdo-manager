-- Fotos de referencia / inspiración de una oportunidad (moodboard). Cristina
-- sube imágenes de lo que quiere el cliente o de montajes de referencia. Se
-- guardan en el bucket público "tickets" (carpeta referencias/<opp>/), y aquí
-- va el enlace + una nota opcional. Varias por oportunidad.
create table if not exists oportunidad_fotos (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  url text not null,
  nota text,
  created_at timestamptz not null default now()
);
create index if not exists idx_oportunidad_fotos_op on oportunidad_fotos(oportunidad_id);
