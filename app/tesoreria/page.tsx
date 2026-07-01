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
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">Tesorería</Overline>
        <MovimientoDialog clientes={clientes} oportunidades={oportunidades} />
      </div>
      <TesoreriaClient movimientos={movimientos} clientes={clientes} oportunidades={oportunidades} />
    </div>
  );
}
