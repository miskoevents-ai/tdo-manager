// Tipos del dominio TDO (Fase 1). Reflejan el esquema Postgres de supabase/schema.sql.

export type ClienteTipo =
  | "particular"
  | "empresa"
  | "finca_venue"
  | "wedding_planner"
  | "sin_clasificar";

export type ClienteOrigen =
  | "cliente_previo"
  | "cliente_nuevo"
  | "amigo_jero"
  | "por_confirmar";

export type ClienteEstado = "lead" | "cliente";

export type Cliente = {
  id: string;
  nombre: string;
  tipo: ClienteTipo;
  email: string | null;
  telefono: string | null;
  nif_cif: string | null;
  direccion: string | null;
  localidad: string | null;
  origen: ClienteOrigen;
  estado: ClienteEstado;
  canal: string | null;
  persona_contacto?: string | null; // contacto dentro de una empresa/agencia
  notas: string | null;
  recomendacion_pedida?: boolean;
  nos_ha_recomendado?: boolean;
  created_at: string;
};

export type Lugar = {
  id: string;
  nombre: string;
  localidad: string | null;
  distancia_km: number | null;
  notas: string | null;
};

export type OportunidadEstado =
  | "nueva"
  | "contestada"
  | "en_conversacion"
  | "presupuesto_enviado"
  | "confirmada"
  | "en_produccion"
  | "realizada"
  | "facturada"
  | "perdida"
  | "descartada";

export type OportunidadSerie = "evento" | "alquiler_encargo";
export type TipoOperacion = "normal" | "amigos_prestamo";

export type TipoEvento =
  | "boda"
  | "comunion"
  | "corporativo"
  | "cumpleanos"
  | "bautizo"
  | "navidad"
  | "alquiler_encargo"
  | "otro";

export type Oportunidad = {
  id: string;
  numero: string;
  titulo: string;
  creado_por?: string | null; // usuario que la creó (migración 040)
  serie: OportunidadSerie;
  tipo_evento: TipoEvento;
  tipo_operacion: TipoOperacion;
  estado: OportunidadEstado;
  presupuesto_enviado: boolean;
  presupuesto_enviado_fecha?: string | null;
  fecha_entrada: string | null;
  canal: string | null;
  fecha_evento: string | null;
  fecha_montaje: string | null;
  fecha_recogida: string | null;
  hora_montaje?: string | null; // p. ej. "7:00–15:00"
  hora_desmontaje?: string | null; // p. ej. "00:00"
  logistica?: string | null; // accesos/muelle/horarios del recinto
  logistica_checklist?: LogisticaItem[] | null; // requisitos del recinto — mig. 052
  responsable: string | null;
  n_invitados: number | null;
  iva_pct: number;
  retencion_pct: number;
  fianza: number | null;
  fianza_devuelta: boolean;
  fecha_devolucion_fianza: string | null;
  fianza_cobrada?: boolean; // se ha recibido la fianza del cliente (está en depósito). Mig. 057
  fianza_retenida_importe?: number | null; // importe retenido por daños (no se devuelve → ingreso). Mig. 057
  fianza_retenida_motivo?: string | null; // motivo de la retención. Mig. 057
  pago_a_dias?: number; // 0 = al momento; 30 = el cliente paga a 30 días
  descuento_pct?: number | null; // % de descuento global del presupuesto (0–100)
  pct_factura?: number | null; // % del importe que se cobra con factura; el resto en efectivo/amigos. Solo alquiler/encargo. Mig. 054
  contingencia_pct?: number | null; // % de colchón sobre los costes estimados
  margen_objetivo_pct?: number | null; // % de margen mínimo para cuadrar el precio
  cerrada?: boolean; // evento cerrado: costes validados y congelados
  cerrada_fecha?: string | null;

  fecha_confirmacion?: string | null;
  resena_pedida?: boolean;
  resena_conseguida?: boolean;
  cliente_id: string | null;
  lugar_id: string | null;
  comision_equipo_id?: string | null; // persona a la que se le paga comisión (vacío = ninguna)
  envio?: boolean; // el pedido se manda por mensajería (material producido)
  envio_coste?: number | null; // coste del envío (mensajería)
  envio_incluido?: boolean; // true = incluido en el precio; false = se cobra aparte
  notas: string | null;
  created_at: string;
  // joins opcionales
  cliente?: Cliente | null;
  lugar?: Lugar | null;
  presupuesto_lineas?: PresupuestoLinea[];
  cobrado?: number;
};

