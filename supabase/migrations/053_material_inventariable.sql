-- Material que se queda (Opción C): distinguir el material que se consume del
-- que pasa a ser stock reutilizable (macetas, mobiliario, estructuras…).

-- Marca la línea de coste como material reutilizable (inversión en inventario).
alter table costes_estimados add column if not exists se_queda boolean not null default false;

-- Nº de usos previstos para amortizar (opcional): el evento carga importe/usos,
-- el resto es inversión. Vacío = se etiqueta como inversión pero sin amortizar.
alter table costes_estimados add column if not exists usos_previstos integer;

-- Enlace a la pieza de inventario si se dio de alta (evita duplicar el alta).
alter table costes_estimados add column if not exists inventario_id uuid;
