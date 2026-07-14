-- Fecha en que se marcó el presupuesto como enviado al cliente. Sirve para
-- medir "presupuesto sin respuesta" desde el envío real, no desde la entrada
-- del lead (que puede ser muy anterior).
alter table oportunidades
  add column if not exists presupuesto_enviado_fecha date;
