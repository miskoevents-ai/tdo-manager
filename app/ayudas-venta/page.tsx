import { InfoNote } from "@/components/ui/InfoNote";
import { AyudasVentaClient } from "@/components/ayudas/AyudasVentaClient";
import { getCalendlyUrl } from "@/lib/data";
import { getUsuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

// Ayudas para la venta: plantillas de mensajes, respuestas a objeciones,
// argumentario y enlace de reservas de reunión. Recurso siempre disponible
// para el equipo (no hay datos sensibles), para responder y cerrar más rápido.
export default async function AyudasVentaPage() {
  const [calendlyUrl, usuario] = await Promise.all([getCalendlyUrl(), getUsuarioActual()]);
  const esAdmin = usuario ? usuario.esAdmin : true;
  return (
    <div className="space-y-5">
      <InfoNote id="ayudas-venta">
        Plantillas de mensajes, respuestas a objeciones y argumentos de venta para responder rápido y
        cerrar más. Copia, rellena los [corchetes] y a por ello.
      </InfoNote>
      <AyudasVentaClient calendlyUrl={calendlyUrl} esAdmin={esAdmin} />
    </div>
  );
}
