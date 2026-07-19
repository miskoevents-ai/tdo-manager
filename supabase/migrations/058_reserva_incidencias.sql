-- Material reservado ≠ material que sale y vuelve. El estado "incidencia" ya
-- existía, pero no guardaba el detalle: cuántas unidades se rompieron o no
-- volvieron, de qué tipo y con qué coste de reposición. Estas columnas lo
-- registran (todas opcionales; el server action usa fallback tolerante).
alter table reservas_material add column if not exists cantidad_incidencia integer;
alter table reservas_material add column if not exists incidencia_tipo text;   -- rota | no_devuelta | danada
alter table reservas_material add column if not exists incidencia_nota text;
alter table reservas_material add column if not exists coste_incidencia numeric; -- coste de reposición / daño
