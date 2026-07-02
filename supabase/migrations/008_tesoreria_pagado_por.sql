-- 008 · "Pagado por" en los movimientos de tesorería.
-- Permite registrar quién adelantó/pagó un gasto (miembro del equipo o alguien
-- externo), para saber a quién hay que reembolsar. Texto libre para admitir
-- nombres externos; el formulario ofrece el equipo en un desplegable.

alter table tesoreria
  add column if not exists quien_lo_paga text;
