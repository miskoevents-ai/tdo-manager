import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ContabilidadClient } from "@/components/contabilidad/ContabilidadClient";
import { InfoNote } from "@/components/ui/InfoNote";
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
      <InfoNote id="contabilidad">
        ¿El negocio gana o pierde? Es un resumen filtrado de Tesorería: solo cuenta, desde junio
        2026, los ingresos de facturas propias ya cobradas y los gastos fijos (regla §5.4).
      </InfoNote>
      <Overline className="!mt-0">Contabilidad mensual</Overline>
      <ContabilidadClient movimientos={movimientos} />
    </div>
  );
}
