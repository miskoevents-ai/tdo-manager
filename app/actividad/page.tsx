import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { ActividadClient } from "@/components/actividad/ActividadClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getActividad } from "@/lib/data";
import type { RegistroActividad } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ActividadPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let registros: RegistroActividad[];
  try {
    registros = await getActividad(400);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="actividad">
        Quién ha hecho qué y cuándo en el manager: altas y cambios de oportunidades, facturas,
        movimientos, reembolsos, tareas y borrados. Filtra por persona o tipo, y pincha para ir al
        registro afectado.
      </InfoNote>
      <Overline className="!mt-0">Actividad reciente</Overline>

      {registros.length === 0 ? (
        <p className="py-6 text-center text-small text-ink-muted">
          Aún no hay actividad registrada. En cuanto cada uno entre con su usuario, aquí se irá
          anotando lo que hace.
        </p>
      ) : (
        <ActividadClient registros={registros} />
      )}
    </div>
  );
}
