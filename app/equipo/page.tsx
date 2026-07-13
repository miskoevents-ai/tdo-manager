import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { Badge } from "@/components/ui/badge";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { EquipoDialog } from "@/components/equipo/EquipoDialog";
import { SueldosPanel } from "@/components/equipo/SueldosPanel";
import { DistribucionSemanal, type DistribPersona } from "@/components/equipo/DistribucionSemanal";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getEquipo, getPartesHorasTodas, getSueldos, getGastosFijos } from "@/lib/data";
import { eur, fecha, num } from "@/lib/format";
import { FASE_LABEL } from "@/lib/estados";
import type { Equipo, ParteHoras, Sueldo, GastoFijo } from "@/lib/types";

export const dynamic = "force-dynamic";

// Palabras normalizadas (sin acentos ni signos) de un texto.
function palabras(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[\s(),.·/-]+/)
    .filter(Boolean);
}

// Empareja un gasto fijo con la persona de la que es el sueldo, SOLO si:
//  · el concepto empieza por "sueldo", y
//  · el nombre (primera palabra) de UNA única persona aparece como palabra
//    completa en el concepto ("Cris" no cuela en "Sueldo Cristina …").
function sueldosDesdeGastosFijos(
  gastos: GastoFijo[],
  personas: { id: string; nombre: string }[],
): Record<string, { importe: number; concepto: string; desde?: string | null; hasta?: string | null }> {
  const out: Record<string, { importe: number; concepto: string; desde?: string | null; hasta?: string | null }> = {};
  const idsEquipo = new Set(personas.map((p) => p.id));
  for (const g of gastos) {
    if (!g.activo) continue;
    // 1) Enlace explícito (categoría "sueldo" con beneficiario elegido).
    if (g.equipo_id && idsEquipo.has(g.equipo_id)) {
      const prev = out[g.equipo_id];
      if (!prev || Number(g.importe_mensual) > prev.importe) {
        out[g.equipo_id] = { importe: Number(g.importe_mensual), concepto: g.concepto, desde: g.desde, hasta: g.hasta };
      }
      continue;
    }
    // 2) Respaldo: por concepto ("Sueldo <nombre>") con palabra completa.
    const pal = palabras(g.concepto);
    if (pal[0] !== "sueldo") continue;
    const set = new Set(pal);
    const candidatos = personas.filter((p) => {
      const primera = palabras(p.nombre)[0];
      return primera && set.has(primera);
    });
    if (candidatos.length === 1) {
      // Si hay varios sueldos para la misma persona, nos quedamos con el mayor importe.
      const prev = out[candidatos[0].id];
      if (!prev || Number(g.importe_mensual) > prev.importe) {
        out[candidatos[0].id] = {
          importe: Number(g.importe_mensual),
          concepto: g.concepto,
          desde: g.desde,
          hasta: g.hasta,
        };
      }
    }
  }
  return out;
}

export default async function EquipoPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let equipo: Equipo[], partes: ParteHoras[], sueldos: Sueldo[], gastosFijos: GastoFijo[];
  try {
    [equipo, partes, sueldos, gastosFijos] = await Promise.all([
      getEquipo(),
      getPartesHorasTodas(),
      getSueldos(),
      getGastosFijos(),
    ]);
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  // Resumen de horas por persona: total y mes en curso (horario de Madrid).
  const mesActual = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" })
    .format(new Date())
    .slice(0, 7);

  // Coste de horas imputadas este mes por persona (por equipo_id), para
  // comparar con su sueldo.
  const costeMesPorId: Record<string, number> = {};
  for (const p of partes) {
    if (!p.equipo_id) continue;
    if (!(p.fecha ?? p.created_at.slice(0, 10)).startsWith(mesActual)) continue;
    costeMesPorId[p.equipo_id] = (costeMesPorId[p.equipo_id] ?? 0) + Number(p.horas) * Number(p.precio_hora);
  }
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

  // Distribución de horas de ESTA semana (lunes–domingo, Madrid) por persona:
  // repartidas por fase (comercial/pre/durante/post) y por proyecto.
  const hoyMadrid = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const hoyD = new Date(hoyMadrid + "T00:00:00Z");
  const lunes = new Date(hoyD);
  lunes.setUTCDate(hoyD.getUTCDate() - ((hoyD.getUTCDay() + 6) % 7));
  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  const iniSem = lunes.toISOString().slice(0, 10);
  const finSem = domingo.toISOString().slice(0, 10);
  const fmtCorto = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
  const rangoSemana = `${fmtCorto(iniSem)}–${fmtCorto(finSem)}`;

  const distMap = new Map<
    string,
    { total: number; coste: number; fases: Record<string, number>; proyectos: Map<string, number> }
  >();
  for (const p of partes) {
    const dia = p.fecha ?? p.created_at.slice(0, 10);
    if (dia < iniSem || dia > finSem) continue;
    const nombre =
      p.equipo?.nombre ?? (p.persona_externa ? `${p.persona_externa} (externo)` : "Sin asignar");
    const acc = distMap.get(nombre) ?? { total: 0, coste: 0, fases: {} as Record<string, number>, proyectos: new Map<string, number>() };
    const h = Number(p.horas);
    acc.total += h;
    acc.coste += h * Number(p.precio_hora);
    const fase = p.fase ?? "pre";
    acc.fases[fase] = (acc.fases[fase] ?? 0) + h;
    const proy = p.oportunidad?.titulo ?? "Sin proyecto";
    acc.proyectos.set(proy, (acc.proyectos.get(proy) ?? 0) + h);
    distMap.set(nombre, acc);
  }
  const distribucion: DistribPersona[] = Array.from(distMap.entries())
    .map(([nombre, d]) => ({
      nombre,
      total: d.total,
      coste: d.coste,
      fases: d.fases,
      proyectos: Array.from(d.proyectos.entries())
        .map(([titulo, horas]) => ({ titulo, horas }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 5),
    }))
    .sort((a, b) => b.total - a.total);

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

      {/* Sueldos del equipo y cobertura con horas imputadas este mes */}
      <Overline>Sueldos</Overline>
      <SueldosPanel
        personas={equipo.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre }))}
        sueldos={sueldos}
        sueldosFijos={sueldosDesdeGastosFijos(
          gastosFijos,
          equipo.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre })),
        )}
        costeMesPorId={costeMesPorId}
        mesActual={mesActual}
      />

      {/* Distribución de horas de esta semana por fase y proyecto */}
      <div className="flex items-baseline justify-between">
        <Overline className="!mt-0">Horas de esta semana</Overline>
        <span className="text-[11.5px] text-ink-muted">{rangoSemana}</span>
      </div>
      <DistribucionSemanal personas={distribucion} rango={rangoSemana} />

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
                    {p.fase ? ` · ${FASE_LABEL[p.fase] ?? p.fase}` : ""}
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
