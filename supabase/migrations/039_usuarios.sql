-- ============================================================================
-- Migración 039 — Usuarios individuales y registro de actividad.
-- Cada socio entra con su usuario y contraseña, y queda registrado quién
-- hace cada cosa. La contraseña compartida (APP_PASSWORD) sigue valiendo
-- como respaldo. El hash es SHA-256 de `tdo·user·<usuario>·<contraseña>·v1`
-- (mismo cálculo que hace el login en la app).
-- ============================================================================

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,          -- para entrar (minúsculas)
  nombre text not null,                  -- nombre visible ("Jero")
  password_hash text not null,
  activo boolean not null default true,
  es_admin boolean not null default false,
  equipo_id uuid references equipo(id) on delete set null,
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now()
);

-- Alta de los socios con contraseñas temporales (cámbialas al entrar):
--   jero  → jero-tdo-26      cris → cris-tdo-26      sarmi → sarmi-tdo-26
insert into usuarios (usuario, nombre, password_hash, es_admin) values
  ('jero',  'Jero',  '8bff858355ee31f774f424d2cde406131c63ceb2f191df32f02df1d90e253213', true),
  ('cris',  'Cris',  'a14f57bede4126a81f88ccb1440ce695205086e293879b5e1bdc173b750dda48', true),
  ('sarmi', 'Sarmi', '2c17e0d3ab6809ef61a28f11251e6295ec84c443ab2bef057292b77cf99910bb', true)
on conflict (usuario) do nothing;

-- Registro de actividad: quién hizo qué y cuándo.
create table if not exists registro_actividad (
  id uuid primary key default gen_random_uuid(),
  usuario text,                          -- nombre visible de quien lo hizo
  accion text not null,                  -- p. ej. "creó una oportunidad"
  entidad text,                          -- "oportunidad" | "factura" | ...
  entidad_id text,
  detalle text,                          -- resumen legible
  created_at timestamptz not null default now()
);
create index if not exists idx_registro_actividad_fecha on registro_actividad(created_at desc);

alter table usuarios enable row level security;
alter table registro_actividad enable row level security;
drop policy if exists "auth_all" on usuarios;
create policy "auth_all" on usuarios for all to authenticated using (true) with check (true);
drop policy if exists "auth_all" on registro_actividad;
create policy "auth_all" on registro_actividad for all to authenticated using (true) with check (true);
