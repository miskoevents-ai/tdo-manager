-- Subproyectos / elementos de un evento (p. ej. "Carpa Beduina", "Green Patio").
-- Se guardan como lista ordenada con su color en la propia oportunidad; las
-- líneas de coste pertenecen a un subproyecto por su `zona` (= nombre). Así no
-- hace falta tabla ni relación nueva: el color/orden es solo metadato visual.
--   [{ "nombre": "Carpa Beduina", "color": "#C08A2E" }, ...]
alter table oportunidades add column if not exists subproyectos jsonb;
