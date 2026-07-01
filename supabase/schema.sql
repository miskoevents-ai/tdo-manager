-- ============================================================================
-- TDO Manager — Esquema Postgres (Fase 1 + tablas base para el seed)
-- Basado en el spec maestro §4 + addenda v1.1/v1.2.
-- Ejecutar en Supabase: SQL Editor → pegar → Run.
-- Idempotente: se puede re-ejecutar (usa IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type cliente_tipo as enum ('particular','empresa','finca_venue','wedding_planner','sin_clasificar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cliente_origen as enum ('cliente_previo','cliente_nuevo','amigo_jero','por_confirmar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cliente_estado as enum ('lead','cliente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type oportunidad_estado as enum
    ('nueva','contestada','en_conversacion','presupuesto_enviado','confirmada','realizada','facturada','perdida','descartada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type oportunidad_serie as enum ('evento','alquiler_encargo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_operacion as enum ('normal','amigos_prestamo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_evento as enum
    ('boda','comunion','corporativo','cumpleanos','bautizo','navidad','alquiler_encargo','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type factura_estado as enum ('emitida','cobrada','vencida','anulada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tesoreria_tipo as enum ('ingreso','gasto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tesoreria_naturaleza as enum
    ('ingreso_factura','gasto_fijo','gasto_de_evento','inversion','amigos','otro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------------

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo cliente_tipo not null default 'sin_clasificar',
  email text,
  telefono text,
  nif_cif text,
  direccion text,
  localidad text,
  origen cliente_origen not null default 'cliente_nuevo',
  estado cliente_estado not null default 'lead',
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  localidad text,
  notas text
);

create table if not exists equipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rol text,
  email text,
  telefono text,
  porcentaje numeric,
  precio_hora numeric,
  activo boolean not null default true,
  notas text
);

create table if not exists inventario (
  id uuid primary key default gen_random_uuid(),
  articulo text not null,
  categoria text,
  cantidad_total int,
  coste_unitario numeric,
  precio_alquiler numeric,
  fianza_sugerida numeric,
  ubicacion text,
  notas text
);

create table if not exists gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  importe_mensual numeric not null default 0,
  periodicidad text not null default 'mensual',
  dia_cargo int,
  quien_lo_paga text,
  activo boolean not null default true,
  notas text
);

create table if not exists oportunidades (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  titulo text not null,
  serie oportunidad_serie not null default 'evento',
  tipo_evento tipo_evento not null default 'otro',
  tipo_operacion tipo_operacion not null default 'normal',
  estado oportunidad_estado not null default 'nueva',
  presupuesto_enviado boolean not null default false,
  fecha_presupuesto date,
  fecha_evento date,
  fecha_montaje date,
  fecha_recogida date,
  responsable text,
  n_invitados int,
  iva_pct numeric not null default 21,
  retencion_pct numeric not null default 0,
  fianza numeric,
  fianza_devuelta boolean not null default false,
  cliente_id uuid references clientes(id) on delete set null,
  lugar_id uuid references lugares(id) on delete set null,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_oportunidades_cliente on oportunidades(cliente_id);
create index if not exists idx_oportunidades_estado on oportunidades(estado);

create table if not exists presupuesto_lineas (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  concepto text not null,
  cantidad numeric not null default 1,
  precio_unitario numeric not null default 0,
  subtotal numeric generated always as (cantidad * precio_unitario) stored,
  orden int not null default 0
);
create index if not exists idx_lineas_oportunidad on presupuesto_lineas(oportunidad_id);

create table if not exists facturas (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  oportunidad_id uuid references oportunidades(id) on delete set null,
  cliente_id uuid references clientes(id) on delete set null,
  fecha_emision date not null default current_date,
  base_imponible numeric not null default 0,
  iva numeric not null default 0,
  retencion numeric not null default 0,
  total numeric not null default 0,
  estado factura_estado not null default 'emitida',
  pdf_url text,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists idx_facturas_cliente on facturas(cliente_id);

create table if not exists tesoreria (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  tipo tesoreria_tipo not null,
  naturaleza tesoreria_naturaleza not null default 'otro',
  categoria text,
  importe numeric not null check (importe >= 0),
  fecha date not null,
  estado text not null default 'previsto',
  metodo text,
  n_factura text,
  notas text,
  cliente_id uuid references clientes(id) on delete set null,
  oportunidad_id uuid references oportunidades(id) on delete set null,
  factura_id uuid references facturas(id) on delete set null,
  gasto_fijo_id uuid references gastos_fijos(id) on delete set null,
  computa_contabilidad boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_tesoreria_oportunidad on tesoreria(oportunidad_id);
create index if not exists idx_tesoreria_fecha on tesoreria(fecha);

-- ---------------------------------------------------------------------------
-- RLS: la app accede vía secret key (bypassa RLS). Anon queda denegado.
-- Se dejan políticas para 'authenticated' de cara al login (los 3 socios).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','lugares','equipo','inventario','gastos_fijos',
    'oportunidades','presupuesto_lineas','facturas','tesoreria'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format(
      'create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
