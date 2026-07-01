import { calcularTotales } from "@/lib/calc";
import type { Oportunidad } from "@/lib/types";

export type Aviso = {
  id: string;
  href: string;
  titulo: string;
  detalle: string;
  severidad: "alta" | "media" | "baja";
  categoria: "cobro" | "fianza" | "evento" | "presupuesto" | "lead";
};

function totalOp(o: Oportunidad): number {
  return calcularTotales(
    (o.presupuesto_lineas ?? []).map((l) => ({
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    })),
    o.iva_pct,
    o.retencion_pct,
  ).total;
}

// Días entre dos fechas ISO (b - a), redondeado hacia abajo.
function diasEntre(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z");
  const b = Date.parse(bISO + "T00:00:00Z");
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

const eur0 = (n: number) => `${Math.round(n).toLocaleString("es-ES")} €`;

/**
 * Calcula avisos accionables a partir de las oportunidades.
 * `hoyISO` (YYYY-MM-DD) se pasa desde el servidor/página.
 */
export function calcularAvisos(oportunidades: Oportunidad[], hoyISO: string): Aviso[] {
  const avisos: Aviso[] = [];
  const en7 = (f: string) => f >= hoyISO && diasEntre(hoyISO, f) <= 7;

  for (const o of oportunidades) {
    const contratada = ["confirmada", "realizada", "facturada"].includes(o.estado);
    const pendiente = Math.max(0, totalOp(o) - (o.cobrado ?? 0));

    // 1) Fianza cuya fecha de devolución ya pasó (o es hoy) y sigue sin devolver
    if ((o.fianza ?? 0) > 0 && !o.fianza_devuelta && o.fecha_devolucion_fianza && o.fecha_devolucion_fianza <= hoyISO) {
      avisos.push({
        id: `fianza-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: `Devolver fianza · ${o.titulo}`,
        detalle: `${eur0(o.fianza ?? 0)} · vencía ${o.fecha_devolucion_fianza}`,
        severidad: "alta",
        categoria: "fianza",
      });
    }

    // 2) Cobro pendiente de un evento ya pasado (vencido).
    //    A las 3 semanas sin cobrar salta una alarma más prominente.
    if (contratada && pendiente > 0.01 && o.fecha_evento && o.fecha_evento < hoyISO) {
      const dias = diasEntre(o.fecha_evento, hoyISO);
      const alarma = dias >= 21;
      avisos.push({
        id: `cobro-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: alarma ? `🚨 Impago +3 semanas · ${o.titulo}` : `Cobro pendiente · ${o.titulo}`,
        detalle: alarma
          ? `${eur0(pendiente)} · el evento fue hace ${dias} días y sigue sin cobrar`
          : `${eur0(pendiente)} · evento del ${o.fecha_evento} ya pasó`,
        severidad: "alta",
        categoria: "cobro",
      });
    }

    // 3) Evento en los próximos 7 días (preparar montaje/material)
    if (contratada && o.fecha_evento && en7(o.fecha_evento)) {
      const d = diasEntre(hoyISO, o.fecha_evento);
      avisos.push({
        id: `evento-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: `Evento en ${d === 0 ? "hoy" : `${d} día${d === 1 ? "" : "s"}`} · ${o.titulo}`,
        detalle: `${o.fecha_evento}${o.lugar?.nombre ? ` · ${o.lugar.nombre}` : ""}${pendiente > 0.01 ? ` · pendiente ${eur0(pendiente)}` : ""}`,
        severidad: "media",
        categoria: "evento",
      });
    }

    // 4) Presupuesto enviado hace más de 7 días sin confirmar/perder
    if (o.estado === "presupuesto_enviado" && o.fecha_entrada && diasEntre(o.fecha_entrada, hoyISO) >= 7) {
      avisos.push({
        id: `presup-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: `Presupuesto sin respuesta · ${o.titulo}`,
        detalle: `Enviado hace ${diasEntre(o.fecha_entrada, hoyISO)} días · haz seguimiento`,
        severidad: "media",
        categoria: "presupuesto",
      });
    }

    // 5) Lead frío: entró hace +7 días y sigue en fase inicial sin avanzar.
    if (
      ["nueva", "contestada", "en_conversacion"].includes(o.estado) &&
      o.fecha_entrada &&
      diasEntre(o.fecha_entrada, hoyISO) >= 7
    ) {
      const dias = diasEntre(o.fecha_entrada, hoyISO);
      avisos.push({
        id: `lead-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: `Lead sin avanzar · ${o.titulo}`,
        detalle: `Entró hace ${dias} días · sigue en fase inicial · hazle seguimiento`,
        severidad: dias >= 21 ? "alta" : "media",
        categoria: "lead",
      });
    }
  }

  const orden = { alta: 0, media: 1, baja: 2 } as const;
  return avisos.sort((a, b) => {
    const s = orden[a.severidad] - orden[b.severidad];
    if (s !== 0) return s;
    // Las alarmas (🚨) primero dentro de la misma severidad.
    return (b.titulo.startsWith("🚨") ? 1 : 0) - (a.titulo.startsWith("🚨") ? 1 : 0);
  });
}
