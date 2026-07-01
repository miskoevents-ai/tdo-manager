"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pagarComision, desmarcarComision } from "@/app/actions";
import { eur, num } from "@/lib/format";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";
import type { Devengo } from "@/lib/comisiones";

export function ComisionesClient({ devengos }: { devengos: Devengo[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  // Resumen por persona
  const personas = new Map<string, { persona: string; devengado: number; pagado: number }>();
  for (const d of devengos) {
    const p = personas.get(d.equipoId) ?? { persona: d.persona, devengado: 0, pagado: 0 };
    p.devengado += d.importe;
    if (d.pagada) p.pagado += d.importe;
    personas.set(d.equipoId, p);
  }
  const resumen = Array.from(personas.values());

  async function pagar(d: Devengo) {
    setBusy(d.key);
    try {
      await pagarComision({
        oportunidadId: d.oportunidadId,
        equipoId: d.equipoId,
        nombre: d.persona,
        evento: d.evento,
        base: d.base,
        porcentaje: d.porcentaje,
        importe: d.importe,
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deshacer(d: Devengo) {
    if (!d.comisionId) return;
    setBusy(d.key);
    try {
      await desmarcarComision(d.comisionId, d.tesoreriaId ?? null);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (devengos.length === 0) {
    return (
      <Card className="max-w-container-narrow">
        <p className="text-small text-ink-secondary">
          Todavía no hay comisiones devengadas. Define arriba una <b>regla de %</b> (persona · tipo
          de evento · %) y aparecerán aquí las comisiones de las oportunidades confirmadas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumen por persona */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resumen.map((p) => (
          <Card key={p.persona} className="p-4">
            <div className="text-[13px] font-semibold">{p.persona}</div>
            <div className="mt-2 flex items-baseline justify-between text-[12px] text-ink-muted">
              <span>Pendiente</span>
              <span className="font-display text-[18px] tabular text-clay">
                {eur(p.devengado - p.pagado)}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
              <span>Devengado {eur(p.devengado)}</span>
              <span>Pagado {eur(p.pagado)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Detalle de devengos */}
      <Card className="overflow-x-auto">
        <Overline>Comisiones por evento</Overline>
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border py-2 text-left font-semibold">Persona</th>
              <th className="border-b border-border py-2 text-left font-semibold">Evento</th>
              <th className="border-b border-border py-2 text-right font-semibold">Base</th>
              <th className="border-b border-border py-2 text-right font-semibold">%</th>
              <th className="border-b border-border py-2 text-right font-semibold">Comisión</th>
              <th className="border-b border-border py-2 text-right font-semibold">Estado</th>
              <th className="border-b border-border py-2"></th>
            </tr>
          </thead>
          <tbody>
            {devengos.map((d) => (
              <tr key={d.key}>
                <td className="border-b border-[#f0eae1] py-2 font-medium">{d.persona}</td>
                <td className="border-b border-[#f0eae1] py-2">
                  {d.evento}
                  <span className="ml-2 text-[10.5px] text-ink-muted">
                    {TIPO_EVENTO_LABEL[d.tipoEvento] ?? d.tipoEvento}
                  </span>
                </td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular text-ink-secondary">{eur(d.base)}</td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular">{num(d.porcentaje, 0)}%</td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular font-semibold">{eur(d.importe)}</td>
                <td className="border-b border-[#f0eae1] py-2 text-right">
                  <Badge tone={d.pagada ? "ok" : "warn"}>{d.pagada ? "Pagada" : "Pendiente"}</Badge>
                </td>
                <td className="border-b border-[#f0eae1] py-2 text-right">
                  {d.pagada ? (
                    <button
                      onClick={() => deshacer(d)}
                      disabled={busy === d.key}
                      className="inline-flex items-center gap-1 rounded-sm border-med border-border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted hover:bg-beige-warm"
                    >
                      <Undo2 size={12} /> Deshacer
                    </button>
                  ) : (
                    <button
                      onClick={() => pagar(d)}
                      disabled={busy === d.key}
                      className="inline-flex items-center gap-1 rounded-sm border-med border-ok bg-ok px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-cream hover:opacity-90"
                    >
                      <Check size={12} /> Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[10.5px] text-ink-muted">
          Al pagar se crea el gasto en Tesorería (naturaleza «comisión»), que <b>no computa</b> en
          la contabilidad mensual (§5.4).
        </p>
      </Card>
    </div>
  );
}
