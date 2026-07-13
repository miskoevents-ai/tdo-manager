-- Firma de autoría: quién creó cada oportunidad y cada factura (nombre visible
-- del usuario conectado). Complementa el registro global de actividad con la
-- autoría en la propia ficha.
alter table oportunidades add column if not exists creado_por text;
alter table facturas add column if not exists creado_por text;

-- Corrección: Cris es socia (admin), no colaboradora. (Cristina es otra persona.)
update usuarios set es_admin = true where usuario = 'cris';
