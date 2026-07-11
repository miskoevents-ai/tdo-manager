import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardTitle, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CobroRow } from "@/components/home/CobroRow";
import { AvisosPanel } from "@/components/home/AvisosPanel";
import { EstaSemana } from "@/components/home/EstaSemana";
import { InfoNote } from "@/components/ui/InfoNote";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getReservas, getTesoreria, getReuniones, getTareas } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { calcularAvisos } from "@/lib/avisos";
import { construirEventos } from "@/lib/calendario";
import { eur, fecha } from "@/lib/format";
import { ESTADO_META } from "@/lib/estados";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  sub,
  tone = "sage",
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "sage" | "clay" | "ok" | "warn" | "error";
  href?: string;
}) {
  const toneClass = {
    sage: "text-sage",
    clay: "text-clay",
    ok: "text-ok",
    warn: "text-warn",
    error: "text-error",
  }[tone];
  const barClass = {
    sage: "bg-sage",
    clay: "bg-clay",
    ok: "bg-ok",
    warn: "bg-warn",
    error: "bg-error",
  }[tone];
  const inner = (
    <Card className={`relative overflow-hidden p-[18px] pl-[22px] ${href ? "lift hover:shadow-card-hover" : ""}`}>
      <span className={`absolute left-0 top-0 h-full w-[3px] ${barClass}`} />
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-2 font-display text-[27px] tabular ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-[11.5px] text-ink-muted">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export default async function Home() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  // Fecha de hoy en horario de Madrid (antes estaba fijada a mano).
  const HOY_ISO = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
  }).format(new Date());

  let ops, reservas, tesoreria, reuniones, tareas;
  try {
    [ops, reservas, tesoreria, reuniones, tareas] = await Promise.all([
      getOportunidades(),
      getReservas(),
      getTesoreria(),
      getReuniones(),
      getTareas(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const contratadas = ops.filter((o) =>
    ["confirmada", "realizada", "facturada"].includes(o.estado),
  );

  // Totales por oportunidad
  const withTotals = ops.map((o) => {
    const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
    return { o, total: t.total, pendiente: Math.max(0, t.total - (o.cobrado ?? 0)) };
  });

  const cobrosPendientes = withTotals.filter(
    (x) => x.pendiente > 0.01 && ["confirmada", "realizada", "facturada"].includes(x.o.estado),
  );
  const totalPendiente = cobrosPendientes.reduce((s, x) => s + x.pendiente, 0);

  const fianzas = ops.filter((o) => (o.fianza ?? 0) > 0 && !o.fianza_devuelta);
  const totalFianzas = fianzas.reduce((s, o) => s + (o.fianza ?? 0), 0);

  const avisos = calcularAvisos(ops, HOY_ISO, reservas, tareas).slice(0, 10);
  const eventosCal = construirEventos(ops, reservas, tesoreria, reuniones);

  const futuros = ops
    .filter((o) => o.fecha_evento && o.fecha_evento >= HOY_ISO)
    .sort((a, b) => (a.fecha_evento! < b.fecha_evento! ? -1 : 1));
  const proximos = futuros.filter((o) => o.serie === "evento").slice(0, 5);
  const proximosAlquileres = futuros.filter((o) => o.serie === "alquiler_encargo").slice(0, 5);

  const pipeline = ops.filter((o) =>
    ["nueva", "contestada", "en_conversacion", "presupuesto_enviado"].includes(o.estado),
  );

  return (
    <div className="space-y-6">
      <InfoNote id="inicio">
        Tu panel de inicio: los avisos que requieren atención, los cobros pendientes y los próximos
        eventos y alquileres, todo de un vistazo.
      </InfoNote>
      <div className="rounded-md border-hair border-[#e7d3a6] bg-warn-tint px-[15px] py-[10px] text-[12.5px] text-[#7a5a1a]">
        Datos reales de TDO cargados (mayo–junio 2026). La contabilidad mensual arranca en junio
        2026 (regla §5.4).
      </div>

      <AvisosPanel avisos={avisos} />

      <EstaSemana eventos={eventosCal} hoy={HOY_ISO} />

      <Overline>Resumen</Overline>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Cobros pendientes"
          value={eur(totalPendiente)}
          sub={`${cobrosPendientes.length} eventos`}
          tone="clay"
          href="/oportunidades?cobro=pendiente&contratadas=1"
        />
        <Kpi
          label="Fianzas por devolver"
          value={eur(totalFianzas)}
          sub={`${fianzas.length} fianzas activas`}
          tone="warn"
          href="/oportunidades?fianza=si"
        />
        <Kpi
          label="Eventos contratados"
          value={String(contratadas.length)}
          sub="confirmados / realizados"
          tone="sage"
          href="/oportunidades?contratadas=1"
        />
        <Kpi
          label="En pipeline"
          value={String(pipeline.length)}
          sub="oportunidades abiertas"
          tone="ok"
          href="/oportunidades?pipeline=1"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>
            Cobros pendientes
            <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
              {eur(totalPendiente)}
            </span>
          </CardTitle>
          {cobrosPendientes.length === 0 && (
            <p className="py-2 text-small text-ink-muted">Todo cobrado. 🎉</p>
          )}
          {cobrosPendientes.map(({ o, pendiente }) => (
            <CobroRow
              key={o.id}
              id={o.id}
              titulo={o.titulo}
              cliente={o.cliente?.nombre ?? null}
              fechaEvento={o.fecha_evento}
              pendiente={pendiente}
            />
          ))}
        </Card>

        <Card>
          <CardTitle>
            Próximos eventos
            <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
              desde hoy
            </span>
          </CardTitle>
          {proximos.length === 0 && (
            <p className="py-2 text-small text-ink-muted">Sin eventos próximos.</p>
          )}
          {proximos.map((o) => {
            const meta = ESTADO_META[o.estado];
            return (
              <Link
                key={o.id}
                href={`/oportunidades/${o.id}`}
                className="flex items-center justify-between border-t border-border py-[10px] text-[13px] first:border-t-0 hover:text-clay"
              >
                <div className="flex flex-col gap-0.5">
                  <span>{o.titulo}</span>
                  <small className="text-[11.5px] text-ink-muted">
                    {fecha(o.fecha_evento)} · {o.lugar?.nombre ?? "—"}
                  </small>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <ChevronRight size={15} className="text-ink-muted" />
                </div>
              </Link>
            );
          })}
        </Card>

        <Card>
          <CardTitle>
            Próximos alquileres
            <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
              material / encargos
            </span>
          </CardTitle>
          {proximosAlquileres.length === 0 && (
            <p className="py-2 text-small text-ink-muted">Sin alquileres próximos.</p>
          )}
          {proximosAlquileres.map((o) => {
            const meta = ESTADO_META[o.estado];
            return (
              <Link
                key={o.id}
                href={`/oportunidades/${o.id}`}
                className="flex items-center justify-between border-t border-border py-[10px] text-[13px] first:border-t-0 hover:text-clay"
              >
                <div className="flex flex-col gap-0.5">
                  <span>{o.titulo}</span>
                  <small className="text-[11.5px] text-ink-muted">
                    {fecha(o.fecha_evento)} · {o.cliente?.nombre ?? o.lugar?.nombre ?? "—"}
                  </small>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <ChevronRight size={15} className="text-ink-muted" />
                </div>
              </Link>
            );
          })}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>
            Fianzas por devolver
            <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
              {eur(totalFianzas)}
            </span>
          </CardTitle>
          {fianzas.length === 0 && (
            <p className="py-2 text-small text-ink-muted">No hay fianzas pendientes.</p>
          )}
          {fianzas.map((o) => (
            <Link
              key={o.id}
              href={`/oportunidades/${o.id}`}
              className="flex items-center justify-between border-t border-border py-[10px] text-[13px] first:border-t-0 hover:text-clay"
            >
              <div className="flex flex-col gap-0.5">
                <span>{o.titulo}</span>
                <small className="text-[11.5px] text-ink-muted">{o.cliente?.nombre ?? "—"}</small>
              </div>
              <span className="tabular font-semibold text-warn">{eur(o.fianza ?? 0)}</span>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
