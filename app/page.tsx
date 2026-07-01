import Link from "next/link";
import { ChevronRight, Bell } from "lucide-react";
import { Card, CardTitle, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CobroRow } from "@/components/home/CobroRow";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { calcularAvisos } from "@/lib/avisos";
import { eur, fecha } from "@/lib/format";
import { ESTADO_META } from "@/lib/estados";

const HOY_ISO = "2026-07-01";

const SEV_CLASS: Record<string, string> = {
  alta: "border-error/30 bg-error-tint text-error",
  media: "border-[#e7d3a6] bg-warn-tint text-[#7a5a1a]",
  baja: "border-sage-tint-deep bg-sage-tint/50 text-sage",
};

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  sub,
  tone = "sage",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "sage" | "clay" | "ok" | "warn" | "error";
}) {
  const toneClass = {
    sage: "text-sage",
    clay: "text-clay",
    ok: "text-ok",
    warn: "text-warn",
    error: "text-error",
  }[tone];
  return (
    <Card className="p-[18px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </div>
      <div className={`mt-2 font-display text-[27px] tabular ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-[11.5px] text-ink-muted">{sub}</div>}
    </Card>
  );
}

export default async function Home() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let ops;
  try {
    ops = await getOportunidades();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const contratadas = ops.filter((o) =>
    ["confirmada", "realizada", "facturada"].includes(o.estado),
  );

  // Totales por oportunidad
  const withTotals = ops.map((o) => {
    const t = calcularTotales(
      (o.presupuesto_lineas ?? []).map((l) => ({
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
      })),
      o.iva_pct,
      o.retencion_pct,
    );
    return { o, total: t.total, pendiente: Math.max(0, t.total - (o.cobrado ?? 0)) };
  });

  const cobrosPendientes = withTotals.filter(
    (x) => x.pendiente > 0.01 && ["confirmada", "realizada", "facturada"].includes(x.o.estado),
  );
  const totalPendiente = cobrosPendientes.reduce((s, x) => s + x.pendiente, 0);

  const fianzas = ops.filter((o) => (o.fianza ?? 0) > 0 && !o.fianza_devuelta);
  const totalFianzas = fianzas.reduce((s, o) => s + (o.fianza ?? 0), 0);

  const avisos = calcularAvisos(ops, HOY_ISO).slice(0, 6);

  const hoy = new Date("2026-07-01");
  const proximos = ops
    .filter((o) => o.fecha_evento && new Date(o.fecha_evento) >= hoy)
    .sort((a, b) => (a.fecha_evento! < b.fecha_evento! ? -1 : 1))
    .slice(0, 5);

  const pipeline = ops.filter((o) =>
    ["nueva", "contestada", "en_conversacion", "presupuesto_enviado"].includes(o.estado),
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border-hair border-[#e7d3a6] bg-warn-tint px-[15px] py-[10px] text-[12.5px] text-[#7a5a1a]">
        Datos reales de TDO cargados (mayo–junio 2026). La contabilidad mensual arranca en junio
        2026 (regla §5.4).
      </div>

      {avisos.length > 0 && (
        <Card className="border-l-[3px] border-l-clay">
          <CardTitle>
            <span className="flex items-center gap-2">
              <Bell size={15} className="text-clay" /> Avisos
            </span>
            <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
              {avisos.length} para revisar
            </span>
          </CardTitle>
          <div className="mt-1 space-y-2">
            {avisos.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className={`flex items-center justify-between gap-3 rounded-md border-hair px-3 py-2 text-[12.5px] transition-opacity hover:opacity-80 ${SEV_CLASS[a.severidad]}`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{a.titulo}</span>
                  <span className="truncate text-[11px] opacity-80">{a.detalle}</span>
                </div>
                <ChevronRight size={15} className="shrink-0 opacity-60" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Overline>Resumen</Overline>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Cobros pendientes"
          value={eur(totalPendiente)}
          sub={`${cobrosPendientes.length} eventos`}
          tone="clay"
        />
        <Kpi
          label="Fianzas por devolver"
          value={eur(totalFianzas)}
          sub={`${fianzas.length} fianzas activas`}
          tone="warn"
        />
        <Kpi
          label="Eventos contratados"
          value={String(contratadas.length)}
          sub="confirmados / realizados"
          tone="sage"
        />
        <Kpi
          label="En pipeline"
          value={String(pipeline.length)}
          sub="oportunidades abiertas"
          tone="ok"
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
