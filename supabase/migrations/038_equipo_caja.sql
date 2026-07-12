-- Hasta que exista la SL, una persona (Jero) actúa como caja de TDO: lo que
-- cobra y lo que paga ES el dinero de TDO, así que no genera cuentas
-- pendientes (ni reembolsos ni entregas) en "Cuentas con el equipo".
alter table equipo add column if not exists es_caja boolean not null default false;

-- Marcar a Jero como caja (nombre exacto sacado de la propia tabla).
update equipo
set es_caja = true
where activo
  and lower((regexp_split_to_array(btrim(nombre), '[\s(]+'))[1]) = 'jero';
