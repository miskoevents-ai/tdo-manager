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
    ('ingreso_factura','gasto_fijo','gasto_de_evento','inversion','comision','personal','amigos','otro');
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
  canal text,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  localidad text,
  distancia_km numeric,
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
  fianza_especial boolean not null default false,
  ubicacion text,
  estado text not null default 'disponible',
  foto_url text,
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
  fecha_entrada date,
  canal text,
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
  fecha_devolucion_fianza date,
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
  proveedor_id uuid,
  factura_id uuid references facturas(id) on delete set null,
  gasto_fijo_id uuid references gastos_fijos(id) on delete set null,
  computa_contabilidad boolean not null default true,
  created_at timestamptz not null default now()
);

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

create table if not exists comisiones_config (
  id uuid primary key default gen_random_uuid(),
  tipo_evento text,
  equipo_id uuid references equipo(id) on delete cascade,
  porcentaje numeric not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists comisiones (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  equipo_id uuid references equipo(id) on delete set null,
  base numeric not null default 0,
  porcentaje numeric not null default 0,
  importe numeric not null default 0,
  estado text not null default 'pendiente',
  fecha_devengo date,
  pagada_el date,
  tesoreria_id uuid references tesoreria(id) on delete set null,
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
    'oportunidades','presupuesto_lineas','facturas','tesoreria',
    'proveedores','comisiones_config','comisiones'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format(
      'create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- FASE 3 (Operativa): reservas, packs, logística, desplazamientos, horas
-- ---------------------------------------------------------------------------
create table if not exists reservas_material (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  articulo_id uuid references inventario(id) on delete cascade,
  cantidad int not null default 1,
  fecha_salida date, fecha_devolucion date,
  estado text not null default 'reservado',
  notas text, created_at timestamptz not null default now()
);
create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, descripcion text,
  descuento_pct numeric not null default 0, precio numeric,
  activo boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid references packs(id) on delete cascade,
  articulo_id uuid references inventario(id) on delete cascade,
  cantidad int not null default 1
);
alter table presupuesto_lineas add column if not exists modo_entrega text;
alter table presupuesto_lineas add column if not exists km numeric;
alter table presupuesto_lineas add column if not exists horas_desplazamiento numeric;
alter table presupuesto_lineas add column if not exists articulo_id uuid references inventario(id) on delete set null;
create table if not exists desplazamientos (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  trayecto text, km numeric, ida_vuelta boolean not null default true,
  coste_gasolina numeric, peaje numeric, parking numeric,
  tesoreria_id uuid references tesoreria(id) on delete set null,
  fecha date, notas text, created_at timestamptz not null default now()
);

create table if not exists ajustes (
  clave text primary key,
  valor text,
  updated_at timestamptz not null default now()
);
create table if not exists partes_horas (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  equipo_id uuid references equipo(id) on delete set null,
  fecha date, tarea text, horas numeric not null default 0, precio_hora numeric not null default 0,
  notas text, created_at timestamptz not null default now()
);
do $$
declare t text;
begin
  foreach t in array array['reservas_material','packs','pack_items','desplazamientos','partes_horas','ajustes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
