-- Solicitud + presupuesto + costes: alquiler/fabricación de 18 catenarias
-- (postes con cordón) para el Museo Arqueológico de Cartagena.
--
-- Idempotente: si la opp MUSEO-CT/2026 no existe la crea (cliente+lugar+opp);
-- si ya existe, solo (re)carga presupuesto y costes.
--   Precio al cliente: fabricación 1.220 + portes 100 = base 1.320 → 1.597,20 € c/IVA
--   Coste interno: producción 568 + comisión Cristina 61 + portes 100 = 729 → margen ~591 €
do $$
declare v_cli uuid; v_lugar uuid; v_op uuid;
begin
  select id into v_op from oportunidades where numero = 'MUSEO-CT/2026';

  if v_op is null then
    insert into clientes (nombre, tipo, telefono, direccion, localidad, origen, estado, canal, notas)
    values (
      'Museo Arqueológico Municipal de Cartagena', 'empresa', '+34 968 12 89 68',
      'C/ Ramón y Cajal 45, 30201 Cartagena', 'Cartagena', 'cliente_nuevo', 'lead', 'email',
      'Museo Arqueológico Municipal de Cartagena. Web: https://museoarqueologico.cartagena.es · Tel. +34 968 12 89 68 · Horario administración (verano): 7:30–13:30.'
    ) returning id into v_cli;

    insert into lugares (nombre, localidad, notas)
    values (
      'Museo Arqueológico Municipal de Cartagena', 'Cartagena',
      'C/ Ramón y Cajal 45, 30201 Cartagena. Tel. +34 968 12 89 68. Horario administración (verano) 7:30–13:30.'
    ) returning id into v_lugar;

    insert into oportunidades
      (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada,
       iva_pct, retencion_pct, canal, cliente_id, lugar_id, logistica, notas)
    values (
      'MUSEO-CT/2026', 'Fabricación de 18 catenarias — Museo Arqueológico de Cartagena (~24 m)',
      'alquiler_encargo', 'alquiler_encargo', 'normal', 'nueva', '2026-07-21',
      21, 0, 'email', v_cli, v_lugar,
      'Horario de administración (verano): 7:30–13:30 — coordinar entrega y recogida dentro de esa franja. Dirección: C/ Ramón y Cajal 45, 30201 Cartagena.',
      'Solicitud: 9 parejas (18 postes/catenarias) para cerrar algo menos de 24 metros. Museo Arqueológico Municipal de Cartagena, C/ Ramón y Cajal 45, 30201 Cartagena. Tel. +34 968 12 89 68. Web: https://museoarqueologico.cartagena.es'
    ) returning id into v_op;
  end if;

  -- === Presupuesto (lo que ve el cliente): base 1.320 € → 1.597,20 € c/IVA ===
  delete from presupuesto_lineas where oportunidad_id = v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, bloque, via) values
    (v_op, 'Fabricación de 18 catenarias (postes con cordón), ~68 €/ud', 1, 1220, 0, null, 'factura'),
    (v_op, 'Portes · envío a Cartagena', 1, 100, 1, null, 'factura');

  -- === Costes internos (para el margen): 729 € ===
  delete from costes_estimados where oportunidad_id = v_op;
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, nota) values
    (v_op, 'Producción de 18 catenarias', 18, 31.56, 568, 'material', 'materia prima y fabricación (18 x 31,56)'),
    (v_op, 'Comisión Cristina (5%)', 1, 61, 61, 'personal', '5% sobre la fabricación — ya pagada'),
    (v_op, 'Portes · envío a Cartagena', 1, 100, 100, 'desplazamiento', 'pass-through: lo paga el cliente, no toca el beneficio');
end $$;
