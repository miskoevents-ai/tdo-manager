-- 032 · Cobros recibidos por una persona del equipo.
-- Cuando un ingreso lo recibe directamente alguien del equipo (p. ej. Jero
-- cobra en mano), se anota quién lo tiene. Ese dinero es una deuda de esa
-- persona hacia TDO hasta que lo entrega (liquidado = true).

alter table tesoreria add column if not exists cobrado_por text;
alter table tesoreria add column if not exists liquidado boolean default false;

-- Los gastos fijos pueden pagarse por la caja oficial o la de amigos (y por una
-- persona concreta, que ya se guardaba en quien_lo_paga). Además tienen
-- vigencia por mes: 'desde' (primer mes en que aplican) y 'hasta' (último);
-- vacío = sin límite. Así junio, julio y septiembre pueden tener gastos
-- distintos.
alter table gastos_fijos add column if not exists caja text;
alter table gastos_fijos add column if not exists desde date;
alter table gastos_fijos add column if not exists hasta date;
