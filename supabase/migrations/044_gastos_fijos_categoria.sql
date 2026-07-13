-- ============================================================================
-- Migración 044 — Categorías de gastos fijos y su enlace.
-- Cada gasto fijo pasa a tener categoría y, según ella, un beneficiario del
-- equipo (sueldos) o un proveedor (servicios/tecnología/…). Así:
--   · el sueldo queda enlazado a la persona (Equipo/Sueldos, sin adivinar),
--   · el gasto recurrente aparece en la ficha del proveedor.
-- ============================================================================

alter table gastos_fijos add column if not exists categoria text;
alter table gastos_fijos add column if not exists equipo_id uuid references equipo(id) on delete set null;
alter table gastos_fijos add column if not exists proveedor_id uuid references proveedores(id) on delete set null;

-- ---- Recategorización de los gastos fijos actuales (por concepto) ----
update gastos_fijos set categoria = 'suministros'
  where categoria is null and (concepto ilike 'agua%' or concepto ilike 'luz%' or concepto ilike '%basura%' or concepto ilike '%gas%');
update gastos_fijos set categoria = 'tecnologia'
  where categoria is null and (concepto ilike 'claude%' or concepto ilike 'microsoft%' or concepto ilike '%web%' or concepto ilike '%software%');
update gastos_fijos set categoria = 'servicios'
  where categoria is null and (concepto ilike 'gestor%' or concepto ilike 'limpieza%' or concepto ilike 'mantenim%');
update gastos_fijos set categoria = 'impuestos'
  where categoria is null and (concepto ilike 'impuesto%' or concepto ilike 'tasa%' or concepto ilike 'src%');
update gastos_fijos set categoria = 'local'
  where categoria is null and concepto ilike 'local%';
update gastos_fijos set categoria = 'marketing'
  where categoria is null and (concepto ilike 'rrss%' or concepto ilike '%campañ%' or concepto ilike '%publicidad%');
update gastos_fijos set categoria = 'seguros'
  where categoria is null and concepto ilike 'seguro%';
update gastos_fijos set categoria = 'telefonia'
  where categoria is null and (concepto ilike '%adsl%' or concepto ilike 'tel%' or concepto ilike '%internet%' or concepto ilike '%fibra%');
update gastos_fijos set categoria = 'sueldo'
  where categoria is null and concepto ilike 'sueldo%';

-- Enlaza el sueldo con su persona: coincidencia por PRIMERA PALABRA del nombre
-- como palabra completa en el concepto ("Cris" no cuela en "Sueldo Cristina").
update gastos_fijos g
  set equipo_id = e.id
  from equipo e
  where g.categoria = 'sueldo' and g.equipo_id is null and e.activo
    and (' ' || lower(g.concepto) || ' ')
        like ('% ' || lower((regexp_split_to_array(btrim(e.nombre), '[\s(]+'))[1]) || ' %');

-- Lo que quede, a "Otros".
update gastos_fijos set categoria = 'otros' where categoria is null;
