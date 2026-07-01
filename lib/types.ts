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
  precio_alquiler: number | null;
  fianza_sugerida: number | null;
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

export type GastoFijo = {
  id: string;
  concepto: string;
  importe_mensual: number;
  periodicidad: string;
  quien_lo_paga: string | null;
  activo: boolean;
  notas: string | null;
};