export type PresupuestoLinea = {
  id: string;
  oportunidad_id: string;
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  orden: number;
  articulo_id?: string | null;
  bloque?: string | null; // agrupación opcional ("Decoración", "Alquiler de material"…)
  via?: "factura" | "efectivo" | null; // con IVA (oficial) o sin IVA (amigos)
  foto?: string | null; // foto de la línea: URL o archivo del bucket (galería / IA)
  descuento_pct?: number | null; // % de descuento de la línea (0–100)
};

// Coste estimado antes del presupuesto (escandallo previsto): sirve para
// cuadrar el precio del cliente. No toca la contabilidad real.
export type CosteEstimado = {
  id: string;
  oportunidad_id: string;
  concepto: string;
  importe: number; // total de la línea (cantidad × precio unitario)
  cantidad?: number | null;
  precio_unitario?: number | null;
  categoria?: string | null; // material | personal | desplazamiento | otro
  cuadrado?: boolean; // ya pasado a costes reales (tal cual o ajustado)
  importe_real?: number | null; // con qué importe se cuadró (para la desviación)
  equipo_id?: string | null; // persona prevista (horas)
  persona_externa?: string | null; // ayudante externo previsto
  pagador?: string | null; // quién pagará (reembolso al cuadrar)
  caja?: string | null; // caja prevista: 'amigos' o null (oficial)
  proveedor_id?: string | null; // proveedor del material/alquiler (migración 046)
  nota?: string | null; // matiz libre de la línea (migración 046)
  zona?: string | null; // espacio del evento (Entrada, Lobby, Planta 1…) — mig. 051
  por_confirmar?: boolean; // precio pendiente de un proveedor — mig. 051
  recargo_pct?: number | null; // recargo % (nocturnidad, festivo…) — mig. 052
  se_queda?: boolean; // material reutilizable (inversión en stock) — mig. 053
  usos_previstos?: number | null; // nº usos para amortizar (opcional) — mig. 053
  inventario_id?: string | null; // pieza de inventario dada de alta — mig. 053
  created_at: string;
};

// Ítem del checklist de logística del recinto (seguros, permisos, cargas…).
export type LogisticaItem = { label: string; hecho: boolean; nota?: string | null };

// Versión guardada del presupuesto (V1, V2…): foto fija de las líneas para
// conservar lo que se envió al cliente y poder volver atrás.
export type PresupuestoVersion = {
  id: string;
  oportunidad_id: string;
  version: number;
  notas: string | null;
  iva_pct: number;
  retencion_pct: number;
  descuento_pct?: number | null; // % de descuento global congelado con la versión
  lineas: FacturaLinea[];
  total: number;
  created_at: string;
};

export type FacturaEstado = "emitida" | "cobrada" | "vencida" | "anulada";

// Línea congelada dentro de la factura (foto fija al emitirla: aunque luego
// se toque el presupuesto, el documento no cambia). Las líneas con vía
// 'efectivo' son internas: no salen en el documento del cliente y su importe
// va a la contabilidad de amigos.
export type FacturaLinea = {
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  bloque?: string | null;
  via?: "factura" | "efectivo" | null;
  foto?: string | null; // en versiones de presupuesto; las facturas la ignoran
  descuento_pct?: number | null; // % de descuento de la línea (0–100)
};

export type Factura = {
  id: string;
  numero: string;
  oportunidad_id: string | null;
  cliente_id: string | null;
  fecha_emision: string;
  fecha_vencimiento?: string | null; // emisión + pago_a_dias de la oportunidad
  base_imponible: number;
  iva: number;
  retencion: number;
  total: number;
  estado: FacturaEstado;
  notas: string | null;
  creado_por?: string | null; // usuario que la emitió (migración 040)
  pdf_url?: string | null; // PDF real subido desde el ordenador (si lo hay)
  descuento_pct?: number | null; // % de descuento global aplicado al emitirla
  lineas?: FacturaLinea[] | null;
  cliente?: Cliente | null;
  oportunidad?: {
    id: string;
    numero: string | null;
    titulo: string;
    tipo_evento: string;
    fecha_evento: string | null;
    presupuesto_lineas?: PresupuestoLinea[];
  } | null;
};

