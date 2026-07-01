import type { BadgeTone } from "@/components/ui/badge";
import type { OportunidadEstado, FacturaEstado } from "@/lib/types";

export const ESTADO_META: Record<OportunidadEstado, { label: string; tone: BadgeTone }> = {
  nueva: { label: "Nueva", tone: "neutral" },
  contestada: { label: "Contestada", tone: "sage" },
  en_conversacion: { label: "En conversación", tone: "sage" },
  presupuesto_enviado: { label: "Presup. enviado", tone: "clay" },
  confirmada: { label: "Confirmada", tone: "ok" },
  realizada: { label: "Realizada", tone: "ok" },
  facturada: { label: "Facturada", tone: "sage" },
  perdida: { label: "Perdida", tone: "error" },
  descartada: { label: "Descartada", tone: "neutral" },
};

// Columnas del kanban (en orden del pipeline). Perdida/descartada se filtran aparte.
export const KANBAN_COLS: OportunidadEstado[] = [
  "nueva",
  "contestada",
  "en_conversacion",
  "presupuesto_enviado",
  "confirmada",
  "realizada",
  "facturada",
];

export const ESTADOS_TODOS: OportunidadEstado[] = [
  ...KANBAN_COLS,
  "perdida",
  "descartada",
];

export const FACTURA_META: Record<FacturaEstado, { label: string; tone: BadgeTone }> = {
  emitida: { label: "Emitida", tone: "clay" },
  cobrada: { label: "Cobrada", tone: "ok" },
  vencida: { label: "Vencida", tone: "error" },
  anulada: { label: "Anulada", tone: "neutral" },
};

export const TIPO_EVENTO_LABEL: Record<string, string> = {
  boda: "Boda",
  comunion: "Comunión",
  corporativo: "Corporativo",
  cumpleanos: "Cumpleaños",
  bautizo: "Bautizo",
  navidad: "Navidad",
  alquiler_encargo: "Alquiler / encargo",
  otro: "Otro",
};

export const CLIENTE_TIPO_LABEL: Record<string, string> = {
  particular: "Particular",
  empresa: "Empresa",
  finca_venue: "Finca / venue",
  wedding_planner: "Wedding planner",
  sin_clasificar: "Sin clasificar",
};
