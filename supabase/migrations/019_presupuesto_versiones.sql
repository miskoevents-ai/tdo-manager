-- Versiones guardadas del presupuesto (V1, V2, V3…): fotos fijas de las
-- líneas en un momento dado, para conservar lo que se envió al cliente y
-- poder volver atrás. El presupuesto "vivo" sigue en presupuesto_lineas.
create table if not exists presupuesto_versiones (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  version int not null,
  notas text,
  iva_pct numeric not null default 21,
  retencion_pct numeric not null default 0,
  lineas jsonb not null,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (oportunidad_id, version)
);
