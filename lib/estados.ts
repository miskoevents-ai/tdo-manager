import type { BadgeTone } from "@/components/ui/badge";
import type { OportunidadEstado, FacturaEstado } from "@/lib/types";

// Un color distinto por estado, siguiendo la progresión del pipeline
// (frío → negociación → ganado → cerrado). Compartido por kanban y ficha.
export const ESTADO_COLOR: Record<OportunidadEstado, string> = {
  nueva: "#94A3B8",
  contestada: "#5B8FB9",
  en_conversacion: "#E0A458",
  presupuesto_enviado: "#BE6E4C",
  confirmada: "#5FA463",
  realizada: "#3F8F7A",
  facturada: "#7D6BA6",
  perdida: "#C0574B",
  descartada: "#A8A29A",
};

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

// --- Tesorería ---
export const NATURALEZA_LABEL: Record<string, string> = {
  ingreso_factura: "Ingreso de factura",
  gasto_fijo: "Gasto fijo",
  gasto_de_evento: "Gasto de evento",
  gasto_estructura: "Gasto de estructura",
  inversion: "Inversión",
  comision: "Comisión",
  personal: "Personal",
  amigos: "Amigos",
  otro: "Otro",
};

// Naturalezas disponibles hoy en el formulario (según el enum actual).
export const NATURALEZAS_MOV = [
  "ingreso_factura",
  "gasto_fijo",
  "gasto_de_evento",
  "gasto_estructura",
  "inversion",
  "amigos",
  "otro",
] as const;

export const METODOS = [
  "transferencia",
  "efectivo",
  "bizum",
  "tarjeta",
  "domiciliacion",
  "otro",
] as const;

export const ESTADOS_MOV = ["previsto", "cobrado", "pagado", "vencido"] as const;

// Categorías más habituales de ingresos/gastos (el formulario permite además
// escribir una a mano si no encaja en ninguna).
export const CATEGORIAS_MOV = [
  // Ingresos
  "Seña / anticipo",
  "Cobro final",
  "Fianza",
  // Gastos
  "Flores",
  "Material y atrezzo",
  "Mobiliario / alquiler",
  "Transporte / gasolina",
  "Personal / freelance",
  "Alquiler local",
  "Suministros (luz, agua, internet)",
  "Impresión / papelería",
  "Software / herramientas",
  "Marketing / publicidad",
  "Comisiones",
  "Impuestos / gestoría",
  "Mantenimiento",
] as const;

export const ESTADO_MOV_META: Record<string, { label: string; tone: BadgeTone }> = {
  previsto: { label: "Previsto", tone: "warn" },
  cobrado: { label: "Cobrado", tone: "ok" },
  pagado: { label: "Pagado", tone: "sage" },
  vencido: { label: "Vencido", tone: "error" },
};

// Regla §5.4: solo ingresos de factura propia + gastos fijos computan.
export function computaPorNaturaleza(naturaleza: string): boolean {
  return naturaleza === "ingreso_factura" || naturaleza === "gasto_fijo";
}

// Etapas: corte 25-may-2026.
export const CORTE_ETAPA = "2026-05-25";
export function etapaDeFecha(fechaISO: string | null | undefined): "cristina" | "nueva" {
  if (!fechaISO) return "nueva";
  return fechaISO < CORTE_ETAPA ? "cristina" : "nueva";
}

export const CANALES: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "web_bodasnet", label: "Web / Bodas.net" },
  { value: "recomendacion", label: "Recomendación" },
  { value: "telefono", label: "Teléfono" },
  { value: "otro", label: "Otro" },
];

export const CANAL_LABEL: Record<string, string> = Object.fromEntries(
  CANALES.map((c) => [c.value, c.label]),
);

export const CLIENTE_TIPO_LABEL: Record<string, string> = {
  particular: "Particular",
  empresa: "Empresa",
  finca_venue: "Finca / venue",
  wedding_planner: "Wedding planner",
  sin_clasificar: "Sin clasificar",
};
