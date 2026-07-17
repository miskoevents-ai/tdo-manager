-- Mejoras a partir del proyecto Dakari / Teatro Real (eventos grandes,
-- multizona, con subcontratas y logística compleja).

-- 1. Zona/espacio de un coste estimado (Entrada, Lobby, Planta 1…).
alter table costes_estimados add column if not exists zona text;

-- 2. Coste "por confirmar": pendiente del precio de un proveedor (p. ej. una
--    estantería a medida). Cuenta en el total pero marca el presu no definitivo.
alter table costes_estimados add column if not exists por_confirmar boolean not null default false;

-- 3. Horas de montaje y desmontaje (no solo fechas): un Teatro Real es
--    montaje 7:00-15:00 y desmontaje 00:00. Texto libre y flexible.
alter table oportunidades add column if not exists hora_montaje text;
alter table oportunidades add column if not exists hora_desmontaje text;

-- 5. Logística/accesos del evento (muelle de carga, horarios, restricciones
--    del recinto). Por evento, porque cambia según el montaje.
alter table oportunidades add column if not exists logistica text;

-- 4. Persona de contacto dentro de un cliente empresa/agencia (p. ej. la
--    agencia es Dakari pero quien coordina es María Freire).
alter table clientes add column if not exists persona_contacto text;
