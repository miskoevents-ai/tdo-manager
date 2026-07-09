-- El cuadre guarda también el importe real con el que se validó cada línea
-- prevista: así se ve la desviación línea a línea y se pueden sacar datos de
-- qué partidas calculamos bien o mal.
alter table costes_estimados add column if not exists importe_real numeric;
