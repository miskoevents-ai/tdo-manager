import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ContabilidadClient } from "@/components/contabilidad/ContabilidadClient";
import { ResumenComisiones } from "@/components/comisiones/ResumenComisiones";
import { InfoNote } from "@/components/ui/InfoNote";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria, getContabilidadInicio, getOportunidades, getComisionesConfig, getComisiones } from "@/lib/data";
import { computeDevengos, resumenComisiones } from "@/lib/comisiones";

export const dynamic = "force-dynamic";

export default async function ContabilidadPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos, inicio, ops, comConfig, comPagadas;
  try {
    [movimientos, inicio, ops, comConfig, comPagadas] = await Promise.all([
      getTesoreria(),
      getContabilidadInicio(),
      getOportunidades(),
      getComisionesConfig(),
      getComisiones(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const resumenCom = resumenComisiones(computeDevengos(ops, comConfig, comPagadas));

  return (
    <div className="space-y-5">
      <InfoNote id="contabilidad">
        ¿El negocio gana o pierde? Es un resumen filtrado de Tesorería desde el arranque del
        negocio: facturas propias cobradas, gastos fijos y de estructura (regla §5.4). Con las
        vistas de arriba separas la contabilidad oficial de la de amigos.
      </InfoNote>
      <Overline className="!mt-0">Contabilidad mensual</Overline>
      <ContabilidadClient movimientos={movimientos} inicio={inicio} />
      <ResumenComisiones {...resumenCom} />
    </div>
  );
}
