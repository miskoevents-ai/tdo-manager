-- Distinguir, dentro de la serie 'alquiler_encargo', entre ALQUILER (se
-- entrega y se devuelve, con fianza) y ENCARGO/PRODUCCIÓN (fabricación a
-- medida que se queda el cliente). Cambia las condiciones del presupuesto.
--   false / null = alquiler (comportamiento actual)
--   true         = encargo / producción
alter table oportunidades add column if not exists es_encargo boolean not null default false;
