-- Producción Evento Mi Jardín Vertical (4-6 oct 2026): costes internos + precio.
-- 2 SUBPROYECTOS separados por `zona`: "Carpa Beduina" y "Green Patio".
-- Costes verificados del Excel: Carpa 5.778 € + Green 2.370 € = 8.148 €.
-- Precio de venta 13.900 € base (Carpa 9.900 + Green 4.000), 2 apartados.
-- OJO: borra las líneas actuales de esa opp (la de 1.275 € que no cuadra).
do $$
declare v_op uuid := '9ec84fc4-b8de-428c-a7cb-bb2179094fef';
begin
  delete from costes_estimados where oportunidad_id = v_op;
  delete from presupuesto_lineas where oportunidad_id = v_op;

  -- ===== SUBPROYECTO: Carpa Beduina (coste 5.778 €) =====
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values
    (v_op, 'Aro hula hoop', 14, 24, 336, 'material', 'Carpa Beduina', null),
    (v_op, 'Paquetes hiedra (mixta)', 168, 18, 3024, 'material', 'Carpa Beduina', null),
    (v_op, 'Alambre bobinas', 3, 16, 48, 'material', 'Carpa Beduina', null),
    (v_op, 'Plantas helecho (paquetes de 6 und)', 30, 6, 180, 'material', 'Carpa Beduina', null),
    (v_op, 'Tela yute (150 cm ancho)', 2, 16, 32, 'material', 'Carpa Beduina', null),
    (v_op, 'Minivela con pila', 120, 1.48, 178, 'material', 'Carpa Beduina', null),
    (v_op, 'Premontaje (D-3): recibir material y verdes, organizar alambre y aros', 8, 20, 160, 'personal', 'Carpa Beduina', 'especializado'),
    (v_op, 'Premontaje (D-1)', 20, 20, 400, 'personal', 'Carpa Beduina', 'especializado'),
    (v_op, 'Montaje (D) domingo 4 oct 8:00-15:00', 42, 25, 1050, 'personal', 'Carpa Beduina', '3 especializados + 3 workout con APIS en altura'),
    (v_op, 'Desmontaje (lunes 5 oct 7:00-9:00, 2 operarios)', 8, 15, 120, 'personal', 'Carpa Beduina', null),
    (v_op, 'Posmontaje: punto limpio y colocacion en estudio', 4, 15, 60, 'personal', 'Carpa Beduina', null),
    (v_op, 'Furgoneta', 1, 100, 100, 'desplazamiento', 'Carpa Beduina', null),
    (v_op, 'Gasolina', 1, 30, 30, 'desplazamiento', 'Carpa Beduina', null),
    (v_op, 'Dietas', 1, 60, 60, 'Dietas y comida', 'Carpa Beduina', null);

  -- ===== SUBPROYECTO: Green Patio · 8 árboles (coste 2.370 €) =====
  insert into costes_estimados (oportunidad_id, concepto, cantidad, precio_unitario, importe, categoria, zona, nota) values
    (v_op, 'Troncos y ramas grandes de arboles (localizacion y busqueda en campo)', 12, 0, 0, 'material', 'Green Patio', null),
    (v_op, 'Ramaje natural: tuya, boj, falsa pimienta, olivo, viburn, musgo (por pareja)', 4, 150, 600, 'material', 'Green Patio', null),
    (v_op, 'Cemento', 4, 5, 20, 'material', 'Green Patio', null),
    (v_op, 'Alambres y bridas', 1, 50, 50, 'material', 'Green Patio', null),
    (v_op, 'Premontaje (D-15): busqueda de troncos y ramas en campo', 8, 20, 160, 'personal', 'Green Patio', 'especializado'),
    (v_op, 'Premontaje (D-12): realizar esqueleto de arboles con bases de cemento', 24, 15, 360, 'personal', 'Green Patio', 'Juan Carlos'),
    (v_op, 'Premontaje (D-3-2)', 16, 20, 320, 'personal', 'Green Patio', null),
    (v_op, 'Montaje (D) domingo 4 oct 12:00-18:00', 18, 20, 360, 'personal', 'Green Patio', '2 especializados + operario'),
    (v_op, 'Desmontaje (lunes 5 oct 7:00-9:00, 2 operarios)', 8, 15, 120, 'personal', 'Green Patio', null),
    (v_op, 'Posmontaje: punto limpio y colocacion en estudio', 4, 15, 60, 'personal', 'Green Patio', null),
    (v_op, 'Furgoneta para recoger troncos y ramas', 1, 100, 100, 'desplazamiento', 'Green Patio', null),
    (v_op, 'Furgoneta', 1, 100, 100, 'desplazamiento', 'Green Patio', null),
    (v_op, 'Gasolina (2 viajes)', 1, 60, 60, 'desplazamiento', 'Green Patio', null),
    (v_op, 'Dietas', 1, 60, 60, 'Dietas y comida', 'Green Patio', null);

  -- ===== Precio de venta: 13.900 € base en 2 apartados =====
  insert into presupuesto_lineas (oportunidad_id, concepto, cantidad, precio_unitario, importe, orden, bloque, via) values
    (v_op, 'Decoracion Carpa Beduina: estructura de aros con hiedra y helechos, tela de yute, minivelas y montaje/desmontaje completo', 1, 9900, 9900, 0, 'Carpa Beduina', 'factura'),
    (v_op, 'Green Patio (jardin vertical): 8 arboles con troncos naturales, ramaje y esqueletos con base de cemento, montaje/desmontaje completo', 1, 4000, 4000, 1, 'Green Patio', 'factura');
end $$;
