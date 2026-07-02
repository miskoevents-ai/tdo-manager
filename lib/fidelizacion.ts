import type { Oportunidad, Cliente } from "@/lib/types";

// Enlace de reseñas (Google / Bodas.net). Configurable con la variable de
// entorno NEXT_PUBLIC_RESENA_URL en Vercel. Si está vacío, el mensaje usa un
// texto genérico.
export const RESENA_URL = process.env.NEXT_PUBLIC_RESENA_URL || "";

// Días entre dos fechas ISO (b - a).
function dias(aISO: string, bISO: string): number {
  const a = Date.parse(aISO + "T00:00:00Z");
  const b = Date.parse(bISO + "T00:00:00Z");
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

const CONTRATADA = ["confirmada", "realizada", "facturada"];
const nombreDe = (o: Oportunidad) => o.cliente?.nombre ?? o.titulo;

// ── Bloque 1 · Pedir reseña ─────────────────────────────────────────────
// Eventos ya celebrados en los últimos 45 días, sin reseña conseguida.
export type AccionResena = {
  id: string;
  titulo: string;
  cliente: string;
  fechaEvento: string;
  dias: number;
  pedida: boolean;
};

export function resenasPendientes(ops: Oportunidad[], hoyISO: string): AccionResena[] {
  return ops
    .filter(
      (o) =>
        CONTRATADA.includes(o.estado) &&
        o.fecha_evento &&
        o.fecha_evento <= hoyISO &&
        dias(o.fecha_evento, hoyISO) <= 45 &&
        !o.resena_conseguida,
    )
    .map((o) => ({
      id: o.id,
      titulo: o.titulo,
      cliente: nombreDe(o),
      fechaEvento: o.fecha_evento!,
      dias: dias(o.fecha_evento!, hoyISO),
      pedida: Boolean(o.resena_pedida),
    }))
    .sort((a, b) => a.dias - b.dias);
}

// ── Bloque 2 · Aniversarios de boda ─────────────────────────────────────
// Bodas cuyo mes coincide con el mes actual y de años anteriores.
export type AccionAniversario = {
  id: string;
  titulo: string;
  cliente: string;
  fechaEvento: string;
  anios: number;
};

export function aniversariosBoda(ops: Oportunidad[], hoyISO: string): AccionAniversario[] {
  const mesHoy = hoyISO.slice(5, 7);
  const anioHoy = Number(hoyISO.slice(0, 4));
  return ops
    .filter((o) => o.tipo_evento === "boda" && CONTRATADA.includes(o.estado) && o.fecha_evento)
    .map((o) => ({ o, anios: anioHoy - Number(o.fecha_evento!.slice(0, 4)) }))
    .filter(({ o, anios }) => anios >= 1 && o.fecha_evento!.slice(5, 7) === mesHoy)
    .map(({ o, anios }) => ({
      id: o.id,
      titulo: o.titulo,
      cliente: nombreDe(o),
      fechaEvento: o.fecha_evento!,
      anios,
    }))
    .sort((a, b) => a.fechaEvento.slice(8, 10).localeCompare(b.fechaEvento.slice(8, 10)));
}

// ── Bloque 3 · Recomendaciones / referidos ──────────────────────────────
// Clientes que ya han contratado (contentos) y aún no nos han recomendado.
export type AccionRecomendacion = {
  id: string;
  nombre: string;
  pedida: boolean;
  eventos: number;
};

export function recomendacionesPendientes(
  ops: Oportunidad[],
  clientes: Cliente[],
): AccionRecomendacion[] {
  const eventosPorCliente = new Map<string, number>();
  for (const o of ops) {
    if (o.cliente_id && CONTRATADA.includes(o.estado)) {
      eventosPorCliente.set(o.cliente_id, (eventosPorCliente.get(o.cliente_id) ?? 0) + 1);
    }
  }
  return clientes
    .filter((c) => eventosPorCliente.has(c.id) && !c.nos_ha_recomendado)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      pedida: Boolean(c.recomendacion_pedida),
      eventos: eventosPorCliente.get(c.id) ?? 0,
    }))
    .sort((a, b) => Number(a.pedida) - Number(b.pedida) || b.eventos - a.eventos);
}

// ── Bloque 4 · Reactivar clientes B2B ───────────────────────────────────
// Empresas / wedding planners / fincas que llevan +6 meses sin contratar.
export type AccionReactivar = {
  id: string;
  nombre: string;
  tipo: string;
  ultimoEvento: string;
  meses: number;
};

const B2B = ["empresa", "wedding_planner", "finca_venue"];

export function reactivarB2B(
  ops: Oportunidad[],
  clientes: Cliente[],
  hoyISO: string,
): AccionReactivar[] {
  const ultimo = new Map<string, string>();
  for (const o of ops) {
    if (o.cliente_id && CONTRATADA.includes(o.estado) && o.fecha_evento) {
      const prev = ultimo.get(o.cliente_id);
      if (!prev || o.fecha_evento > prev) ultimo.set(o.cliente_id, o.fecha_evento);
    }
  }
  return clientes
    .filter((c) => B2B.includes(c.tipo) && ultimo.has(c.id))
    .map((c) => {
      const f = ultimo.get(c.id)!;
      return { id: c.id, nombre: c.nombre, tipo: c.tipo, ultimoEvento: f, meses: Math.floor(dias(f, hoyISO) / 30) };
    })
    .filter((x) => x.meses >= 6)
    .sort((a, b) => b.meses - a.meses);
}

// ── Plantillas de mensaje (para copiar y enviar por WhatsApp/email) ──────
const primerNombre = (n: string) => n.split(/[ (]/)[0];

export function msgResena(cliente: string): string {
  const enlace = RESENA_URL
    ? `Puedes dejárnosla aquí: ${RESENA_URL}`
    : "Puedes buscarnos en Google como «Tu Decoración Original» y dejárnosla ahí.";
  return `¡Hola ${primerNombre(cliente)}! 🌿 Ha sido un placer formar parte de vuestro evento. Si quedasteis contentos con Tu Decoración Original, nos ayudaría muchísimo una reseña de 5 estrellas ⭐️⭐️⭐️⭐️⭐️. ${enlace} ¡Mil gracias! 💛`;
}

export function msgRecomendacion(cliente: string): string {
  return `¡Hola ${primerNombre(cliente)}! 🌿 Nos encantó trabajar con vosotros. Si conocéis a alguien que esté preparando una boda o un evento, nos haría mucha ilusión que nos recomendarais 💛 ¡Gracias por confiar en Tu Decoración Original!`;
}

export function msgAniversario(cliente: string, anios: number): string {
  return `¡Hola ${primerNombre(cliente)}! 💍 Hoy hace ${anios} ${anios === 1 ? "año" : "años"} de vuestra boda y en Tu Decoración Original nos acordamos de vosotros. ¡Feliz aniversario! 🥂 Que sigáis celebrando muchos más. 💛`;
}

export function msgReactivar(cliente: string): string {
  return `¡Hola ${primerNombre(cliente)}! 🌿 Hace un tiempo que no montamos nada juntos y queríamos saludaros. Si tenéis algún evento en el horizonte, estaremos encantados de ayudaros de nuevo. Un abrazo del equipo de Tu Decoración Original 💛`;
}
