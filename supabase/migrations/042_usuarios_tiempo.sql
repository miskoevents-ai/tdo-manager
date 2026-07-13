-- Tiempo total (en segundos) que cada usuario pasa con la plataforma abierta y
-- en primer plano. Se acumula con "latidos" desde el navegador (solo mientras
-- la pestaña está visible), por mera curiosidad del equipo.
alter table usuarios add column if not exists segundos_activo bigint not null default 0;
