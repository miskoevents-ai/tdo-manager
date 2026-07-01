import { Card, Overline } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { EquipoDialog } from "@/components/equipo/EquipoDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getEquipo } from "@/lib/data";
import { eur, num } from "@/lib/format";
import type { Equipo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let equipo: Equipo[];
  try {
    equipo = await getEquipo();
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{equipo.length} personas</Overline>
        <EquipoDialog />
      </div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Nombre", "Rol", "%", "€/hora", "Estado", ""].map((h) => (
                <th key={h} className="bg-beige-warm px-[15px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipo.map((p) => (
              <tr key={p.id} className="hover:bg-beige-light">
                <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                  {p.nombre}
                  {p.notas && <span className="ml-2 text-[11px] text-ink-muted">{p.notas}</span>}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">{p.rol ?? "—"}</td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] tabular">
                  {p.porcentaje != null ? `${num(p.porcentaje, 0)}%` : "—"}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] tabular">
                  {p.precio_hora != null ? eur(p.precio_hora) : "—"}
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={p.activo ? "ok" : "neutral"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3 text-right"><EquipoDialog persona={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="space-y-2 md:hidden">
        {equipo.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[14px] font-semibold">{p.nombre}</div>
                <div className="mt-0.5 text-[12px] text-ink-muted">
                  {p.rol ?? "—"}
                  {p.porcentaje != null ? ` · ${num(p.porcentaje, 0)}%` : ""}
                </div>
              </div>
              <EquipoDialog persona={p} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] text-ink-secondary">
                {p.precio_hora != null ? `${eur(p.precio_hora)}/h` : "Sin €/hora"}
              </span>
              <Badge tone={p.activo ? "ok" : "neutral"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
