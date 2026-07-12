import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ComisionConfigDialog } from "@/components/comisiones/ComisionConfigDialog";
import { ComisionesClient } from "@/components/comisiones/ComisionesClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getEquipo, getComisionesConfig, getComisiones } from "@/lib/data";
import { computeDevengos } from "@/lib/comisiones";
import { num } from "@/lib/format";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";

export const dynamic = "force-dynamic";

export default async function ComisionesPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

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

  const devengos = computeDevengos(ops, config, pagadas);
  const equipoLite = equipo.map((e) => ({ id: e.id, nombre: e.nombre }));

  return (
    <div className="space-y-5">
      <InfoNote id="comisiones">Reglas de comisión por evento, configurables por tipo de evento y persona.</InfoNote>
      <Link href="/tesoreria" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage">
        <ArrowLeft size={14} /> Tesorería
      </Link>

      {/* Configuración de % */}
      <Card>
        <div className="flex items-center justify-between">
          <Overline className="!mt-0">Reglas de comisión (%)</Overline>
          <ComisionConfigDialog equipo={equipoLite} />
        </div>
        <p className="mb-3 mt-1 text-[11.5px] text-ink-muted">
          Define el % por persona y tipo de evento (o «Todos»). Se devenga sobre la base imponible y
          aparece a pagar <b>cuando la oportunidad ya está cobrada</b>. Cuenta como coste del evento
          (afecta al margen).
        </p>
        {config.length === 0 ? (
          <p className="text-small text-ink-muted">Sin reglas todavía. Crea la primera con «Nueva regla de %».</p>
        ) : (
          <div className="divide-y divide-border">
            {config.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-[13px]">
                <div>
                  <b>{c.equipo?.nombre ?? "—"}</b>
                  <span className="ml-2 text-ink-muted">
                    {c.tipo_evento ? (TIPO_EVENTO_LABEL[c.tipo_evento] ?? c.tipo_evento) : "Todos los eventos"} · {num(c.porcentaje, 0)}%
                    {c.desde ? ` · desde ${c.desde.split("-").reverse().join("/")}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.activo ? "ok" : "neutral"}>{c.activo ? "Activa" : "Inactiva"}</Badge>
                  <ComisionConfigDialog equipo={equipoLite} config={c} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Comisiones a pagar */}
      <div>
        <Overline className="!mt-0">Comisiones a pagar</Overline>
        <div className="mt-3">
          <ComisionesClient devengos={devengos} />
        </div>
      </div>
    </div>
  );
}
