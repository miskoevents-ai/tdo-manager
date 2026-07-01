-- 006 · Enlaza líneas de presupuesto con artículos del inventario (catálogo).
-- Permite presupuestar eligiendo del catálogo (precio automático) y, más
-- adelante, mostrar la foto del artículo en el presupuesto.

alter table presupuesto_lineas
  add column if not exists articulo_id uuid references inventario(id) on delete set null;

create index if not exists idx_lineas_articulo on presupuesto_lineas(articulo_id);
