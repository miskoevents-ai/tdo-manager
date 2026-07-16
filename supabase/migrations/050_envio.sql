-- Envío de material producido (encargos que se mandan por mensajería).
-- Se marca al crear la oportunidad: si lleva envío, cuánto cuesta y si va
-- incluido en el precio o se le cobra aparte al cliente.
alter table oportunidades add column if not exists envio boolean not null default false;
alter table oportunidades add column if not exists envio_coste numeric;
alter table oportunidades add column if not exists envio_incluido boolean not null default true;
