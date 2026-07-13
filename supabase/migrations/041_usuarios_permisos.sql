-- Permisos por sección: a qué pestañas puede entrar cada usuario. Es una lista
-- de "claves de sección" (p. ej. '/tesoreria'). Reglas:
--   · Los administradores ven TODO (este campo se ignora para ellos).
--   · Si permisos es NULL, el usuario ve todo (comportamiento anterior).
--   · Si es una lista, solo ve Inicio + Guía + las secciones incluidas.
alter table usuarios add column if not exists permisos text[];
