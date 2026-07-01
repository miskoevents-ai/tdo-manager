import type { Oportunidad, Reserva, Tesoreria } from "@/lib/types";

export type CalTipo = "evento" | "montaje" | "recogida" | "salida" | "devolucion" | "cobro" | "fianza";

export type CalEvento = {
  fecha: string; // YYYY-MM-DD
  tipo: CalTipo;
  titulo: string;
  href?: string;
};

export const CAL_META: Record<CalTipo, { label: string; clase: string; punto: string }> = {
  evento: { label: "Evento", clase: "bg-sage-tint text-sage", punto: "bg-sage" },
  montaje: { label: "Montaje", clase: "bg-clay-tint text-clay-600", punto: "bg-clay" },
  recogida: { label: "Recogida", clase: "bg-clay-tint-deep text-clay-600", punto: "bg-clay-600" },
  salida: { label: "Salida material", clase: "bg-warn-tint text-warn", punto: "bg-warn" },
  devolucion: { label: "Devolución material", clase: "bg-ok-tint text-ok", punto: "bg-ok" },
  cobro: { label: "Cobro previsto", clase: "bg-error-tint text-error", punto: "bg-error" },
  fianza: { label: "Devolución fianza", clase: "bg-clay-tint text-clay-600", punto: "bg-clay-300" },
};

// Construye la lista de eventos del calendario a partir de los datos.
export function construirEventos(
  oportunidades: Oportunidad[],
  reservas: Reserva[],
  tesoreria: Tesoreria[],
): CalEvento[] {
  const ev: CalEvento[] = [];

  for (const o of oportunidades) {
    const href = `/oportunidades/${o.id}`;
    if (o.fecha_evento) ev.push({ fecha: o.fecha_evento, tipo: "evento", titulo: o.titulo, href });
    if (o.fecha_montaje) ev.push({ fecha: o.fecha_montaje, tipo: "montaje", titulo: `Montaje · ${o.titulo}`, href });
    if (o.fecha_recogida) ev.push({ fecha: o.fecha_recogida, tipo: "recogida", titulo: `Recogida · ${o.titulo}`, href });
    if (o.fecha_devolucion_fianza && !o.fianza_devuelta)
      ev.push({ fecha: o.fecha_devolucion_fianza, tipo: "fianza", titulo: `Devolver fianza · ${o.titulo}`, href });
  }

  for (const r of reservas) {
    const art = r.articulo?.articulo ?? "Material";
    const href = r.oportunidad_id ? `/oportunidades/${r.oportunidad_id}` : undefined;
    if (r.fecha_salida) ev.push({ fecha: r.fecha_salida, tipo: "salida", titulo: `Salida · ${art}`, href });
    if (r.fecha_devolucion) ev.push({ fecha: r.fecha_devolucion, tipo: "devolucion", titulo: `Devolución · ${art}`, href });
  }

  for (const t of tesoreria) {
    if (t.tipo === "ingreso" && t.estado === "previsto" && t.fecha) {
      ev.push({
        fecha: t.fecha,
        tipo: "cobro",
        titulo: `Cobro · ${t.concepto}`,
        href: t.oportunidad_id ? `/oportunidades/${t.oportunidad_id}` : undefined,
      });
    }
  }

  return ev;
}

// Mes (YYYY-MM) del próximo evento futuro; si no hay, el mes actual.
export function mesInicial(eventos: CalEvento[], hoyISO: string): string {
  const futuros = eventos
    .filter((e) => e.tipo === "evento" && e.fecha >= hoyISO)
    .map((e) => e.fecha)
    .sort();
  if (futuros.length) return futuros[0].slice(0, 7);
  const todos = eventos.map((e) => e.fecha).sort();
  if (todos.length) return todos[todos.length - 1].slice(0, 7);
  return hoyISO.slice(0, 7);
}
