-- Reparto de cobro para alquileres/encargos.
-- Qué % del importe se cobra "con factura"; el resto (100 - pct_factura) se
-- cobra "como amigos" (en efectivo, sin factura). Solo tiene sentido cuando
-- serie = 'alquiler_encargo'. Por defecto 25% con factura, siempre editable.
-- No se muestra en el presupuesto; sí en el email al cliente.
alter table oportunidades add column if not exists pct_factura integer default 25;
