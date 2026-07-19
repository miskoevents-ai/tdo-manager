-- ============================================================================
-- SEED DE PRUEBA · 10 oportunidades realistas para ver el pipeline con volumen
-- ----------------------------------------------------------------------------
-- · Transacción atómica (DO block): o entran las 10 o ninguna.
-- · Sin cliente asignado (el título ya lleva las iniciales) → cero riesgo de
--   enums de la tabla clientes.
-- · Comisión asignada a Cristina donde aplica → se ve la "comisión prevista".
-- · Todas marcadas con numero 'PRB-xx/2026' para borrarlas de un tiro (abajo).
-- ============================================================================
do $$
declare
  v_op  uuid;
  v_cri uuid;
begin
  -- Cristina (para la comisión). Si no se encuentra, queda sin comisión.
  select id into v_cri from equipo where nombre ilike '%cristina%' order by nombre limit 1;

  -- Helper inline: cada evento inserta oportunidad + líneas + costes.

  -- 1) Alquiler puertas antiguas — GYC (histórico, hecho)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, cerrada, cerrada_fecha, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-01/2026','Alquiler puertas antiguas — GYC','alquiler_encargo','alquiler_encargo','normal','realizada',true,current_date,'2026-05-18','2026-06-01',21,0,25,v_cri,'instagram','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Alquiler pareja de puertas antiguas',1,180,0,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Transporte y montaje',1,40,'desplazamiento',40);

  -- 2) Alquiler bañera antiguo — 2CH (histórico)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, cerrada, cerrada_fecha, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-02/2026','Alquiler bañera antiguo — 2CH','alquiler_encargo','alquiler_encargo','normal','realizada',true,current_date,'2026-05-20','2026-06-03',21,0,25,v_cri,'whatsapp','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Alquiler bañera vintage decorada',1,120,0,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Transporte',1,30,'desplazamiento',30);

  -- 3) Alquiler sofá blanco — LEIRA (histórico)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, cerrada, cerrada_fecha, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-03/2026','Alquiler sofá blanco — LEIRA','alquiler_encargo','alquiler_encargo','normal','realizada',true,current_date,'2026-05-22','2026-06-06',21,0,25,v_cri,'recomendacion','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Alquiler sofá chester blanco',1,150,0,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Transporte y limpieza',1,35,'desplazamiento',35);

  -- 4) Alquiler decoración — MR (histórico, varios)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, cerrada, cerrada_fecha, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-04/2026','Alquiler decoración — MR','alquiler_encargo','alquiler_encargo','normal','realizada',true,current_date,'2026-05-24','2026-06-10',21,0,25,v_cri,'instagram','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Pack decoración (mesas, velas, textiles)',1,450,0,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Material fungible (velas, flor)',1,120,'material',120),
    (v_op,'Transporte y montaje',1,50,'desplazamiento',50);

  -- 5) Alquiler columpio vintage — EDT (histórico)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, cerrada, cerrada_fecha, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-05/2026','Alquiler columpio vintage — EDT','alquiler_encargo','alquiler_encargo','normal','realizada',true,current_date,'2026-05-26','2026-06-14',21,0,25,v_cri,'web_bodasnet','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Alquiler columpio floral vintage',1,200,0,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Flores y montaje',1,55,'material',55);

  -- 6) Arcos, consola, maletas y moqueta — Funcity (próximo, confirmado)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-06/2026','Arcos, consola, maletas y moqueta — Funcity','alquiler_encargo','alquiler_encargo','normal','confirmada','2026-06-28','2026-07-25',21,0,25,v_cri,'email','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Arcos florales + consola',1,420,0,'factura'),
    (v_op,'Maletas antiguas + moqueta',1,260,1,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Flores y atrezzo',1,180,'material',180),
    (v_op,'Transporte',1,60,'desplazamiento',60);

  -- 7) Alquiler 25 balas de paja — Lobo (próximo, confirmado)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, pct_factura, comision_equipo_id, canal, notas)
    values ('PRB-07/2026','Alquiler 25 balas de paja — Lobo','alquiler_encargo','alquiler_encargo','normal','confirmada','2026-07-01','2026-07-19',21,0,25,v_cri,'telefono','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Alquiler 25 balas de paja',25,10,0,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Transporte (furgoneta grande)',1,80,'desplazamiento',80);

  -- 8) Boda María & Javier — Finca El Hormigal (GORDA, confirmada)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, fecha_montaje, iva_pct, retencion_pct, fianza, fecha_devolucion_fianza, pago_a_dias, comision_equipo_id, canal, n_invitados, notas)
    values ('PRB-08/2026','Boda María & Javier — Finca El Hormigal','evento','boda','normal','confirmada','2026-06-10','2026-09-12','2026-09-11',21,0,1000,'2026-09-20',30,v_cri,'web_bodasnet',140,'PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Decoración ceremonia (arco + camino)',1,3200,0,'factura'),
    (v_op,'Decoración cóctel y photocall',1,2800,1,'factura'),
    (v_op,'Decoración banquete (14 mesas)',14,650,2,'factura'),
    (v_op,'Iluminación y ambientación',1,2400,3,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Equipo montaje/desmontaje',60,20,'personal',1200),
    (v_op,'Flor natural y preservada',1,4200,'material',4200),
    (v_op,'Atrezzo e iluminación',1,1600,'material',1600),
    (v_op,'Transporte (2 viajes)',2,120,'desplazamiento',240);

  -- 9) Decoración Navidad corporativa — Hotel Riu (presupuesto enviado)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, comision_equipo_id, canal, notas)
    values ('PRB-09/2026','Decoración Navidad corporativa — Hotel Riu','evento','corporativo','normal','presupuesto_enviado','2026-07-05','2026-12-01',21,0,v_cri,'email','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Árbol 3m + decoración hall',1,2600,0,'factura'),
    (v_op,'Guirnaldas y ambientación zonas comunes',1,1600,1,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Material navideño',1,900,'material',900),
    (v_op,'Montaje',16,20,'personal',320);

  -- 10) Comunión Lucía — familia S. (en conversación)
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, comision_equipo_id, canal, notas)
    values ('PRB-10/2026','Comunión Lucía — familia S.','evento','comunion','normal','en_conversacion','2026-07-12','2026-10-04',21,0,v_cri,'recomendacion','PRUEBA — borrar') returning id into v_op;
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via) values
    (v_op,'Decoración mesa dulce + globos',1,850,0,'factura'),
    (v_op,'Photocall temático',1,500,1,'factura');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, categoria, importe) values
    (v_op,'Material y globos',1,260,'material',260);

end $$;

-- ============================================================================
-- PARA BORRARLAS TODAS después (deja tu base como estaba):
-- ----------------------------------------------------------------------------
-- delete from presupuesto_lineas where oportunidad_id in (select id from oportunidades where numero like 'PRB-%');
-- delete from costes_estimados   where oportunidad_id in (select id from oportunidades where numero like 'PRB-%');
-- delete from oportunidades      where numero like 'PRB-%';
-- ============================================================================
