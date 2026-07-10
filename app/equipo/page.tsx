import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { EquipoDialog } from "@/components/equipo/EquipoDialog";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getEquipo, getPartesHorasTodas } from "@/lib/data";
import { eur, fecha, num } from "@/lib/format";
import type { Equipo, ParteHoras } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let equipo: Equipo[], partes: ParteHoras[];
  try {
    [equipo, partes] = await Promise.all([getEquipo(), getPartesHorasTodas()]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  // Resumen de horas por persona: total y mes en curso (horario de Madrid).
  const mesActual = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" })
    .format(new Date())
    .slice(0, 7);
  const porPersona = new Map<
    string,
    { horas: number; coste: number; horasMes: number; costeMes: number; n: number }
  >();
  for (const p of partes) {
    const nombre =
      p.equipo?.nombre ?? (p.persona_externa ? `${p.persona_externa} (externo)` : "Sin asignar");
    const acc = porPersona.get(nombre) ?? { horas: 0, coste: 0, horasMes: 0, costeMes: 0, n: 0 };
    const h = Number(p.horas);
    const c = h * Number(p.precio_hora);
    acc.horas += h;
    acc.coste += c;
    acc.n += 1;
    if ((p.fecha ?? p.created_at.slice(0, 10)).startsWith(mesActual)) {
      acc.horasMes += h;
      acc.costeMes += c;
    }
    porPersona.set(nombre, acc);
  }
  const resumenHoras = Array.from(porPersona.entries()).sort((a, b) => b[1].horas - a[1].horas);
  const ultimasPartes = partes.slice(0, 8);

  return (
    <div className="space-y-5">
      <InfoNote id="equipo">Las personas del equipo. Se usan como responsables de eventos y en el campo «Pagado por» de los gastos.</InfoNote>
      <div className="flex items-center justify-between">
        <Overline className="!mt-0">{equipo.length} personas</Overline>
        <EquipoDialog />
      </div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Nombre", "Rol", "€/hora", "Estado", ""].map((h) => (
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
                <div className="mt-0.5 text-[12px] text-ink-muted">{p.rol ?? "—"}</div>
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

      {/* Horas imputadas por persona (desde la pestaña Costes de cada evento) */}
      <Overline>Horas imputadas</Overline>
      <Card>
        {resumenHoras.length === 0 ? (
          <p className="py-2 text-small text-ink-muted">
            Aún no hay horas imputadas. Se apuntan desde la ficha de cada evento → pestaña{" "}
            <b>Costes → Personal (horas)</b>: cualquiera del equipo (Cristina incluida) puede
            imputar las suyas y aquí se suman solas.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
                    <th className="border-b border-border py-2 text-left font-semibold">Persona</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Horas (mes)</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Coste (mes)</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Horas (total)</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Coste (total)</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenHoras.map(([nombre, s]) => (
                    <tr key={nombre}>
                      <td className="border-b border-[#f0eae1] py-2 font-medium">{nombre}</td>
                      <td className="border-b border-[#f0eae1] py-2 text-right tabular">{num(s.horasMes, 1)}</td>
                      <td className="border-b border-[#f0eae1] py-2 text-right tabular">{eur(s.costeMes)}</td>
                      <td className="border-b border-[#f0eae1] py-2 text-right tabular">{num(s.horas, 1)}</td>
                      <td className="border-b border-[#f0eae1] py-2 text-right tabular font-semibold">{eur(s.coste)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Últimas imputaciones
              </div>
              {ultimasPartes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-t border-border py-[8px] text-[12.5px] first:border-t-0"
                >
                  <span className="min-w-0 truncate">
                    <b>{p.equipo?.nombre ?? (p.persona_externa ? `${p.persona_externa} (externo)` : "—")}</b>
                    {p.tarea ? ` · ${p.tarea}` : ""}
                    {p.oportunidad ? ` · ${p.oportunidad.titulo}` : ""}
                  </span>
                  <span className="ml-2 shrink-0 tabular text-ink-secondary">
                    {p.fecha ? `${fecha(p.fecha)} · ` : ""}
                    {num(Number(p.horas), 1)} h · {eur(Number(p.horas) * Number(p.precio_hora))}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
