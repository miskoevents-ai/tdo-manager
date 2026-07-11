-- 027 · Descuentos en presupuestos y facturas.
-- Cada línea puede llevar su % de descuento, y además la oportunidad puede
-- tener un descuento global (sobre toda la base, antes de IVA). La factura
-- congela el descuento global con el que se emitió, y las versiones de
-- presupuesto también.

alter table presupuesto_lineas add column if not exists descuento_pct numeric;
alter table oportunidades add column if not exists descuento_pct numeric;
alter table facturas add column if not exists descuento_pct numeric;
alter table presupuesto_versiones add column if not exists descuento_pct numeric;
