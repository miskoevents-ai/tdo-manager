-- ============================================================================
-- Migración 003 — Proveedores y Comisiones (Fase 2)
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

-- Naturalezas nuevas para tesorería (comisión / personal)
alter type tesoreria_naturaleza add value if not exists 'comision';
alter type tesoreria_naturaleza add value if not exists 'personal';

-- Enlace de proveedor en tesorería
alter table tesoreria add column if not exists proveedor_id uuid;

-- Proveedores
create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo_servicio text,
  contacto text,
  email text,
  telefono text,
  localidad text,
  notas text,
  created_at timestamptz not null default now()
);

-- % de comisión configurables (por tipo de evento y persona). Editable.
create table if not exists comisiones_config (
  id uuid primary key default gen_random_uuid(),
  tipo_evento text,          -- null = aplica a cualquier tipo
  equipo_id uuid references equipo(id) on delete cascade,
  porcentaje numeric not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Comisiones devengadas / pagadas
create table if not exists comisiones (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  equipo_id uuid references equipo(id) on delete set null,
  base numeric not null default 0,
  porcentaje numeric not null default 0,
  importe numeric not null default 0,
  estado text not null default 'pendiente',   -- pendiente | pagada
  fecha_devengo date,
  pagada_el date,
  tesoreria_id uuid references tesoreria(id) on delete set null,
  created_at timestamptz not null default now()
);

-- FK de proveedor (si no existe)
do $$ begin
  alter table tesoreria
    add constraint tesoreria_proveedor_fk
    foreign key (proveedor_id) references proveedores(id) on delete set null;
exception when duplicate_object then null; end $$;

-- RLS
do $$
declare t text;
begin
  foreach t in array array['proveedores','comisiones_config','comisiones'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
