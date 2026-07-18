import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { GastoFijoDialog } from "@/components/gastos/GastoFijoDialog";
import { GastosFijosLista } from "@/components/gastos/GastosFijosLista";
import { GenerarMesButton } from "@/components/gastos/GenerarMesButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getGastosFijos, getEquipo, getProveedores } from "@/lib/data";
import { eur } from "@/lib/format";
import type { GastoFijo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GastosFijosPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let gastos: GastoFijo[];
  let responsables: string[] = [];
  let equipoOpts: { id: string; nombre: string }[] = [];
  let proveedorOpts: { id: string; nombre: string }[] = [];
  try {
    const [gs, equipo, provs] = await Promise.all([getGastosFijos(), getEquipo(), getProveedores()]);
    gastos = gs;
    const activos = equipo.filter((e) => e.activo);
    responsables = activos.map((e) => e.nombre);
    equipoOpts = activos.map((e) => ({ id: e.id, nombre: e.nombre }));
    proveedorOpts = provs.map((p) => ({ id: p.id, nombre: p.nombre }));
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const mesActual = new Date().toISOString().slice(0, 7);
  const totalMensual = gastos
    .filter((g) => g.activo && g.periodicidad === "mensual")
    .reduce((s, g) => s + Number(g.importe_mensual), 0);

  return (
    <div className="space-y-5">
      <InfoNote id="gastos-fijos">Gastos que se repiten cada mes (alquiler, suministros, cuotas…). Puedes generarlos automáticamente y cuentan en la Contabilidad.</InfoNote>
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
        <GastoFijoDialog responsables={responsables} equipo={equipoOpts} proveedores={proveedorOpts} />
      </div>

      <Card className="bg-sage-tint/40">
        <Overline>Generar mes</Overline>
        <p className="mb-3 mt-1 text-[12px] text-ink-secondary">
          Crea en Tesorería los movimientos (previstos) de este mes a partir de la plantilla activa.
          No duplica si ya se generaron.
        </p>
        <GenerarMesButton mesActual={mesActual} />
      </Card>

      {/* Lista con filtros (texto, categoría, quién paga, estado) */}
      <GastosFijosLista gastos={gastos} responsables={responsables} equipo={equipoOpts} proveedores={proveedorOpts} />
    </div>
  );
}
