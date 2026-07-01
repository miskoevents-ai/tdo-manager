import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ContabilidadClient } from "@/components/contabilidad/ContabilidadClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ContabilidadPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos;
  try {
    movimientos = await getTesoreria();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <Overline className="!mt-0">Contabilidad mensual</Overline>
        <p className="mt-1 text-[12px] text-ink-muted">
          Arranca en junio 2026. Solo cuentan ingresos de facturas propias y gastos fijos (§5.4).
        </p>
      </div>
      <ContabilidadClient movimientos={movimientos} />
    </div>
  );
}
