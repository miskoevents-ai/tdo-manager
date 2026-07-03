import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { CAL_META, type CalEvento } from "@/lib/calendario";

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  const d = new Date(`${fecha}T00:00:00`);
  const h = new Date(`${hoy}T00:00:00`);
  const manana = new Date(h);
  manana.setDate(h.getDate() + 1);
  if (d.getTime() === manana.getTime()) return "Mañana";
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

// Agenda de los próximos 7 días: reuniones, eventos, montajes y demás,
// agrupados por día. Solo se muestran los días con algo programado.
export function EstaSemana({ eventos, hoy }: { eventos: CalEvento[]; hoy: string }) {
  const fin = new Date(`${hoy}T00:00:00`);
  fin.setDate(fin.getDate() + 6);
  const finISO = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;

  const semana = eventos
    .filter((e) => e.fecha >= hoy && e.fecha <= finISO)
    .sort((a, b) =>
      a.fecha === b.fecha
        ? (a.hora ?? "99") < (b.hora ?? "99") ? -1 : 1
        : a.fecha < b.fecha ? -1 : 1,
    );

  const porDia = new Map<string, CalEvento[]>();
  for (const e of semana) {
    const arr = porDia.get(e.fecha) ?? [];
    arr.push(e);
    porDia.set(e.fecha, arr);
  }

  return (
    <Card>
      <CardTitle>
        Esta semana
        <Link
          href="/calendario"
          className="font-body text-[11px] font-medium tracking-[0.03em] text-sage hover:underline"
        >
          Ver calendario →
        </Link>
      </CardTitle>
      {semana.length === 0 ? (
        <p className="py-2 text-small text-ink-muted">
          Semana tranquila: nada programado en los próximos 7 días.
        </p>
      ) : (
        <div className="space-y-3">
          {[...porDia.entries()].map(([dia, evs]) => (
            <div key={dia} className="flex gap-3">
              <div
                className={`w-[86px] shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                  dia === hoy ? "text-clay" : "text-ink-muted"
                }`}
              >
                {etiquetaDia(dia, hoy)}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {evs.map((e, i) => {
                  const pill = (
                    <span
                      className={`block truncate rounded-[6px] px-2 py-1 text-[12px] font-medium ${CAL_META[e.tipo].clase}`}
                      title={e.titulo}
                    >
                      {e.titulo}
                    </span>
                  );
                  return e.href ? (
                    <Link key={i} href={e.href} className="block">
                      {pill}
                    </Link>
                  ) : (
                    <div key={i}>{pill}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
