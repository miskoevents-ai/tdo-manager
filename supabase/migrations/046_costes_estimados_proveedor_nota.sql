-- Proveedor y nota por línea del plan de costes previsto.
-- proveedor_id: de qué proveedor es el material/alquiler (para saber a quién
-- pagar y cuánto se le debe por evento). Enlaza con los datos de facturación.
-- nota: matiz libre de la línea ("confirmar color", "pendiente presupuesto…").
alter table costes_estimados
  add column if not exists proveedor_id uuid references proveedores(id) on delete set null;
alter table costes_estimados
  add column if not exists nota text;
