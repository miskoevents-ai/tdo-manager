import type { Oportunidad, Reserva, Tesoreria, Reunion } from "@/lib/types";

export type CalTipo = "boda" | "corporativo" | "evento" | "reunion" | "montaje" | "recogida" | "salida" | "devolucion" | "cobro" | "fianza";

// Tipos que representan el día del evento en sí (para filtros y mesInicial).
export const TIPOS_EVENTO_CAL: CalTipo[] = ["boda", "corporativo", "evento"];

export type CalEvento = {
  fecha: string; // YYYY-MM-DD
  hora?: string | null; // HH:MM (solo reuniones)
  tipo: CalTipo;
  titulo: string;
  href?: string;
  tentativo?: boolean; // día de un evento aún sin confirmar (en negociación)
};

export const CAL_META: Record<CalTipo, { label: string; clase: string; punto: string }> = {
  boda: { label: "Boda", clase: "bg-sage-tint text-sage", punto: "bg-sage" },
  corporativo: { label: "Corporativo", clase: "bg-[#EAF1F7] text-[#4A7BA6]", punto: "bg-[#5B8FB9]" },
  evento: { label: "Otros eventos", clase: "bg-[#F1EEE6] text-[#8A8062]", punto: "bg-[#A99F7E]" },
  reunion: { label: "Reunión", clase: "bg-[#EFEBF6] text-[#7D6BA6]", punto: "bg-[#7D6BA6]" },
  montaje: { label: "Montaje", clase: "bg-clay-tint text-clay-600", punto: "bg-clay" },
  recogida: { label: "Recogida", clase: "bg-clay-tint-deep text-clay-600", punto: "bg-clay-600" },
  salida: { label: "Salida material", clase: "bg-warn-tint text-warn", punto: "bg-warn" },
  devolucion: { label: "Devolución material", clase: "bg-ok-tint text-ok", punto: "bg-ok" },
  cobro: { label: "Cobro previsto", clase: "bg-error-tint text-error", punto: "bg-error" },
  fianza: { label: "Devolución fianza", clase: "bg-clay-tint text-clay-600", punto: "bg-clay-300" },
};

// Clases del "pill" de un evento. Los tentativos (evento sin confirmar) van
// rayados y atenuados, para distinguirlos de lo ya cerrado.
export function pillClase(e: CalEvento): string {
  const base = CAL_META[e.tipo].clase;
  return e.tentativo ? `${base} border border-dashed border-current opacity-70` : base;
}

// Construye la lista de eventos del calendario a partir de los datos.
export function construirEventos(
  oportunidades: Oportunidad[],
  reservas: Reserva[],
  tesoreria: Tesoreria[],
  reuniones: Reunion[] = [],
): CalEvento[] {
  const ev: CalEvento[] = [];

  // Las oportunidades cerradas sin venta (perdidas o rechazadas) no deben
  // aparecer en el calendario ni en "Esta semana": ni su día, ni montaje,
  // ni recogida, ni sus reservas de material o cobros previstos.
  const descartadas = new Set(
    oportunidades.filter((o) => ["perdida", "descartada"].includes(o.estado)).map((o) => o.id),
  );
  // Las LOGÍSTICAS de trabajo (montaje, recogida, salida/devolución de material)
  // solo tienen sentido si el evento está CONTRATADO: un presupuesto enviado aún
  // no se monta. El día del evento sí se muestra aunque esté en negociación
  // (pipeline y aviso de solape de fecha).
  const CONTRATADAS = ["confirmada", "en_produccion", "realizada", "facturada"];
  const contratadas = new Set(
    oportunidades.filter((o) => CONTRATADAS.includes(o.estado)).map((o) => o.id),
  );

  for (const r of reuniones) {
    if (r.oportunidad_id && descartadas.has(r.oportunidad_id)) continue;
    const hora = r.hora ? ` ${r.hora.slice(0, 5)}` : "";
    const con = r.oportunidad?.titulo ?? "cliente";
    const quien = r.atendida_por ? ` (${r.atendida_por})` : "";
    ev.push({
      fecha: r.fecha,
      hora: r.hora ? r.hora.slice(0, 5) : null,
      tipo: "reunion",
      titulo: `Reunión${hora} · ${con}${quien}`,
      href: `/oportunidades/${r.oportunidad_id}?tab=reuniones`,
    });
  }

  for (const o of oportunidades) {
    if (descartadas.has(o.id)) continue;
    const href = `/oportunidades/${o.id}`;
    // El día del evento se clasifica por tipo: boda, corporativo u otros.
    const tipoDia: CalTipo =
      o.tipo_evento === "boda" ? "boda" : o.tipo_evento === "corporativo" ? "corporativo" : "evento";
    // El día del evento se muestra siempre (pipeline y solapes); si aún no está
    // contratado, se marca como tentativo para pintarlo distinto.
    if (o.fecha_evento)
      ev.push({ fecha: o.fecha_evento, tipo: tipoDia, titulo: o.titulo, href, tentativo: !contratadas.has(o.id) });
    // Montaje y recogida: solo si la oportunidad está contratada.
    if (o.fecha_montaje && contratadas.has(o.id))
      ev.push({ fecha: o.fecha_montaje, tipo: "montaje", titulo: `Montaje · ${o.titulo}`, href });
    if (o.fecha_recogida && contratadas.has(o.id))
      ev.push({ fecha: o.fecha_recogida, tipo: "recogida", titulo: `Recogida · ${o.titulo}`, href });
    if (o.fecha_devolucion_fianza && !o.fianza_devuelta)
      ev.push({ fecha: o.fecha_devolucion_fianza, tipo: "fianza", titulo: `Devolver fianza · ${o.titulo}`, href });
  }

  for (const r of reservas) {
    if (r.oportunidad_id && descartadas.has(r.oportunidad_id)) continue;
    // Salida/devolución de material: logística; solo si está contratada (o si
    // la reserva no cuelga de ninguna oportunidad).
    if (r.oportunidad_id && !contratadas.has(r.oportunidad_id)) continue;
    const art = r.articulo?.articulo ?? "Material";
    const href = r.oportunidad_id ? `/oportunidades/${r.oportunidad_id}` : undefined;
    if (r.fecha_salida) ev.push({ fecha: r.fecha_salida, tipo: "salida", titulo: `Salida · ${art}`, href });
    if (r.fecha_devolucion) ev.push({ fecha: r.fecha_devolucion, tipo: "devolucion", titulo: `Devolución · ${art}`, href });
  }

  for (const t of tesoreria) {
    if (t.oportunidad_id && descartadas.has(t.oportunidad_id)) continue;
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
    .filter((e) => TIPOS_EVENTO_CAL.includes(e.tipo) && e.fecha >= hoyISO)
    .map((e) => e.fecha)
    .sort();
  if (futuros.length) return futuros[0].slice(0, 7);
  const todos = eventos.map((e) => e.fecha).sort();
  if (todos.length) return todos[todos.length - 1].slice(0, 7);
  return hoyISO.slice(0, 7);
}
