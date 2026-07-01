-- ============================================================================
-- Migración 002 — campos extra (canal, fecha de entrada, cómo contacta)
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

-- Oportunidades: fecha de entrada del lead y canal de captación
alter table oportunidades add column if not exists fecha_entrada date;
alter table oportunidades add column if not exists canal text;

-- Clientes: cómo contacta habitualmente
alter table clientes add column if not exists canal text;
