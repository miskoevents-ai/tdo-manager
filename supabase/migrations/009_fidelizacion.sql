-- 009 · Fidelización: seguimiento de reseñas y recomendaciones.
-- Permite registrar, por evento, si se ha pedido/conseguido reseña; y por
-- cliente, si se le ha pedido recomendación y si ya nos ha recomendado.
-- Todo aditivo y con valor por defecto, así que es seguro.

alter table oportunidades
  add column if not exists resena_pedida boolean not null default false,
  add column if not exists resena_conseguida boolean not null default false;

alter table clientes
  add column if not exists recomendacion_pedida boolean not null default false,
  add column if not exists nos_ha_recomendado boolean not null default false;
