-- Nuevo estado operativo "En producción", entre Confirmada y Realizada: la
-- venta está cerrada pero el trabajo sigue en marcha (se prepara el material,
-- se fabrica…). Facturar ya NO mueve el estado (se puede facturar por
-- adelantado); el estado sigue el TRABAJO. Hay que ejecutarlo en Supabase antes
-- de poder usar el estado nuevo (es un valor de enum, no una columna).
alter type oportunidad_estado add value if not exists 'en_produccion' before 'realizada';
