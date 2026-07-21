-- Boda Sara y Fernando · 14/11/2026 · Palacio de Miraflores de la Sierra.
-- Presupuesto Nº 063/2026 aceptado (1.400 € base → 1.694 € c/IVA).
-- Factura 26015: Pago 1 (30%) 508,20 € cobrado + Pago 2 (20%) 338,80 € antes
-- del 14/09/2026. El otro 50% (~847 €) queda por facturar.
--
-- Este script se puede ejecutar aunque no hubieras corrido el seed anterior:
-- crea lo que falte y actualiza el resto. Idempotente.
do $$
declare v_op uuid; v_cli uuid; v_lugar uuid;
begin
  select id, cliente_id into v_op, v_cli from oportunidades where numero = 'BODA-SF/2026';

  -- Si aún no existía la opp, la creamos entera (cliente + lugar + opp + Pago 1).
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
    values ('Pago 1 · Reserva de fecha (30%) boda Sara y Fernando (Factura 26015)', 'ingreso',
            'ingreso_factura', 'Pre-reserva', 508.20, '2026-07-21', 'cobrado', 'transferencia',
            v_op, v_cli, true, 'Ref. bancaria ST26X21148250807. Ordenante: Fernando Marco Carballal.');
  end if;

  -- Cliente: NIF y dirección (de la factura)
  update clientes set nif_cif = '51457029A', direccion = 'C/ Mayorazgo de Duarte, 281' where id = v_cli;

  -- Oportunidad: invitados + nota completa
  update oportunidades set
    n_invitados = 42,
    notas = 'Presupuesto Nº 063/2026 aceptado (1.400 € base → 1.694 € c/IVA): Rincón de Bienvenida, Seating plan fotográfico y Decoración de la ceremonia; incluye logística, montaje y coordinación. 42 invitados. Factura 26015 emitida el 09/07/2026: Pago 1 (30%) 508,20 € cobrado el 21/07; Pago 2 (20%) 338,80 € antes del 14/09/2026; resto (50%, ~847 €) por facturar más adelante.'
  where id = v_op;

  -- Presupuesto: total del encargo, 1.400 € base
  delete from presupuesto_lineas where oportunidad_id = v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via)
  values (v_op,
    'Decoración boda Sara y Fernando (presupuesto 063/2026): Rincón de Bienvenida, Seating plan fotográfico y Decoración de la ceremonia — incluye logística, montaje y coordinación',
    1, 1400, 0, 'factura');

  -- Cobro a plazos: Pago 2 (previsto, vence 14/09/2026). Pago 1 ya está cobrado.
  delete from tesoreria where oportunidad_id = v_op and tipo = 'ingreso' and estado = 'previsto';
  insert into tesoreria
    (concepto, tipo, naturaleza, categoria, importe, fecha, estado, metodo, oportunidad_id, cliente_id, computa_contabilidad, notas)
  values ('Pago 2 · Segundo pago (20%) boda Sara y Fernando (Factura 26015)', 'ingreso',
          'ingreso_factura', 'Cobro a plazos', 338.80, '2026-09-14', 'previsto', 'transferencia',
          v_op, v_cli, false, 'Vence antes del 14/09/2026 (dos meses antes del evento).');
end $$;
