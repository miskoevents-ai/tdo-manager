-- Datos de facturación de los proveedores (sugerencia de Jero): para tener a
-- mano lo que hace falta al recibir/casar sus facturas y al pagarles.
alter table proveedores add column if not exists razon_social text;
alter table proveedores add column if not exists nif text;
alter table proveedores add column if not exists direccion_fiscal text;
alter table proveedores add column if not exists iban text;
