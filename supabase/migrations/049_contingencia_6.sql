-- Contingencia de referencia al 6% (decisión socios, jul 2026): incluye
-- imprevistos, inflación de materiales y también las roturas/mermas (el 3%
-- de mermas desaparece como concepto separado).

-- Nuevas oportunidades: 6% por defecto.
alter table oportunidades alter column contingencia_pct set default 6;

-- Las existentes que estaban en el 5% antiguo (default, nadie lo eligió a
-- mano) pasan al 6 de referencia. Un valor distinto de 5 se respeta.
update oportunidades set contingencia_pct = 6 where contingencia_pct = 5;

-- Parámetros guardados de la calculadora (si el equipo los guardó alguna
-- vez): contingencia 6 y mermas 0, para que no pisen los nuevos defaults.
update ajustes
set valor = (
  jsonb_set(jsonb_set(valor::jsonb, '{contingenciaPct}', '6'), '{mermasPct}', '0')
)::text
where clave = 'calculadora_precio';
