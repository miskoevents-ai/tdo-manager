import { Overline } from "@/components/ui/card";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ContabilidadClient } from "@/components/contabilidad/ContabilidadClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTesoreria, getEquipo } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ContabilidadPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let movimientos, equipo;
  try {
    [movimientos, equipo] = await Promise.all([getTesoreria(), getEquipo()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  // Socios con % definido (para el reparto). Editable en Equipo.
  const socios = equipo
    .filter((e) => e.porcentaje != null && Number(e.porcentaje) > 0)
    .map((e) => ({ nombre: e.nombre, porcentaje: Number(e.porcentaje) }));

  return (
    <div className="space-y-5">
      <div>
        <Overline className="!mt-0">Contabilidad mensual</Overline>
        <p className="mt-1 text-[12px] text-ink-muted">
          Arranca en junio 2026. Solo cuentan ingresos de facturas propias y gastos fijos (§5.4).
        </p>
      </div>
      <ContabilidadClient movimientos={movimientos} socios={socios} />
    </div>
  );
}
