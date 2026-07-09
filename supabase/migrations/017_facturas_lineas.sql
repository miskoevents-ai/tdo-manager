-- Foto fija de las líneas facturadas: la factura guarda sus propias líneas
-- en el momento de emitirse, para que el documento no cambie aunque después
-- se toque el presupuesto.
alter table facturas add column if not exists lineas jsonb;
