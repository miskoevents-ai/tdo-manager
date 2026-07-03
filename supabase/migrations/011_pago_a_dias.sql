-- ============================================================================
-- Migración 011 — Condiciones de pago por oportunidad: "pago a X días".
-- 0 = al momento (comportamiento de siempre). Si es 30, la alarma de cobro
-- pendiente no salta hasta que pasen 30 días del evento.
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

alter table oportunidades
  add column if not exists pago_a_dias int not null default 0;
