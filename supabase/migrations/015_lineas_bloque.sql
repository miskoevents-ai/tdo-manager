-- ============================================================================
-- Migración 015 — Bloques en las líneas de presupuesto ("Bloque 1 ·
-- Decoración", "Bloque 2 · Alquiler de material"…), como en los presupuestos
-- reales. Opcional: sin bloque, todo se ve como hasta ahora.
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

alter table presupuesto_lineas
  add column if not exists bloque text;
