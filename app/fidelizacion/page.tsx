import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { FidelizacionClient } from "@/components/fidelizacion/FidelizacionClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getClientes } from "@/lib/data";
import {
  resenasPendientes,
  aniversariosBoda,
  recomendacionesPendientes,
  reactivarB2B,
  RESENA_URL,
} from "@/lib/fidelizacion";

export const dynamic = "force-dynamic";

export default async function FidelizacionPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let ops, clientes;
  try {
    [ops, clientes] = await Promise.all([getOportunidades(), getClientes()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const resenas = resenasPendientes(ops, hoy);
  const aniversarios = aniversariosBoda(ops, hoy);
  const recomendaciones = recomendacionesPendientes(ops, clientes);
  const reactivar = reactivarB2B(ops, clientes, hoy);

  return (
    <div className="space-y-5">
      <InfoNote id="fidelizacion">
        Acciones para cuidar a tus clientes y que vuelvan: pedir reseñas de 5★, felicitar
        aniversarios de boda, pedir recomendaciones y reactivar clientes que hace tiempo que no
        contratan. Cada una trae un mensaje listo para copiar y enviar.
      </InfoNote>
      <Overline className="!mt-0">Fidelización</Overline>

      {!RESENA_URL && (
        <div className="rounded-md border-hair border-[#e7d3a6] bg-warn-tint px-[15px] py-[10px] text-[12px] text-[#7a5a1a]">
          Consejo: añade tu enlace de reseñas (Google / Bodas.net) en la variable{" "}
          <code className="rounded-sm bg-white/60 px-1">NEXT_PUBLIC_RESENA_URL</code> de Vercel para
          que se incluya automáticamente en el mensaje de reseña.
        </div>
      )}

      <FidelizacionClient
        resenas={resenas}
        aniversarios={aniversarios}
        recomendaciones={recomendaciones}
        reactivar={reactivar}
      />
    </div>
  );
}
