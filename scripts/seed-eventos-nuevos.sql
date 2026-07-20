-- Eventos nuevos (verificados al céntimo) para el manager.
-- Inserta cada oportunidad + sus costes estimados por zona. Revisar y ejecutar en Supabase.
-- Números con prefijo de texto (no arrastran el correlativo). Estado 'nueva' — ajústalo tú.
do $$
declare v_op uuid;
begin

  -- === Boda Marina y Mariana — Finca San Antonio ===
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, canal, notas) values ('BODA-MM/2026','Boda Marina y Mariana — Finca San Antonio','evento','boda','normal','nueva','2026-07-20','2026-09-27',21,0,'whatsapp','Hoyo de Manzanares. Tel/WhatsApp +52 1 55 3974 5852. Ofrecer 2 modalidades: C&C (solo atrezzo, 546) y con montaje/desmontaje (826).') returning id into v_op;
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Espejo ovalado texto vinilo (hay que comprarlo)',1,30,30,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Cesto ramaje verde, paniculata blanca y clavelinas',10,22,220,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Bastidor a medida cartel de tela (tela aportada por cliente)',1,0,0,'material','Atrezzo','materia 20 + mano 24 si se cobrara');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Arreglo floral grande crisantemos, calas blancas',1,40,40,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Petalos rosas naturales blanco/rosa/rojo',1,23,23,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Cesto con 50 conos confeti biodegradable',1,63,63,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Jarron con flores naturales en agua',5,7,35,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Saquito yute con paniculata y crisantemos',5,9,45,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Pedestal madera para centro junto a espejo',1,0,0,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Alfombra de yute para musicos',1,0,0,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Ramo de novia con flores naturales',1,90,90,'material','Atrezzo',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Montaje dia D (carga furgoneta, entrega, colocacion)',8,15,120,'personal','Logistica','2 operarios');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Desmontaje + punto limpio + colocacion en estudio',4,15,60,'personal','Logistica','1 operario');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Furgoneta',1,100,100,'desplazamiento','Logistica',null);

  -- === Produccion Evento Daraki ===
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, canal, notas) values ('DARAKI/2027','Produccion Evento Daraki','evento','corporativo','normal','nueva','2026-07-20','2027-01-21',21,15,'email','Decoracion por zonas. Estanteria hierro 3x2 pendiente de precio (Crimons). Desmontaje con nocturnidad (00:00).') returning id into v_op;
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Plantas palmaceas',16,30,480,'material','Entrada',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Macetas',16,40,640,'material','Entrada',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Plantas helechos/similar',20,15,300,'material','Entrada',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Plantas palmaceas',10,30,300,'material','Lobby',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Macetas',10,40,400,'material','Lobby',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Plantas palmaceas ambas compos jardin',60,30,1800,'material','Planta 1',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Delimitar jardines zocalo imitando barro',20,40,800,'material','Planta 1',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Plantas palmaceas',20,30,600,'material','Planta 2',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Macetas',20,40,800,'material','Planta 2',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Plantas palmaceas',14,30,420,'material','Planta 3',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Macetas',14,40,560,'material','Planta 3',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Composicion pedestales y basijas negras',1,500,500,'material','Mobiliario',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Estanteria en hierro 3x2 (PENDIENTE precio Crimons)',1,0,0,'material','Mobiliario','espera precio crimons — anadir cuando llegue');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Premontaje',16,15,240,'personal','General',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Montaje dia D (4 operarios)',16,15,240,'personal','General',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Desmontaje (nocturnidad 00:00) 2 operarios',8,15,120,'personal','General','nocturnidad — valorar recargo');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Posmontaje: punto limpio y devolucion (2 operarios)',8,15,120,'personal','General',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'2 furgonetas disponibles 8 dias (D-8)',16,100,1600,'desplazamiento','General',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Trastero Bluespace 15 dias (12 m)',1,200,200,'Almacen y logistica','General','por si acaso');

  -- === Boda Loreto y Javier ===
  insert into oportunidades (numero, titulo, serie, tipo_evento, tipo_operacion, estado, fecha_entrada, fecha_evento, iva_pct, retencion_pct, canal, notas) values ('BODA-LJ/2027','Boda Loreto y Javier','evento','boda','normal','nueva','2026-07-20','2027-09-17',21,0,'otro','Cobrado proyecto 3.073 EUR. 10% honorarios AGA = 307 EUR. Aux 10 EUR/h, especializado 20 EUR/h.') returning id into v_op;
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Arreglo floral banco piedra',1,24,24,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Arreglos asimetricos arco Ceremonia',1,50,50,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'5 Arreglos florales suelo',1,100,100,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'4 Cestos con petalos',1,60,60,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'3 Arreglos florales seating',1,72,72,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'2 Arreglos florales sobre barra cocktails',1,40,40,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'7 Jarrones con flores en agua',1,84,84,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'12 Centros de mesa (48 jarrones)',1,96,96,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'1 Centro flores mesa Ceremonia',1,10,10,'material','Arreglos florales',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Elaboracion arreglos florales',21,20.14,423,'personal','Arreglos florales','21 h · 2 especializados');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Vinilo espejo (materia+mano)',1,30,30,'material','Otros',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'48 Minivelas acompanan centros de mesa (materia+mano)',1,60,60,'material','Otros',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Pilas velas led',1,26,26,'material','Otros',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'2 Medias tiendas',1,24,24,'material','Otros',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Furgoneta',1,80,80,'desplazamiento','Otros',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Gasolina',1,32,32,'desplazamiento','Otros',null);
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Premontaje (organizacion material y carga furgoneta)',2,20.0,40,'personal','Otros','2 h · 2 auxiliares');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Montaje (3 h desde llegada a finca)',1,160.0,160,'personal','Otros','3 h especializado + 5 h 2 aux');
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values (v_op,'Postmontaje (4 h desde llegada a finca y limpieza)',4,20.0,80,'personal','Otros','4 h · 2 auxiliares');
end $$;
