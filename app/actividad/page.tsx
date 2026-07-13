import { Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getActividad } from "@/lib/data";
import type { RegistroActividad } from "@/lib/types";

export const dynamic = "force-dynamic";

// Inicial de color estable por persona (para el punto de la izquierda).
const COLORES = ["bg-sage", "bg-clay", "bg-ok", "bg-warn", "bg-[#7a6cae]", "bg-[#3f7fa3]"];
function colorDe(nombre: string) {
  let n = 0;
  for (const c of nombre) n = (n + c.charCodeAt(0)) % COLORES.length;
  return COLORES[n];
}

function cuando(iso: string): string {
  const d = new Date(iso);
  const dif = Date.now() - d.getTime();
  const min = Math.round(dif / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function agrupaPorDia(items: RegistroActividad[]) {
  const grupos: Record<string, RegistroActividad[]> = {};
  for (const it of items) {
    const dia = new Date(it.created_at).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    (grupos[dia] ??= []).push(it);
  }
  return Object.entries(grupos);
}

export default async function ActividadPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let registros: RegistroActividad[];
  try {
    registros = await getActividad(300);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  const dias = agrupaPorDia(registros);

  return (
    <div className="space-y-5">
      <InfoNote id="actividad">
        Quién ha hecho qué y cuándo en el manager: altas y cambios de oportunidades, facturas,
        movimientos y tareas. Sirve para tenerlo todo registrado entre el equipo.
      </InfoNote>
      <Overline className="!mt-0">Actividad reciente</Overline>

      {registros.length === 0 ? (
        <p className="py-6 text-center text-small text-ink-muted">
          Aún no hay actividad registrada. En cuanto cada uno entre con su usuario, aquí se irá
          anotando lo que hace.
        </p>
      ) : (
        <div className="space-y-6">
          {dias.map(([dia, items]) => (
            <div key={dia}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {dia}
              </p>
              <div className="overflow-hidden rounded-lg border-hair border-border bg-white">
                {items.map((it) => {
                  const quien = it.usuario ?? "Alguien";
                  return (
                    <div key={it.id} className="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-cream ${colorDe(quien)}`}>
                        {quien[0]?.toUpperCase() ?? "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px]">
                          <b>{quien}</b> {it.accion}
                          {it.detalle && <span className="text-ink-secondary"> — {it.detalle}</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{cuando(it.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