export type Equipo = {
  id: string;
  nombre: string;
  rol: string | null;
  email: string | null;
  telefono: string | null;
  porcentaje: number | null;
  precio_hora: number | null; // €/hora fijo (colaboradores externos por trabajo)
  horas_semana?: number | null; // horas de contrato/semana → deriva coste real por hora del sueldo vigente. Mig. 055
  activo: boolean;
  // Actúa como caja de TDO (hasta que exista la SL): sus cobros y pagos no
  // generan cuentas pendientes con el equipo. Migración 038.
  es_caja?: boolean | null;
  notas: string | null;
};

export type Inventario = {
  id: string;
  articulo: string;
  categoria: string | null;
  cantidad_total: number | null;
  coste_unitario: number | null;
  precio_alquiler: number | null;
  fianza_sugerida: number | null;
  fianza_especial: boolean;
  ubicacion: string | null;
  estado: string;
  foto_url: string | null;
  notas: string | null;
};

export type TesoreriaTipo = "ingreso" | "gasto";
export type TesoreriaNaturaleza =
  | "ingreso_factura"
  | "gasto_fijo"
  | "gasto_de_evento"
  | "inversion"
  | "comision"
  | "personal"
  | "amigos"
  | "otro";

export type Tesoreria = {
  id: string;
  concepto: string;
  tipo: TesoreriaTipo;
  naturaleza: TesoreriaNaturaleza;
  categoria: string | null;
  importe: number;
  fecha: string;
  estado: string;
  metodo: string | null;
  oportunidad_id: string | null;
  cliente_id?: string | null;
  proveedor_id?: string | null;
  factura_id?: string | null;
  ticket_url?: string | null; // foto del ticket/justificante en Storage
  quien_lo_paga?: string | null; // gasto adelantado por una persona → TDO le debe
  cobrado_por?: string | null; // ingreso recibido por una persona → debe a TDO
  liquidado?: boolean | null; // el cobro ya se entregó a la caja de TDO
  notas?: string | null;
  computa_contabilidad: boolean;
  created_at: string;
  // joins opcionales
  oportunidad?: { numero: string; titulo: string } | null;
  cliente?: { nombre: string } | null;
};

export type Proveedor = {
  id: string;
  nombre: string;
  tipo_servicio: string | null;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  localidad: string | null;
  notas: string | null;
  // Datos de facturación (migración 037).
  razon_social?: string | null;
  nif?: string | null;
  direccion_fiscal?: string | null;
  iban?: string | null;
  created_at: string;
};

export type ParteHoras = {
  id: string;
  oportunidad_id: string | null;
  equipo_id: string | null;
  fecha: string | null;
  tarea: string | null;
  horas: number;
  precio_hora: number;
  persona_externa?: string | null; // ayudante de fuera del equipo
  tesoreria_id?: string | null; // pago en efectivo del externo, en tesorería
  fase?: string | null; // comercial | pre | evento | post
  notas: string | null;
  created_at: string;
  equipo?: { nombre: string } | null;
  oportunidad?: { numero: string | null; titulo: string } | null;
};

// Sueldo mensual de una persona del equipo, con vigencia desde un mes dado.
// El vigente en un mes es el de la fecha 'desde' más reciente que no lo supere.
export type Sueldo = {
  id: string;
  equipo_id: string;
  desde: string; // YYYY-MM-01
  importe: number;
  created_at: string;
};

export type Desplazamiento = {
  id: string;
  oportunidad_id: string | null;
  trayecto: string | null;
  km: number | null;
  ida_vuelta: boolean;
  coste_gasolina: number | null;
  peaje: number | null;
  parking: number | null;
  tesoreria_id: string | null;
  fecha: string | null;
  notas: string | null;
  created_at: string;
};

