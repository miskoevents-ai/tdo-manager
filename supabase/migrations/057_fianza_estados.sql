-- Fianzas: más allá de "devuelta / no devuelta". Ahora se distingue si la
-- fianza se ha COBRADO al cliente (la tenemos en depósito) y si, al final, se
-- ha RETENIDO por daños (no se devuelve → pasa a ser un ingreso de TDO).
--
-- Estados derivados (no hay columna de estado, se calculan):
--   · fianza > 0 y NO cobrada            → "Pendiente de cobro"
--   · cobrada, sin devolver ni retener   → "En depósito"
--   · fianza_devuelta                    → "Devuelta" (o "Parcial" si se retuvo algo)
--   · fianza_retenida_importe > 0        → "Retenida por daños"
--
-- fianza_cobrada por defecto TRUE: la mayoría de fianzas se cobran con la seña,
-- y así no se rompen los avisos ni los datos ya existentes (se desmarca a mano
-- si todavía no se ha recibido).
alter table oportunidades add column if not exists fianza_cobrada boolean default true;
alter table oportunidades add column if not exists fianza_retenida_importe numeric;
alter table oportunidades add column if not exists fianza_retenida_motivo text;
