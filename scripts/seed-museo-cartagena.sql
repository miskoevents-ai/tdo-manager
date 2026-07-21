-- Nueva solicitud: alquiler de postes para el Museo Arqueológico de Cartagena.
-- 9 parejas (18 postes) para cerrar algo menos de 24 m.
-- Crea cliente + lugar + oportunidad (serie alquiler_encargo, estado 'nueva').
-- La info (dirección, teléfono, web, horario) va repartida en cliente/lugar/opp.
do $$
declare v_cli uuid; v_lugar uuid; v_op uuid;
begin
  -- Cliente (institución)
  insert into clientes (nombre, tipo, telefono, direccion, localidad, origen, estado, canal, notas)
  values (
    'Museo Arqueológico Municipal de Cartagena',
    'empresa',
    '+34 968 12 89 68',
    'C/ Ramón y Cajal 45, 30201 Cartagena',
    'Cartagena',
    'cliente_nuevo',
    'lead',
    'email',
    'Museo Arqueológico Municipal de Cartagena. Web: https://museoarqueologico.cartagena.es · Tel. +34 968 12 89 68 · Horario administración (verano): 7:30–13:30.'
  ) returning id into v_cli;

  -- Lugar / recinto (el propio museo)
  insert into lugares (nombre, localidad, notas)
  values (
    'Museo Arqueológico Municipal de Cartagena',
    'Cartagena',
    'C/ Ramón y Cajal 45, 30201 Cartagena. Tel. +34 968 12 89 68. Horario administración (verano) 7:30–13:30. Web: https://museoarqueologico.cartagena.es'
  ) returning id into v_lugar;

  -- Oportunidad (alquiler de postes)
  insert into oportunidades
    (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada,
     iva_pct, retencion_pct, canal, cliente_id, lugar_id, logistica, notas)
  values (
    'MUSEO-CT/2026',
    'Alquiler de postes — Museo Arqueológico de Cartagena (18 postes · ~24 m)',
    'alquiler_encargo',
    'alquiler_encargo',
    'normal',
    'nueva',
    '2026-07-21',
    21,
    0,
    'email',
    v_cli,
    v_lugar,
    'Horario de administración (verano): 7:30–13:30 — coordinar entrega y recogida dentro de esa franja. Dirección: C/ Ramón y Cajal 45, 30201 Cartagena.',
    'Solicitud: 9 parejas (18 postes) para cerrar algo menos de 24 metros. Cliente: Museo Arqueológico Municipal de Cartagena, C/ Ramón y Cajal 45, 30201 Cartagena. Tel. +34 968 12 89 68. Web: https://museoarqueologico.cartagena.es'
  ) returning id into v_op;
end $$;
