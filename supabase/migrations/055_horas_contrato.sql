-- Horas de contrato semanales de una persona del equipo. Sirven para derivar
-- su coste real por hora a partir del sueldo vigente del mes:
--   €/hora = sueldo del mes ÷ (horas_semana × 52/12)
-- Así, cuando cambia el sueldo (p. ej. Cristina 1000 € jul-ago → 2150 € sep),
-- las horas imputadas a eventos se revalorizan solas. Vacío = se usa el €/hora
-- fijo de la ficha (colaboradores externos que cobran por trabajo).
alter table equipo add column if not exists horas_semana numeric;
