import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getInventario, getOportunidades } from "@/lib/data";
import { eur, num } from "@/lib/format";
import type { Inventario, Oportunidad } from "@/lib/types";

export const dynamic = "force-dynamic";
const CONTRATADAS = ["confirmada", "en_produccion", "realizada", "facturada"];

export default async function RoiPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let items: Inventario[];
  let ops: Oportunidad[];
  try {
    [items, ops] = await Promise.all([getInventario(), getOportunidades()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  // Ingresos y nº de alquileres por artículo, a partir de las líneas de
  // presupuesto vinculadas al catálogo (articulo_id) en oportunidades contratadas.
  const agg = new Map<string, { veces: number; ingresos: number }>();
  for (const o of ops) {
    if (!CONTRATADAS.includes(o.estado)) continue;
    for (const l of o.presupuesto_lineas ?? []) {
      if (!l.articulo_id) continue;
      const cur = agg.get(l.articulo_id) ?? { veces: 0, ingresos: 0 };
      cur.veces += 1;
      cur.ingresos += l.cantidad * l.precio_unitario;
      agg.set(l.articulo_id, cur);
    }
  }

  const filas = items
    .map((it) => {
      const a = agg.get(it.id) ?? { veces: 0, ingresos: 0 };
      const inversion = (it.coste_unitario ?? 0) * (it.cantidad_total ?? 1);
      const roi = inversion > 0 ? (a.ingresos / inversion) * 100 : null;
      return {
        it,
        veces: a.veces,
        ingresos: a.ingresos,
        inversion,
        roi,
        amortizado: inversion > 0 && a.ingresos >= inversion,
      };
    })
    .sort((a, b) => b.ingresos - a.ingresos);

  const totalIngresos = filas.reduce((s, f) => s + f.ingresos, 0);
  const totalInversion = filas.reduce((s, f) => s + f.inversion, 0);
  const roiGlobal = totalInversion > 0 ? (totalIngresos / totalInversion) * 100 : null;
  const amortizados = filas.filter((f) => f.amortizado).length;
  const stockMuerto = filas.filter((f) => f.veces === 0).length;

  return (
    <div className="space-y-5">
      <Link href="/inventario" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage">
        <ArrowLeft size={14} /> Inventario
      </Link>

      <div>
        <Overline className="!mt-0">Rentabilidad del inventario (ROI)</Overline>
        <p className="mt-1 text-[12px] text-ink-muted">
          Ingresos generados por cada artículo según los presupuestos vinculados al catálogo (oportunidades
          contratadas) frente a su coste de compra. Se rellena a medida que presupuestas desde el catálogo.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ingresos por alquiler" value={eur(totalIngresos)} tone="text-sage" />
        <Kpi label="Inversión en material" value={eur(totalInversion)} tone="text-clay" />
        <Kpi label="ROI global" value={roiGlobal != null ? `${num(roiGlobal, 0)}%` : "—"} tone="text-ok" />
        <Kpi label="Amortizados / stock muerto" value={`${amortizados} / ${stockMuerto}`} tone="text-ink" />
      </div>

      {/* Tabla */}
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border py-2 text-left font-semibold">Artículo</th>
              <th className="border-b border-border py-2 text-right font-semibold">Nº alq.</th>
              <th className="border-b border-border py-2 text-right font-semibold">Ingresos</th>
              <th className="border-b border-border py-2 text-right font-semibold">Inversión</th>
              <th className="border-b border-border py-2 text-right font-semibold">ROI</th>
              <th className="border-b border-border py-2 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.it.id} className="hover:bg-beige-light">
                <td className="border-b border-[#f0eae1] py-2">
                  <div className="font-medium">{f.it.articulo}</div>
                  <div className="text-[11px] text-ink-muted">{f.it.categoria ?? "—"}</div>
                </td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular">{f.veces}</td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular font-semibold">{eur(f.ingresos)}</td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular text-ink-secondary">{eur(f.inversion)}</td>
                <td className="border-b border-[#f0eae1] py-2 text-right tabular">
                  {f.roi != null ? `${num(f.roi, 0)}%` : "—"}
                </td>
                <td className="border-b border-[#f0eae1] py-2 text-right">
                  {f.veces === 0 ? (
                    <Badge tone="neutral">Sin alquilar</Badge>
                  ) : f.amortizado ? (
                    <Badge tone="ok">Amortizado</Badge>
                  ) : (
                    <Badge tone="warn">En camino</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-[11px] text-ink-muted">
        Consejo: cuanto más presupuestes eligiendo artículos <b>desde el catálogo</b>, más fiable será este
        informe. Los artículos «sin alquilar» con inversión alta son candidatos a revisar o dar salida.
      </p>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  const bar = tone.replace("text-", "bg-");
  return (
    <Card className="relative overflow-hidden p-4 pl-[18px]">
      <span className={`absolute left-0 top-0 h-full w-[3px] ${bar}`} />
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[20px] tabular ${tone}`}>{value}</div>
    </Card>
  );
}
