import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardTitle, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getEquipo, getComisionesConfig, getComisiones } from "@/lib/data";
import { computeDevengos } from "@/lib/comisiones";
import { getUsuarioActual } from "@/lib/sesion";
import { canonizarNombre } from "@/lib/personas";
import { eur, num } from "@/lib/format";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";

export const dynamic = "force-dynamic";

// "Mis comisiones": cada persona ve SOLO las suyas (sin abrir Contabilidad ni
// Tesorería, que son de socios). Se filtran los devengos por la persona
// asignada que coincide con el usuario conectado.
export default async function MisComisionesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  const usuario = await getUsuarioActual();

  let ops, equipo, config, pagadas;
  try {
    [ops, equipo, config, pagadas] = await Promise.all([
      getOportunidades(),
      getEquipo(),
      getComisionesConfig(),
      getComisiones(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const nombresEquipo = equipo.map((e) => e.nombre);
  const miNombre = usuario ? canonizarNombre(usuario.nombre, nombresEquipo) : null;
  const miFicha = miNombre ? equipo.find((e) => e.nombre === miNombre) : null;

  const devengos = computeDevengos(ops, config, pagadas);
  const mios = miFicha
    ? devengos.filter((d) => d.equipoId === miFicha.id)
    : miNombre
      ? devengos.filter((d) => d.persona === miNombre)
      : [];

  const devengado = mios.reduce((s, d) => s + d.importe, 0);
  const pagado = mios.reduce((s, d) => s + (d.pagada ? d.importe : 0), 0);
  const pendiente = Math.round((devengado - pagado) * 100) / 100;

  return (
    <div className="space-y-5">
      <InfoNote id="mis-comisiones">
        Tus comisiones por las oportunidades en las que figuras como responsable de comisión. Se
        devengan cuando la oportunidad está cobrada.
      </InfoNote>

      {!usuario && (
        <Card>
          <p className="py-2 text-small text-ink-secondary">
            Entra con tu usuario para ver tus comisiones.
          </p>
        </Card>
      )}

      {usuario && (
        <>
          <Overline className="!mt-0">Resumen</Overline>
          <div className="grid grid-cols-3 gap-4">
            <Kpi label="Devengado" value={eur(devengado)} tone="text-sage" />
            <Kpi label="Cobrado / pagado" value={eur(pagado)} tone="text-ok" />
            <Kpi label="Pendiente" value={eur(pendiente)} tone="text-clay" />
          </div>

          <Card>
            <CardTitle>
              Detalle por evento
              <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
                {mios.length} {mios.length === 1 ? "comisión" : "comisiones"}
              </span>
            </CardTitle>
            {mios.length === 0 ? (
              <p className="py-2 text-small text-ink-muted">
                Aún no tienes comisiones. Aparecerán cuando seas la persona de comisión de una
                oportunidad y esta se cobre.
              </p>
            ) : (
              mios.map((d) => (
                <Link
                  key={d.key}
                  href={`/oportunidades/${d.oportunidadId}`}
                  className="flex items-center justify-between gap-3 border-t border-border py-[10px] text-[13px] first:border-t-0 hover:text-clay"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{d.evento}</span>
                    <small className="text-[11.5px] text-ink-muted">
                      {TIPO_EVENTO_LABEL[d.tipoEvento] ?? d.tipoEvento} · base {eur(d.base)} ·{" "}
                      {num(d.porcentaje, 0)}%
                    </small>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular font-semibold text-sage">{eur(d.importe)}</span>
                    <Badge tone={d.pagada ? "ok" : "warn"}>{d.pagada ? "Pagada" : "Pendiente"}</Badge>
                    <ChevronRight size={15} className="text-ink-muted" />
                  </div>
                </Link>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[22px] tabular ${tone}`}>{value}</div>
    </Card>
  );
}
