-- Lead rechazado por precio: cartel de madera personalizado para boda.
-- Beatriz Fernández Herrero (email 20/07/2026). Cristina ofreció 140 € (cartel)
-- / 170 € (con decoración). La clienta lo vio caro → RECHAZADA por precio.
-- Se registra como oportunidad 'perdida' (motivo: precio) para el histórico.
do $$
declare v_cli uuid; v_op uuid;
begin
  insert into clientes (nombre, tipo, email, origen, estado, canal, notas)
  values (
    'Beatriz Fernández Herrero', 'particular', 'bfherrero@superagropal.es',
    'cliente_nuevo', 'lead', 'email',
    'Solicitó por email (20/07/2026) un cartel de madera personalizado para boda, con cuerda para colgarlo, tipo "Tato!! aquí viene la novia".'
  ) returning id into v_cli;

  insert into oportunidades
    (numero, titulo, serie, tipo_evento, tipo_operacion, estado, motivo_perdida,
     fecha_entrada, fecha_evento, iva_pct, retencion_pct, canal, cliente_id, notas)
  values (
    'CARTEL-BF/2026', 'Cartel personalizado para boda — Beatriz Fernández',
    'alquiler_encargo', 'alquiler_encargo', 'normal', 'perdida', 'precio',
    '2026-07-20', '2026-09-29', 21, 0, 'email', v_cli,
    'Encargo de cartel de madera pintado a mano, con cuerda. Oferta de Cristina: 140 € (cartel solo) / 170 € (con decoración de eucalipto y flores preservadas), IVA y envío incluidos. Fecha necesaria: 29/09/2026 (confirmar antes de fin de julio; taller cerrado del 1 al 15 de agosto). RECHAZADA por precio (la clienta lo vio caro).'
  ) returning id into v_op;

  -- es_encargo (mig 068): tolerante por si la columna aún no existe
  begin
    update oportunidades set es_encargo = true where id = v_op;
  exception when undefined_column then null;
  end;
end $$;
