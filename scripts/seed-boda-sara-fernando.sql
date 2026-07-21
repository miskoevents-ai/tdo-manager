-- Nueva boda: Sara y Fernando · 14/11/2026 · Palacio de Miraflores de la Sierra.
-- Pre-reserva ya pagada (508,20 €, Factura 26015, transferencia de Fernando
-- Marco Carballal el 21/07/2026). Aún SIN presupuesto ni costes internos.
-- Crea cliente + lugar + oportunidad (confirmada) + el cobro de la pre-reserva.
do $$
declare v_cli uuid; v_lugar uuid; v_op uuid;
begin
  -- Cliente (la pareja; paga Fernando)
  insert into clientes (nombre, tipo, persona_contacto, origen, estado, canal, notas)
  values (
    'Sara y Fernando', 'particular', 'Fernando Marco Carballal', 'cliente_nuevo', 'cliente', 'otro',
    'Boda 14/11/2026 en Palacio de Miraflores de la Sierra. Pre-reserva pagada: 508,20 € por transferencia (Fernando Marco Carballal). Factura 26015. Ref. bancaria ST26X21148250807 (21/07/2026).'
  ) returning id into v_cli;

  -- Lugar
  insert into lugares (nombre, localidad, notas)
  values ('Palacio de Miraflores de la Sierra', 'Miraflores de la Sierra', 'Madrid.')
  returning id into v_lugar;

  -- Oportunidad (confirmada: han pagado la pre-reserva)
  insert into oportunidades
    (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento,
     fecha_confirmacion, iva_pct, retencion_pct, canal, cliente_id, lugar_id, notas)
  values (
    'BODA-SF/2026', 'Boda de Sara y Fernando — Palacio de Miraflores de la Sierra',
    'evento', 'boda', 'normal', 'confirmada', '2026-07-21', '2026-11-14',
    '2026-07-21', 21, 0, 'otro', v_cli, v_lugar,
    'Pre-reserva pagada: 508,20 € (Factura 26015, transferencia de Fernando Marco Carballal, 21/07/2026). Aún sin presupuesto cerrado ni costes internos.'
  ) returning id into v_op;

  -- Cobro de la pre-reserva → aparece en COBRADO y en Tesorería/Contabilidad
  insert into tesoreria
    (concepto, tipo, naturaleza, categoria, importe, fecha, estado, metodo, oportunidad_id, cliente_id, computa_contabilidad, notas)
  values (
    'Pre-reserva boda Sara y Fernando (Factura 26015)', 'ingreso', 'ingreso_factura', 'Pre-reserva',
    508.20, '2026-07-21', 'cobrado', 'transferencia', v_op, v_cli, true,
    'Ref. bancaria ST26X21148250807. Ordenante: Fernando Marco Carballal. Beneficiario: Jerónimo Alonso Marcos (Abanca → Santander).'
  );
end $$;
