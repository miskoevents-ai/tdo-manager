-- 007 · Fecha de confirmación (para medir el tiempo hasta el cierre).
-- Se rellena automáticamente cuando una oportunidad pasa a confirmada/realizada/
-- facturada por primera vez.

alter table oportunidades
  add column if not exists fecha_confirmacion date;
