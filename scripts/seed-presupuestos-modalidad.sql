-- Precios de venta (líneas de presupuesto) para los eventos nuevos.
-- Requiere la migración 066 (columna `modalidad`). Ejecuta primero el ALTER.
-- Marina se carga con 2 MODALIDADES excluyentes (C&C vs con montaje); el
-- cliente elige una. Precios BASE (sin IVA), orientativos del repaso
-- (evento propio, +6% conting., margen 30%, comisión boda 6%): ajústalos.

alter table presupuesto_lineas add column if not exists modalidad text;

do $$
declare v_op uuid;
begin

  -- === Boda Marina y Mariana — 2 modalidades ===
  select id into v_op from oportunidades where numero = 'BODA-MM/2026';
  if v_op is not null then
    delete from presupuesto_lineas where oportunidad_id = v_op;
    insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via, modalidad) values
      (v_op, 'Decoración y atrezzo del enlace: espejo con vinilo, cestos de ramaje y flores, arreglos florales, pétalos, confeti biodegradable, jarrones, ramo de novia y alfombra', 1, 905, 0, 'factura', null),
      (v_op, 'Recogida y devolución del material por parte del cliente', 1, 0, 1, 'factura', 'C&C (recogida)'),
      (v_op, 'Montaje, desmontaje, transporte (furgoneta) y punto limpio por el equipo de TDO', 1, 465, 2, 'factura', 'Con montaje/desmontaje');
  end if;

  -- === Boda Loreto y Javier — precio cerrado del Excel (3.073 €) ===
  select id into v_op from oportunidades where numero = 'BODA-LJ/2027';
  if v_op is not null then
    delete from presupuesto_lineas where oportunidad_id = v_op;
    insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, orden, via, modalidad) values
      (v_op, 'Proyecto floral y decoración integral de la boda: arreglos de ceremonia, cóctel, seating, 12 centros de mesa, velas y detalles', 1, 3073, 0, 'factura', null);
  end if;

end $$;