export type Reserva = {
  id: string;
  oportunidad_id: string | null;
  articulo_id: string | null;
  cantidad: number;
  fecha_salida: string | null;
  fecha_devolucion: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
  cantidad_incidencia?: number | null; // uds. rotas / no devueltas. Mig. 058
  incidencia_tipo?: string | null; // rota | no_devuelta | danada. Mig. 058
  incidencia_nota?: string | null; // detalle de la incidencia. Mig. 058
  coste_incidencia?: number | null; // coste de reposición / daño. Mig. 058
  articulo?: { articulo: string; cantidad_total: number | null } | null;
  oportunidad?: { numero: string; titulo: string } | null;
};

export type ComisionConfig = {
  id: string;
  tipo_evento: string | null;
  equipo_id: string | null;
  porcentaje: number;
  activo: boolean;
  desde?: string | null; // vigencia: solo devenga en eventos desde esta fecha
  equipo?: { nombre: string } | null;
};

export type Comision = {
  id: string;
  oportunidad_id: string | null;
  equipo_id: string | null;
  base: number;
  porcentaje: number;
  importe: number;
  estado: string;
  fecha_devengo: string | null;
  pagada_el: string | null;
  tesoreria_id: string | null;
};

export type GastoFijo = {
  id: string;
  concepto: string;
  importe_mensual: number;
  periodicidad: string;
  quien_lo_paga: string | null;
  caja?: string | null; // 'amigos' o null (oficial)
  desde?: string | null; // primer mes en que aplica (YYYY-MM-01); null = sin límite
  hasta?: string | null; // último mes en que aplica; null = sin límite
  categoria?: string | null; // ver lib/categorias-gastos (migración 044)
  equipo_id?: string | null; // beneficiario (sueldos)
  proveedor_id?: string | null; // proveedor al que se paga (servicios/tecnología…)
  equipo?: { id: string; nombre: string } | null;
  proveedor?: { id: string; nombre: string } | null;
  activo: boolean;
  notas: string | null;
};

export type Reunion = {
  id: string;
  oportunidad_id: string;
  fecha: string;
  hora: string | null; // HH:MM
  modalidad: "presencial" | "online";
  atendida_por: string | null;
  enlace: string | null;
  lugar: string | null;
  notas: string | null;
  transcripcion?: string | null;
  realizada: boolean;
  created_at: string;
  oportunidad?: { id: string; titulo: string } | null;
};

export type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  activo: boolean;
  es_admin: boolean;
  // Secciones a las que puede entrar (null = todas). Ver lib/secciones.
  permisos?: string[] | null;
  // Tiempo total con la plataforma abierta, en segundos (migración 042).
  segundos_activo?: number | null;
  equipo_id: string | null;
  ultimo_acceso: string | null;
  created_at: string;
};

export type RegistroActividad = {
  id: string;
  usuario: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: string | null;
  created_at: string;
};

export type TareaPrioridad = "baja" | "normal" | "alta" | "urgente";
export type TareaEstado = "pendiente" | "en_curso" | "hecha" | "no_puedo";

// Un paso de una lista de comprobación (checklist) de una tarea.
export type ChecklistItem = { texto: string; hecho: boolean };
// Una checklist con nombre (estilo Trello: "Montaje", "Recogida"…). Se guardan
// como JSON en la columna `checklist` de tareas: ChecklistGrupo[]. El formato
// antiguo (lista plana de ChecklistItem) se sigue leyendo (ver lib/checklist).
export type ChecklistGrupo = { titulo: string; items: ChecklistItem[] };

export type Tarea = {
  id: string;
  titulo: string;
  descripcion: string | null;
  asignada_a: string;
  // Todas las personas asignadas (la tarea puede compartirse). asignada_a es la
  // principal (== asignados[0]) y se conserva para avisos/imputación de horas.
  asignados?: string[] | null;
  creada_por: string | null;
  prioridad: TareaPrioridad;
  estado: TareaEstado;
  fecha_limite: string | null;
  oportunidad_id: string | null;
  comentario: string | null;
  completada_en: string | null;
  horas_estimadas?: number | null;
  orden?: number | null;
  checklist?: ChecklistGrupo[] | ChecklistItem[] | null;
  created_at: string;
  oportunidad?: { id: string; titulo: string } | null;
};
