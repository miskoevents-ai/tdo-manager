import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { FacturasList } from "@/components/facturas/FacturasList";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getFacturas } from "@/lib/data";
import type { Factura } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FacturasPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let facturas: Factura[];
  try {
    facturas = await getFacturas();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="facturas">Las facturas emitidas y su estado de cobro (emitida, cobrada o vencida).</InfoNote>
      <Overline className="!mt-0">{facturas.length} facturas</Overline>
      {facturas.length === 0 ? (
        <p className="text-small text-ink-muted">
          Aún no hay facturas. Emite una desde la ficha de una oportunidad confirmada.
        </p>
      ) : (
        <FacturasList facturas={facturas} />
      )}
    </div>
  );
}
