-- Boda Sara y Fernando · 14/11/2026 · Palacio de Miraflores de la Sierra.
-- Presupuesto Nº 063/2026 aceptado, total 1.400 € base. TRATO AL 50/50:
--   · 50% CON FACTURA: 700 € + IVA = 847 € (Factura 26015: Pago 1 30% 508,20 €
--     cobrado 21/07 + Pago 2 20% 338,80 € antes del 14/09).
--   · 50% AMIGOS (sin factura, sin IVA): 700 €.
--   → TOTAL al cliente 1.547 €. Cobrado 508,20 €. Pendiente 1.038,80 €.
-- (Pendiente de verificar el reparto exacto con Cristina.)
-- Idempotente: crea la opp si falta y (re)carga presupuesto, cobros y notas.
do $$
declare v_op uuid; v_cli uuid; v_lugar uuid;
begin
  select id, cliente_id into v_op, v_cli from oportunidades where numero = 'BODA-SF/2026';

  if v_op is null then
    insert into lugares (nombre, localidad, notas)
    values ('Palacio de Miraflores de la Sierra', 'Miraflores de la Sierra', 'Madrid.')
    returning id into v_lugar;

    insert into clientes (nombre, tipo, persona_contacto, nif_cif, direccion, origen, estado, canal, notas)
    values ('Sara y Fernando', 'particular', 'Fernando Marco Carballal', '51457029A',
            'C/ Mayorazgo de Duarte, 281', 'cliente_nuevo', 'cliente', 'otro',
            'Boda 14/11/2026 en Palacio de Miraflores de la Sierra. Factura 26015.')
    returning id into v_cli;

    insert into oportunidades
      (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento,
       fecha_confirmacion, n_invitados, iva_pct, retencion_pct, canal, cliente_id, lugar_id, notas)
    values ('BODA-SF/2026', 'Boda de Sara y Fernando — Palacio de Miraflores de la Sierra',
            'evento', 'boda', 'normal', 'confirmada', '2026-07-21', '2026-11-14', '2026-07-21',
            42, 21, 0, 'otro', v_cli, v_lugar, 'Factura 26015.')
    returning id into v_op;

    insert into tesoreria
      (concepto, tipo, naturaleza, categoria, importe, fecha, estado, metodo, oportunidad_id, cliente_id, computa_contabilidad, notas)
    values ('Pago 1 · Reserva de fecha (30%, con factura) boda Sara y Fernando (Factura 26015)', 'ingreso',
            'ingreso_factura', 'Pre-reserva', 508.20, '2026-07-21', 'cobrado', 'transferencia',
            v_op, v_cli, true, 'Ref. bancaria ST26X21148250807. Ordenante: Fernando Marco Carballal.');
  end if;

  -- Cliente: NIF y dirección (de la factura)
  update clientes set nif_cif = '51457029A', direccion = 'C/ Mayorazgo de Duarte, 281' where id = v_cli;

  -- Oportunidad: invitados + nota completa
  update oportunidades set
    n_invitados = 42,
    notas = 'Presupuesto Nº 063/2026 aceptado, total 1.400 € base. Trato al 50/50: 50% CON FACTURA (700 € + IVA = 847 €, Factura 26015: Pago 1 30% 508,20 € cobrado el 21/07 + Pago 2 20% 338,80 € antes del 14/09) y 50% SIN FACTURA / amigos (700 €, sin IVA). Total al cliente 1.547 €. Boda 14/11/2026, Palacio de Miraflores, 42 invitados. (Reparto pendiente de verificar con Cristina.)'
  where id = v_op;

  -- Presupuesto MIXTO: 50% con factura (700 + IVA) + 50% amigos (700 sin IVA) = 1.547 €
  delete from presupuesto_lineas where oportunidad_id = v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op, 'Decoración boda Sara y Fernando (presupuesto 063/2026): Rincón de Bienvenida, Seating plan fotográfico y Decoración de la ceremonia — incl. logística, montaje y coordinación · 50% CON FACTURA', 1, 700, 0, 'factura'),
    (v_op, 'Decoración boda Sara y Fernando (presupuesto 063/2026) · 50% SIN FACTURA (amigos, sin IVA)', 1, 700, 1, 'efectivo');

  -- Cobros previstos (el Pago 1 cobrado se queda intacto)
  delete from tesoreria where oportunidad_id = v_op and tipo = 'ingreso' and estado = 'previsto';
  insert into tesoreria
    (concepto, tipo, naturaleza, categoria, importe, fecha, estado, metodo, oportunidad_id, cliente_id, computa_contabilidad, notas) values
    ('Pago 2 · Segundo pago (20%, con factura) boda Sara y Fernando (Factura 26015)', 'ingreso', 'ingreso_factura', 'Cobro a plazos', 338.80, '2026-09-14', 'previsto', 'transferencia', v_op, v_cli, false, 'Vence antes del 14/09/2026.'),
    ('Pago amigos (50%, sin factura) boda Sara y Fernando', 'ingreso', 'amigos', 'Cobro amigos', 700, '2026-11-14', 'previsto', 'efectivo', v_op, v_cli, false, 'Parte sin factura (sin IVA). Fecha estimada (al evento): ajustar cuando se acuerde.');
end $$;
