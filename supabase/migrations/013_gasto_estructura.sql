-- ============================================================================
-- Migración 013 — Nueva naturaleza de movimiento: gasto de estructura
-- (gastos generales del negocio que no son fijos ni de un evento concreto:
-- reparaciones, herramientas, gestoría puntual, etc.).
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

alter type tesoreria_naturaleza add value if not exists 'gasto_estructura';
