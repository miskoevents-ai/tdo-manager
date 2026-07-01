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
  notas: string | null;
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
  serie: OportunidadSerie;
  tipo_evento: TipoEvento;
  tipo_operacion: TipoOperacion;
  estado: OportunidadEstado;
  presupuesto_enviado: boolean;
  fecha_entrada: string | null;
  canal: string | null;
  fecha_evento: string | null;
  fecha_montaje: string | null;
  fecha_recogida: string | null;
  responsable: string | null;
  n_invitados: number | null;
  iva_pct: number;
  retencion_pct: number;
  fianza: number | null;
  fianza_devuelta: boolean;
  fecha_devolucion_fianza: string | null;
  fecha_confirmacion?: string | null;
  cliente_id: string | null;
  lugar_id: string | null;
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
};

export type FacturaEstado = "emitida" | "cobrada" | "vencida" | "anulada";

export type Factura = {
  id: string;
  numero: string;
  oportunidad_id: string | null;
  cliente_id: string | null;
  fecha_emision: string;
  base_imponible: number;
  iva: number;
  retencion: number;
  total: number;
  estado: FacturaEstado;
  notas: string | null;
  cliente?: Cliente | null;
};

export type Equipo = {
  id: string;
  nombre: string;
  rol: string | null;
  email: string | null;
  telefono: string | null;
  porcentaje: number | null;
  precio_hora: number | null;
  activo: boolean;
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
  notas: string | null;
  created_at: string;
  equipo?: { nombre: string } | null;
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
  articulo?: { articulo: string; cantidad_total: number | null } | null;
  oportunidad?: { numero: string; titulo: string } | null;
};

export type ComisionConfig = {
  id: string;
  tipo_evento: string | null;
  equipo_id: string | null;
  porcentaje: number;
  activo: boolean;
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
  activo: boolean;
  notas: string | null;
};
