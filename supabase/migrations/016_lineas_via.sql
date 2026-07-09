-- ============================================================================
-- Migración 016 — Vía de cobro por línea de presupuesto: 'factura' (con IVA,
-- contabilidad oficial) o 'efectivo' (sin IVA, vista de amigos). Permite
-- presupuestos mixtos: parte facturada y parte en efectivo, cuadrando ambas
-- contabilidades. Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

alter table presupuesto_lineas
  add column if not exists via text not null default 'factura';
