import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { GastoFijoDialog } from "@/components/gastos/GastoFijoDialog";
import { GenerarMesButton } from "@/components/gastos/GenerarMesButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getGastosFijos } from "@/lib/data";
import { eur } from "@/lib/format";
import type { GastoFijo } from "@/lib/types";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

export default async function GastosFijosPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let gastos: GastoFijo[];
  try {
    gastos = await getGastosFijos();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const mesActual = new Date().toISOString().slice(0, 7);
  const totalMensual = gastos
    .filter((g) => g.activo && g.periodicidad === "mensual")
    .reduce((s, g) => s + Number(g.importe_mensual), 0);

  return (
    <div className="space-y-5">
      <Link href="/tesoreria" className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage">
        <ArrowLeft size={14} /> Tesorería
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Overline className="!mt-0">Gastos fijos</Overline>
          <p className="mt-1 text-[12px] text-ink-muted">
            Plantilla mensual · {eur(totalMensual)} /mes en gastos mensuales activos
          </p>
        </div>
        <GastoFijoDialog />
      </div>

      <Card className="bg-sage-tint/40">
        <Overline>Generar mes</Overline>
        <p className="mb-3 mt-1 text-[12px] text-ink-secondary">
          Crea en Tesorería los movimientos (previstos) de este mes a partir de la plantilla activa.
          No duplica si ya se generaron.
        </p>
        <GenerarMesButton mesActual={mesActual} />
      </Card>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Concepto", "Importe", "Periodicidad", "Paga", "Estado", ""].map((h) => (
                <th key={h} className="bg-beige-warm px-[15px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id} className="hover:bg-beige-light">
                <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                  {g.concepto}
                  {g.notas && <span className="ml-2 text-[11px] text-ink-muted">{g.notas}</span>}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] tabular">{eur(Number(g.importe_mensual))}</td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">{PERIOD_LABEL[g.periodicidad] ?? g.periodicidad}</td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">{g.quien_lo_paga ?? "—"}</td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={g.activo ? "ok" : "neutral"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3 text-right"><GastoFijoDialog gasto={g} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="space-y-2 md:hidden">
        {gastos.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[14px] font-semibold">{g.concepto}</div>
                <div className="mt-0.5 text-[12px] text-ink-muted">
                  {PERIOD_LABEL[g.periodicidad] ?? g.periodicidad}
                  {g.quien_lo_paga ? ` · ${g.quien_lo_paga}` : ""}
                </div>
              </div>
              <GastoFijoDialog gasto={g} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="tabular text-[15px] font-semibold text-sage">{eur(Number(g.importe_mensual))}</span>
              <Badge tone={g.activo ? "ok" : "neutral"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
