-- 028 · Caja de los costes del evento.
-- Cada gasto del evento puede salir de la caja oficial de TDO o de la caja
-- de amigos. Se guarda en el estimado (para recordarlo al cuadrar) — el
-- movimiento real ya distingue la caja con su naturaleza ('amigos' vs
-- 'gasto_de_evento').

alter table costes_estimados add column if not exists caja text;
