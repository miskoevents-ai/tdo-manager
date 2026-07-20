-- Quién creó cada movimiento de tesorería (auditoría rápida en la propia fila,
-- sin ir a Actividad). Se rellena con el usuario conectado al dar de alta el
-- movimiento; en ediciones NO se toca (sigue siendo el creador original).
-- Opcional: el server action tiene fallback tolerante.
alter table tesoreria add column if not exists creado_por text;
