-- Cuadre pre → post: una línea estimada se marca como "cuadrada" cuando se
-- pasa a los costes reales (tal cual o con el importe ajustado).
alter table costes_estimados add column if not exists cuadrado boolean not null default false;
