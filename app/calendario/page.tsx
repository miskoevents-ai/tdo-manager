import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { Calendario } from "@/components/calendario/Calendario";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getReservas, getTesoreria } from "@/lib/data";
import { construirEventos, mesInicial } from "@/lib/calendario";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let ops, reservas, tesoreria;
  try {
    [ops, reservas, tesoreria] = await Promise.all([
      getOportunidades(),
      getReservas(),
      getTesoreria(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const eventos = construirEventos(ops, reservas, tesoreria);
  const hoy = new Date().toISOString().slice(0, 10);
  const inicial = mesInicial(eventos, hoy);

  return (
    <div className="space-y-5">
      <InfoNote id="calendario">Vista de calendario con los eventos, montajes y recogidas de material ordenados por fecha.</InfoNote>
      <Overline className="!mt-0">Calendario</Overline>
      <Calendario eventos={eventos} mesInicial={inicial} hoy={hoy} />
    </div>
  );
}
