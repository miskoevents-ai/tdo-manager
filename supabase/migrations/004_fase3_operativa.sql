-- ============================================================================
-- Migración 004 — FASE 3 (Operativa): inventario, reservas, packs, logística,
-- desplazamientos y partes de horas. Ejecutar en Supabase → SQL Editor → Run.
-- Idempotente.
-- ============================================================================

-- Inventario: estado, foto y fianza especial
alter table inventario add column if not exists estado text not null default 'disponible';
alter table inventario add column if not exists foto_url text;
alter table inventario add column if not exists fianza_especial boolean not null default false;

-- Reservas de material (disponibilidad por fechas)
create table if not exists reservas_material (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  articulo_id uuid references inventario(id) on delete cascade,
  cantidad int not null default 1,
  fecha_salida date,
  fecha_devolucion date,
  estado text not null default 'reservado',   -- reservado | entregado | devuelto | incidencia
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_reservas_articulo on reservas_material(articulo_id);
create index if not exists idx_reservas_oportunidad on reservas_material(oportunidad_id);

-- Packs con descuento
create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  descuento_pct numeric not null default 0,
  precio numeric,                             -- precio fijo opcional (si no, suma con descuento)
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid references packs(id) on delete cascade,
  articulo_id uuid references inventario(id) on delete cascade,
  cantidad int not null default 1
);

-- Logística por línea de presupuesto
alter table presupuesto_lineas add column if not exists modo_entrega text;  -- recogida_en_local | entrega
alter table presupuesto_lineas add column if not exists km numeric;
alter table presupuesto_lineas add column if not exists horas_desplazamiento numeric;
alter table presupuesto_lineas add column if not exists articulo_id uuid references inventario(id) on delete set null;

-- Desplazamientos por evento (alimentan gasto_de_evento)
create table if not exists desplazamientos (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  trayecto text,
  km numeric,
  coste_gasolina numeric,
  peaje numeric,
  parking numeric,
  fecha date,
  notas text,
  created_at timestamptz not null default now()
);

-- Partes de horas del equipo
create table if not exists partes_horas (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  equipo_id uuid references equipo(id) on delete set null,
  fecha date,
  tarea text,
  horas numeric not null default 0,
  precio_hora numeric not null default 0,
  notas text,
  created_at timestamptz not null default now()
);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['reservas_material','packs','pack_items','desplazamientos','partes_horas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
