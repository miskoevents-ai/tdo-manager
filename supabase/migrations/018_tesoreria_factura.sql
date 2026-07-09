-- Enlaza los movimientos de tesorería con su factura (para las facturas
-- creadas a mano, sin oportunidad, y para sincronizar el cobro).
alter table tesoreria add column if not exists factura_id uuid references facturas(id) on delete set null;
