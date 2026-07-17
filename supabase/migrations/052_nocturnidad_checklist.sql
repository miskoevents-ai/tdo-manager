-- Más mejoras del caso Dakari/Teatro Real.

-- Recargo % sobre una línea de coste (mano de obra nocturna, festivos…).
-- El importe = cantidad × precio × (1 + recargo/100).
alter table costes_estimados add column if not exists recargo_pct numeric;

-- Checklist de logística/requisitos del recinto (por evento): seguros, ART,
-- permisos, cargas y descargas, parking, montacargas, normativa de decoración…
alter table oportunidades add column if not exists logistica_checklist jsonb;
