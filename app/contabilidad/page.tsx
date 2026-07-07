import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ContabilidadClient } from "@/components/contabilidad/ContabilidadClient";
import { InfoNote } from "@/components/ui/InfoNote";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria, getContabilidadInicio } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ContabilidadPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos, inicio;
  try {
    [movimientos, inicio] = await Promise.all([getTesoreria(), getContabilidadInicio()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="contabilidad">
        ¿El negocio gana o pierde? Es un resumen filtrado de Tesorería desde el arranque del
        negocio: facturas propias cobradas, gastos fijos y de estructura (regla §5.4). Con las
        vistas de arriba separas la contabilidad oficial de la de amigos.
      </InfoNote>
      <Overline className="!mt-0">Contabilidad mensual</Overline>
      <ContabilidadClient movimientos={movimientos} inicio={inicio} />
    </div>
  );
}
