import { getOportunidades, getReservas, getTesoreria, getReuniones } from "@/lib/data";
import { construirEventos, CAL_META } from "@/lib/calendario";
import { supabaseConfigurado } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Feed iCalendar (.ics) para suscribirse desde Google Calendar, iPhone u
// Outlook. Protegido con un token propio (CAL_FEED_TOKEN en Vercel) porque
// los calendarios externos no pueden enviar la cookie de sesión.
// URL: /api/calendario?token=XXXX

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const diaMas1 = (fecha: string) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
};

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const esperado = process.env.CAL_FEED_TOKEN;
  if (!esperado || !token || token !== esperado) {
    return new Response("No autorizado", { status: 401 });
  }
  if (!supabaseConfigurado()) return new Response("Sin configurar", { status: 503 });

  const [ops, reservas, tesoreria, reuniones] = await Promise.all([
    getOportunidades(),
    getReservas(),
    getTesoreria(),
    getReuniones(),
  ]);
  const eventos = construirEventos(ops, reservas, tesoreria, reuniones);

  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TDO Manager//Calendario//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:TDO Manager",
    "X-WR-TIMEZONE:Europe/Madrid",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Madrid",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  eventos.forEach((e, i) => {
    const resumen = e.tipo === "evento" ? `Evento · ${e.titulo}` : e.titulo;
    const fechaCompacta = e.fecha.replace(/-/g, "");
    L.push("BEGIN:VEVENT");
    L.push(`UID:${e.fecha}-${e.tipo}-${i}@tdo-manager`);
    L.push(`DTSTAMP:${fechaCompacta}T000000Z`);
    if (e.hora) {
      // Reunión con hora: evento de 1 hora en horario de Madrid.
      const [h, m] = e.hora.split(":").map(Number);
      const ini = `${fechaCompacta}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      const finDia = h + 1 >= 24 ? diaMas1(e.fecha) : fechaCompacta;
      const finHora = (h + 1) % 24;
      const fin = `${finDia}T${String(finHora).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      L.push(`DTSTART;TZID=Europe/Madrid:${ini}`);
      L.push(`DTEND;TZID=Europe/Madrid:${fin}`);
    } else {
      L.push(`DTSTART;VALUE=DATE:${fechaCompacta}`);
      L.push(`DTEND;VALUE=DATE:${diaMas1(e.fecha)}`);
    }
    L.push(`SUMMARY:${esc(resumen)}`);
    L.push(`CATEGORIES:${esc(CAL_META[e.tipo].label)}`);
    L.push("END:VEVENT");
  });

  L.push("END:VCALENDAR");

  return new Response(L.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
