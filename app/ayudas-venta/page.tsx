import { InfoNote } from "@/components/ui/InfoNote";
import { AyudasVentaClient } from "@/components/ayudas/AyudasVentaClient";

export const dynamic = "force-dynamic";

// Ayudas para la venta: plantillas de mensajes, respuestas a objeciones y
// argumentario. Recurso siempre disponible para el equipo (no hay datos
// sensibles), para responder y cerrar más rápido.
export default function AyudasVentaPage() {
  return (
    <div className="space-y-5">
      <InfoNote id="ayudas-venta">
        Plantillas de mensajes, respuestas a objeciones y argumentos de venta para responder rápido y
        cerrar más. Copia, rellena los [corchetes] y a por ello.
      </InfoNote>
      <AyudasVentaClient />
    </div>
  );
}
