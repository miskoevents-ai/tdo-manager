-- ============================================================================
-- Migración 012 — Fecha de vencimiento en facturas. Al emitir una factura se
-- calcula con las condiciones de pago de la oportunidad (pago_a_dias), p. ej.
-- emisión + 30 días. Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

alter table facturas
  add column if not exists fecha_vencimiento date;
