import { calcularTotales } from "@/lib/calc";
import { solapan, disponible } from "@/lib/disponibilidad";
import type { Oportunidad, Reserva, Tarea, Reunion, Tesoreria } from "@/lib/types";

export type Aviso = {
  id: string;
  href: string;
  titulo: string;
  detalle: string;
  severidad: "alta" | "media" | "baja";
  categoria: "cobro" | "fianza" | "evento" | "presupuesto" | "lead" | "material" | "tarea";
  oportunidadId?: string;
};

function totalOp(o: Oportunidad): number {
  return calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
}

// Días entre dos fechas ISO (b - a), redondeado hacia abajo.
function diasEntre(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z");
  const b = Date.parse(bISO + "T00:00:00Z");
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

// Suma días a una fecha ISO (YYYY-MM-DD).
function sumaDiasISO(fechaISO: string, dias: number): string {
  const d = new Date(fechaISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Fecha en formato español día/mes/año para los textos de los avisos.
const fES = (iso: string) => iso.split("-").reverse().join("/");

const eur0 = (n: number) =>
  `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" }).format(Math.round(n))} €`;

/**
 * Calcula avisos accionables a partir de las oportunidades.
 * `hoyISO` (YYYY-MM-DD) se pasa desde el servidor/página.
 */
export function calcularAvisos(
  oportunidades: Oportunidad[],
  hoyISO: string,
  reservas: Reserva[] = [],
  tareas: Tarea[] = [],
  reuniones: Reunion[] = [],
  tesoreria: Tesoreria[] = [],
): Aviso[] {
  const avisos: Aviso[] = [];
  const en7 = (f: string) => f >= hoyISO && diasEntre(hoyISO, f) <= 7;

  // Última "señal de vida" por oportunidad: la fecha más reciente entre su
  // entrada, sus reuniones y sus movimientos de tesorería. Sirve para detectar
  // oportunidades DORMIDAS (sin movimiento real), no solo por fecha de entrada.
  const ultimaActividad: Record<string, string> = {};
  const bump = (opId: string | null | undefined, fecha: string | null | undefined) => {
    if (!opId || !fecha) return;
    const f = fecha.slice(0, 10);
    if (!ultimaActividad[opId] || f > ultimaActividad[opId]) ultimaActividad[opId] = f;
  };
  for (const o of oportunidades) bump(o.id, o.fecha_entrada);
  for (const r of reuniones) bump(r.oportunidad_id, r.fecha);
  for (const t of tesoreria) bump(t.oportunidad_id, t.fecha);

  for (const o of oportunidades) {
    const contratada = ["confirmada", "realizada", "facturada"].includes(o.estado);
    const pendiente = Math.max(0, totalOp(o) - (o.cobrado ?? 0));

    // 1) Fianza cuya fecha de devolución ya pasó (o es hoy) y sigue sin devolver
    if ((o.fianza ?? 0) > 0 && !o.fianza_devuelta && o.fecha_devolucion_fianza && o.fecha_devolucion_fianza <= hoyISO) {
      avisos.push({
        id: `fianza-${o.id}`,
        href: `/oportunidades/${o.id}?tab=cobros`,
        titulo: `Devolver fianza · ${o.titulo}`,
        detalle: `${eur0(o.fianza ?? 0)} · vencía el ${fES(o.fecha_devolucion_fianza)}`,
        severidad: "alta",
        categoria: "fianza",
        oportunidadId: o.id,
      });
    }

    // 1b) Fianza retenida: evento pasado hace +14 días, sin fecha de devolución
    //     fijada y sin devolver → llevas demasiado tiempo el dinero del cliente.
    if (
      (o.fianza ?? 0) > 0 &&
      !o.fianza_devuelta &&
      !o.fecha_devolucion_fianza &&
      o.fecha_evento &&
      o.fecha_evento < hoyISO &&
      diasEntre(o.fecha_evento, hoyISO) >= 14
    ) {
      const dias = diasEntre(o.fecha_evento, hoyISO);
      avisos.push({
        id: `fianza-ret-${o.id}`,
        href: `/oportunidades/${o.id}?tab=cobros`,
        titulo: `Fianza retenida ${dias} días · ${o.titulo}`,
        detalle: `${eur0(o.fianza ?? 0)} del cliente sin devolver desde el evento`,
        severidad: dias >= 30 ? "alta" : "media",
        categoria: "fianza",
        oportunidadId: o.id,
      });
    }

    // 2) Cobro pendiente vencido. Si el cliente tiene condiciones de pago
    //    (pago_a_dias, p. ej. a 30 días), el vencimiento se cuenta desde el
    //    evento + plazo y la alarma no salta antes. A las 3 semanas del
    //    vencimiento sin cobrar salta la alarma prominente.
    const plazo = o.pago_a_dias ?? 0;
    if (contratada && pendiente > 0.01 && o.fecha_evento) {
      const vencimiento = plazo > 0 ? sumaDiasISO(o.fecha_evento, plazo) : o.fecha_evento;
      if (vencimiento < hoyISO) {
        const dias = diasEntre(vencimiento, hoyISO);
        const alarma = dias >= 21;
        const condicion = plazo > 0 ? ` (pago a ${plazo} días)` : "";
        avisos.push({
          id: `cobro-${o.id}`,
          href: `/oportunidades/${o.id}?tab=cobros`,
          titulo: alarma ? `🚨 Impago +3 semanas · ${o.titulo}` : `Cobro pendiente · ${o.titulo}`,
          detalle: alarma
            ? `${eur0(pendiente)} · venció hace ${dias} días${condicion} y sigue sin cobrar`
            : `${eur0(pendiente)} · venció el ${fES(vencimiento)}${condicion}`,
          severidad: "alta",
          categoria: "cobro",
          oportunidadId: o.id,
        });
      }
    }

    // 3) Evento en los próximos 7 días (preparar montaje/material)
    if (contratada && o.fecha_evento && en7(o.fecha_evento)) {
      const d = diasEntre(hoyISO, o.fecha_evento);
      avisos.push({
        id: `evento-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: `Evento en ${d === 0 ? "hoy" : `${d} día${d === 1 ? "" : "s"}`} · ${o.titulo}`,
        detalle: `${fES(o.fecha_evento)}${o.lugar?.nombre ? ` · ${o.lugar.nombre}` : ""}${pendiente > 0.01 ? ` · pendiente ${eur0(pendiente)}` : ""}`,
        severidad: "media",
        categoria: "evento",
        oportunidadId: o.id,
      });
    }

    // 4) Presupuesto enviado hace más de 7 días sin confirmar/perder
    if (o.estado === "presupuesto_enviado" && o.fecha_entrada && diasEntre(o.fecha_entrada, hoyISO) >= 7) {
      avisos.push({
        id: `presup-${o.id}`,
        href: `/oportunidades/${o.id}?tab=presupuesto`,
        titulo: `Presupuesto sin respuesta · ${o.titulo}`,
        detalle: `Enviado hace ${diasEntre(o.fecha_entrada, hoyISO)} días · haz seguimiento`,
        severidad: "media",
        categoria: "presupuesto",
        oportunidadId: o.id,
      });
    }

    // 5) Lead sin responder: entró hace +48h y sigue en "nueva" sin contestar.
    if (o.estado === "nueva" && o.fecha_entrada && diasEntre(o.fecha_entrada, hoyISO) >= 2) {
      const dias = diasEntre(o.fecha_entrada, hoyISO);
      avisos.push({
        id: `lead-resp-${o.id}`,
        href: `/oportunidades/${o.id}`,
        titulo: `Lead sin responder · ${o.titulo}`,
        detalle: `Entró hace ${dias} días y aún no se ha contestado · responde cuanto antes`,
        severidad: dias >= 4 ? "alta" : "media",
        categoria: "lead",
        oportunidadId: o.id,
      });
    }

    // 6) Oportunidad dormida: en el embudo (contestada / en conversación) pero
    //    SIN MOVIMIENTO REAL (ni reunión ni cobro) desde hace +10 días. Se mide
    //    desde la última señal de vida, así una tratada hace poco no molesta.
    if (["contestada", "en_conversacion"].includes(o.estado)) {
      const ult = ultimaActividad[o.id] ?? o.fecha_entrada;
      if (ult && ult <= hoyISO) {
        const dias = diasEntre(ult, hoyISO);
        if (dias >= 10) {
          avisos.push({
            id: `dormida-${o.id}`,
            href: `/oportunidades/${o.id}`,
            titulo: `Oportunidad dormida · ${o.titulo}`,
            detalle: `Sin movimiento desde hace ${dias} días · retoma el contacto antes de perderla`,
            severidad: dias >= 21 ? "alta" : "media",
            categoria: "lead",
            oportunidadId: o.id,
          });
        }
      }
    }
  }

  // 7b) Tareas del equipo con fecha límite pasada y sin hacer.
  for (const t of tareas) {
    if (t.estado === "hecha" || !t.fecha_limite || t.fecha_limite >= hoyISO) continue;
    const dias = diasEntre(t.fecha_limite, hoyISO);
    avisos.push({
      id: `tarea-${t.id}`,
      href: "/tareas",
      titulo: `Tarea vencida · ${t.titulo}`,
      detalle: `De ${t.asignada_a} · vencía el ${fES(t.fecha_limite)} (hace ${dias} día${dias === 1 ? "" : "s"})`,
      severidad: t.prioridad === "urgente" || dias >= 7 ? "alta" : "media",
      categoria: "tarea",
    });
  }

  // 7) Dobles reservas de material: solapes que superan el stock disponible.
  const OCUPAN = ["reservado", "entregado"];
  const vistosArticulo = new Set<string>();
  for (const r of reservas) {
    if (!r.articulo_id || !OCUPAN.includes(r.estado) || vistosArticulo.has(r.articulo_id)) continue;
    const total = r.articulo?.cantidad_total ?? 0;
    const disp = disponible(total, r.articulo_id, r.fecha_salida, r.fecha_devolucion, reservas);
    if (disp < 0) {
      vistosArticulo.add(r.articulo_id);
      const nombre = r.articulo?.articulo ?? "Artículo";
      const eventos = reservas
        .filter(
          (x) =>
            x.articulo_id === r.articulo_id &&
            OCUPAN.includes(x.estado) &&
            solapan(r.fecha_salida, r.fecha_devolucion, x.fecha_salida, x.fecha_devolucion),
        )
        .map((x) => x.oportunidad?.titulo ?? x.oportunidad?.numero ?? "—")
        .slice(0, 3)
        .join(" / ");
      avisos.push({
        id: `solape-${r.articulo_id}`,
        href: `/inventario`,
        titulo: `🚨 Doble reserva · ${nombre}`,
        detalle: `Faltan ${Math.abs(disp)} ud. · se solapan: ${eventos}`,
        severidad: "alta",
        categoria: "material",
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
