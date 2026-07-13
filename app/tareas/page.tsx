import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { TareasClient } from "@/components/tareas/TareasClient";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getTareas, getOportunidades, getEquipo } from "@/lib/data";
import { getUsuarioActual } from "@/lib/sesion";
import { canonizarNombre } from "@/lib/personas";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let tareas, ops, equipo;
  try {
    [tareas, ops, equipo] = await Promise.all([getTareas(), getOportunidades(), getEquipo()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }
  const usuario = await getUsuarioActual();

  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());

  // Para vincular tareas a eventos: solo oportunidades vivas (no cerradas).
  const opsLite = ops
    .filter((o) => !["perdida", "descartada"].includes(o.estado))
    .map((o) => ({ id: o.id, titulo: o.titulo, tipoEvento: o.tipo_evento, fechaEvento: o.fecha_evento }));

  // Personas: el equipo activo + cualquier nombre ya usado en tareas.
  const nombres = new Set(equipo.filter((e) => e.activo).map((e) => e.nombre));
  for (const t of tareas) {
    if (t.asignada_a) nombres.add(t.asignada_a);
    if (t.creada_por) nombres.add(t.creada_por);
  }
  const listaPersonas = Array.from(nombres).sort((a, b) => a.localeCompare(b, "es"));
  // Quién soy según el usuario conectado (canonizado contra la lista real).
  const yoInicial = usuario ? canonizarNombre(usuario.nombre, listaPersonas) ?? "" : "";

  // Info del equipo ACTIVO (id + €/hora) para imputar horas al cerrar una tarea.
  const equipoInfo = equipo
    .filter((e) => e.activo)
    .map((e) => ({
      nombre: e.nombre,
      id: e.id,
      precioHora: Number(e.precio_hora ?? 0),
    }));

  return (
    <div className="space-y-5">
      <InfoNote id="tareas">
        La lista de tareas del equipo: cualquiera asigna a cualquiera, y quien la recibe la marca en
        curso, hecha o &quot;no puedo&quot; con su comentario. Elige quién eres arriba y verás tu panel;
        las vencidas avisan en Inicio.
      </InfoNote>
      <Overline className="!mt-0">Tareas del equipo</Overline>
      <TareasClient
        tareas={tareas}
        oportunidades={opsLite}
        personas={listaPersonas}
        equipoInfo={equipoInfo}
        yoInicial={yoInicial}
        hoy={hoy}
      />
    </div>
  );
}
