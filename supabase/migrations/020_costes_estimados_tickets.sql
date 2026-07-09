-- Estimación de costes previa al presupuesto (escandallo previsto): sirve
-- para cuadrar el precio del cliente con contingencia y margen objetivo.
-- NO toca la contabilidad: los costes reales siguen siendo los de
-- partes/desplazamientos/compras, que sí van a tesorería.
create table if not exists costes_estimados (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  concepto text not null,
  importe numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table costes_estimados enable row level security;

-- Parámetros de la estimación, por oportunidad.
alter table oportunidades add column if not exists contingencia_pct numeric not null default 5;
alter table oportunidades add column if not exists margen_objetivo_pct numeric not null default 35;

-- Ticket/justificante adjunto a un movimiento (foto del ticket en Storage).
alter table tesoreria add column if not exists ticket_url text;

-- Bucket público para los tickets.
insert into storage.buckets (id, name, public) values ('tickets', 'tickets', true)
on conflict (id) do nothing;

-- Cierre del evento: al validar los gastos post-evento, la ficha de costes
-- queda congelada y el margen es el definitivo.
alter table oportunidades add column if not exists cerrada boolean not null default false;
alter table oportunidades add column if not exists cerrada_fecha date;
