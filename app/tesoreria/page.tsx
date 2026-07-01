import Link from "next/link";
import { Repeat } from "lucide-react";
import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { TesoreriaClient } from "@/components/tesoreria/TesoreriaClient";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria, getClientes, getOportunidades } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TesoreriaPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos, clientes, ops;
  try {
    [movimientos, clientes, ops] = await Promise.all([
      getTesoreria(),
      getClientes(),
      getOportunidades(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const oportunidades = ops.map((o) => ({ id: o.id, numero: o.numero, titulo: o.titulo }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Overline className="!mt-0">Tesorería</Overline>
        <div className="flex items-center gap-2">
          <Link
            href="/gastos-fijos"
            className="inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-sage transition-colors hover:bg-sage-tint"
          >
            <Repeat size={14} /> Gastos fijos
          </Link>
          <MovimientoDialog clientes={clientes} oportunidades={oportunidades} />
        </div>
      </div>
      <TesoreriaClient movimientos={movimientos} clientes={clientes} oportunidades={oportunidades} />
    </div>
  );
}
