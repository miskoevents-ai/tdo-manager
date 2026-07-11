// Plantillas de tareas por tipo de evento: al crear un evento se generan solas
// las tareas típicas del proceso (de la captación comercial al post-evento),
// en orden. offset = días respecto a la fecha del evento para la fecha límite
// (0 = el día del evento, 1 = el día siguiente; null = sin fecha).

import type { TareaPrioridad, TipoEvento } from "@/lib/types";

export type PlantillaItem = {
  titulo: string;
  prioridad?: TareaPrioridad;
  horas?: number;
  offset?: number | null;
};

// Proceso común de un evento con decoración (montaje + recogida).
const EVENTO: PlantillaItem[] = [
  { titulo: "Primer contacto y visita", prioridad: "alta", horas: 1.5 },
  { titulo: "Preparar y enviar presupuesto", prioridad: "alta", horas: 2 },
  { titulo: "Seguimiento del presupuesto", horas: 0.5 },
  { titulo: "Confirmar detalles con el cliente", horas: 1 },
  { titulo: "Pedido de flores y material fungible", horas: 1 },
  { titulo: "Reservar y preparar el material", horas: 2 },
  { titulo: "Preparar centros y atrezzo", horas: 3 },
  { titulo: "Planificar montaje y logística", horas: 1 },
  { titulo: "Montaje en el lugar", prioridad: "alta", horas: 4, offset: 0 },
  { titulo: "Recogida del material", horas: 2, offset: 1 },
  { titulo: "Revisar estado y reponer stock", horas: 1 },
  { titulo: "Emitir la factura", horas: 0.5 },
  { titulo: "Pedir reseña al cliente", horas: 0.25 },
];

// Alquiler / encargo de material (sin montaje del equipo en el lugar).
const ALQUILER: PlantillaItem[] = [
  { titulo: "Confirmar material y fechas", prioridad: "alta", horas: 0.5 },
  { titulo: "Preparar y enviar presupuesto", prioridad: "alta", horas: 1 },
  { titulo: "Preparar el pedido", horas: 1.5 },
  { titulo: "Entrega del material", prioridad: "alta", horas: 1, offset: 0 },
  { titulo: "Devolución y revisión del material", horas: 1, offset: 1 },
  { titulo: "Emitir la factura", horas: 0.5 },
];

// Devuelve la plantilla para un tipo de evento (con sus retoques).
export function plantillaPara(tipo: TipoEvento | string | null): PlantillaItem[] {
  if (tipo === "alquiler_encargo") return ALQUILER;
  if (tipo === "boda") {
    // La boda añade la prueba con los novios tras confirmar detalles.
    const lista = [...EVENTO];
    const i = lista.findIndex((t) => t.titulo.startsWith("Confirmar detalles"));
    lista.splice(i + 1, 0, { titulo: "Prueba / ensayo con los novios", horas: 2 });
    return lista;
  }
  return EVENTO;
}
