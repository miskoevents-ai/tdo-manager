"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, Truck, Flower2, Calculator, Paperclip, Lock, LockOpen, Zap, Utensils, Package, Copy, StickyNote, FileText, Warehouse, HelpCircle, Moon, Recycle, Percent } from "lucide-react";
import { altaEnInventario } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { eur, fecha, num } from "@/lib/format";
import { FASES_HORAS } from "@/lib/estados";
import {
  crearParteHoras, borrarParteHoras,
  crearDesplazamiento, borrarDesplazamiento,
  crearCompra, borrarCompra,
  guardarKmPrecio, guardarDistanciaLugar,
  crearCosteEstimado, borrarCosteEstimado, guardarParamsCostes,
  adjuntarTicket, cerrarEvento, cuadrarEstimado,
  updateCosteEstimado, anadirLineaEstimada, duplicarCosteEstimado, copiarCostesDeOportunidad,
  guardarSubproyectos,
} from "@/app/actions";
import type { ParteHoras, Desplazamiento, Tesoreria, Equipo, Proveedor, CosteEstimado } from "@/lib/types";

type LugarInfo = { id: string; nombre: string; distancia_km: number | null } | null;
type CatalogoItem = { id: string; articulo: string; coste: number };
type OportunidadLite = { id: string; titulo: string; numero: string };

export function CostesTab({
  oportunidadId,
  base,
  partes,
  desplazamientos,
  compras,
  equipo,
  proveedores,
  kmPrecio,
  lugar,
  catalogo = [],
  otrasOportunidades = [],
  estimados = [],
  contingenciaPct = 6,
  margenObjetivoPct = 35,
  cerrada = false,
  cerradaFecha = null,
  pendienteCobro = 0,
  categoriasGasto = [],
  comision = 0,
  comisionDetalle = [],
  subproyectos = [],
}: {
  oportunidadId: string;
  base: number;
  partes: ParteHoras[];
  desplazamientos: Desplazamiento[];
  compras: Tesoreria[];
  equipo: Pick<Equipo, "id" | "nombre" | "precio_hora">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  kmPrecio: number;
  lugar: LugarInfo;
  catalogo?: CatalogoItem[];
  otrasOportunidades?: OportunidadLite[];
  estimados?: CosteEstimado[];
  contingenciaPct?: number;
  margenObjetivoPct?: number;
  comision?: number;
  comisionDetalle?: { persona: string; tipoEvento: string | null; porcentaje: number; importe: number }[];
  cerrada?: boolean;
  cerradaFecha?: string | null;
  pendienteCobro?: number;
  categoriasGasto?: string[];
  subproyectos?: { nombre: string; color: string }[];
}) {
  const router = useRouter();
  const r = () => router.refresh();

  const cPersonal = partes.reduce((s, p) => s + Number(p.horas) * Number(p.precio_hora), 0);
  const cDespl = desplazamientos.reduce(
    (s, d) => s + Number(d.coste_gasolina ?? 0) + Number(d.peaje ?? 0) + Number(d.parking ?? 0),
    0,
  );
  const cMaterial = compras.reduce((s, m) => s + Number(m.importe), 0);
  const cComision = Number(comision) || 0;
  const costes = cPersonal + cDespl + cMaterial + cComision;
  const margen = base - costes;
  const margenPct = base > 0 ? (margen / base) * 100 : 0;

  // Estimación previa: total + contingencia, para comparar con los reales.
  const totalEstimado = estimados.reduce((s, e) => s + Number(e.importe), 0);
  const estimadoConColchon = totalEstimado * (1 + contingenciaPct / 100);
  const desviacion = costes - estimadoConColchon;


  // Estimado por categoría, para la comparativa pre vs post.
  const estPorCat = { personal: 0, desplazamiento: 0, material: 0, otro: 0 };
  for (const e of estimados) {
    // Categoría insensible a mayúsculas: 'personal'/'desplazamiento' son claves;
    // 'material'/null van a material; el resto de etiquetas (Flores, Dietas…) a otro.
    const c = (e.categoria ?? "material").toLowerCase();
    const cubo = c === "personal" ? "personal" : c === "desplazamiento" ? "desplazamiento" : c === "material" ? "material" : "otro";
    estPorCat[cubo] += Number(e.importe);
  }

  // Cabecera adaptativa: un evento sin ejecutar NO tiene "100% de margen".
  // Mientras no haya costes reales (y no esté cerrado), la cabecera enseña el
  // PREVISTO (con su contingencia), que cuadra con la tabla Pre vs Post.
  const hayCostesReales = costes > 0.005;
  const usarPrevisto = !cerrada && !hayCostesReales && totalEstimado > 0;
  const cabPersonal = usarPrevisto ? estPorCat.personal : cPersonal;
  const cabDespl = usarPrevisto ? estPorCat.desplazamiento : cDespl;
  const cabMaterial = usarPrevisto ? estPorCat.material + estPorCat.otro : cMaterial;
  const cabComision = usarPrevisto ? 0 : cComision;
  const cabColchon = usarPrevisto ? estimadoConColchon - totalEstimado : 0;
  const cabCostes = usarPrevisto ? estimadoConColchon : costes;
  const cabMargen = base - cabCostes;
  const cabMargenPct = base > 0 ? (cabMargen / base) * 100 : 0;

  // Reembolsos a personas aún pendientes (para la validación del cierre).
  // El gasto ya está pagado (lo adelantó la persona); lo pendiente es
  // devolvérselo: eso lo dice liquidado, no el estado.
  const reembolsosPdtes = compras.filter((m) => m.quien_lo_paga && !m.liquidado).length;

  async function toggleCierre() {
    if (!cerrada) {
      const avisos: string[] = [];
      if (pendienteCobro > 0.01) avisos.push(`· Quedan ${eur(pendienteCobro)} pendientes de cobro`);
      if (reembolsosPdtes > 0) avisos.push(`· Hay ${reembolsosPdtes} reembolso(s) pendiente(s) a quien adelantó dinero`);
      const msg =
        `Cerrar el evento congela los costes y da por definitivo el margen:\n\n` +
        `Ingreso (base): ${eur(base)}\nCostes reales: ${eur(costes)}\nMargen final: ${eur(margen)} (${num(margenPct, 0)}%)\n` +
        (avisos.length ? `\n⚠ Antes de cerrar, revisa:\n${avisos.join("\n")}\n` : "") +
        `\n¿Cerrar el evento?`;
      if (!confirm(msg)) return;
    } else if (!confirm("¿Reabrir el evento para seguir apuntando gastos?")) {
      return;
    }
    await cerrarEvento(oportunidadId, !cerrada);
    r();
  }

  const hayPorConfirmar = estimados.filter((e) => e.por_confirmar);
  return (
    <div className="space-y-5">
      {/* Aviso: hay costes con precio pendiente → el presupuesto no es definitivo */}
      {hayPorConfirmar.length > 0 && (
        <div className="rounded-md border-med border-[#e7d3a6] bg-warn-tint px-4 py-3 text-[12.5px] text-[#7a5a1a]">
          ⚠️ <b>Presupuesto no definitivo:</b> hay {hayPorConfirmar.length} coste
          {hayPorConfirmar.length === 1 ? "" : "s"} por confirmar (pendiente de proveedor):{" "}
          {hayPorConfirmar.map((e) => e.concepto || "sin concepto").join(", ")}. Cierra esos precios antes de mandar el presupuesto en firme.
        </div>
      )}
      {/* Cierre del evento */}
      {cerrada && (
        <div className="space-y-1.5 rounded-md border-hair border-ok bg-ok-tint px-4 py-3 text-[13px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-semibold text-ok">
              <Lock size={14} /> Evento cerrado{cerradaFecha ? ` el ${fecha(cerradaFecha)}` : ""} — margen final{" "}
              {eur(margen)} ({num(margenPct, 0)}%)
            </span>
            <button
              onClick={toggleCierre}
              className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary hover:bg-beige-warm"
            >
              <LockOpen size={12} /> Reabrir
            </button>
          </div>
          {/* El margen final se calcula con los COSTES REALES, sin la contingencia
              del presupuesto: si no hubo imprevistos, ese colchón ya está dentro
              del margen (es beneficio). Se hace explícito para tranquilidad. */}
          {contingenciaPct > 0 && desviacion <= 0 && (
            <p className="text-[11.5px] text-ink-secondary">
              ✔ No hubo sobrecostes: la contingencia del {num(contingenciaPct, 0)}% presupuestada
              (~{eur(totalEstimado * (contingenciaPct / 100))}) no se ha gastado y está incluida en este margen como beneficio.
            </p>
          )}
        </div>
      )}

      {/* Resumen / escandallo */}
      <div className="rounded-lg border-hair border-border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Ingreso (base)" v={eur(base)} tone="text-ink" />
          <Kpi label={usarPrevisto ? "Costes (previsto)" : "Costes"} v={eur(cabCostes)} tone="text-error" />
          <Kpi label={usarPrevisto ? "Margen (previsto)" : "Margen"} v={eur(cabMargen)} tone={cabMargen >= 0 ? "text-ok" : "text-error"} />
          <Kpi label={usarPrevisto ? "Margen % (previsto)" : "Margen %"} v={`${num(cabMargenPct, 0)}%`} tone={cabMargen >= 0 ? "text-sage" : "text-error"} />
        </div>
        {usarPrevisto && (
          <p className="mt-2 text-[11px] text-ink-muted">
            Aún no hay costes reales apuntados: se muestra el <b>previsto</b> (con {num(contingenciaPct, 0)}% de contingencia). En cuanto cuadres costes reales, la cabecera pasa a lo real.
          </p>
        )}
        {/* Barra escandallo */}
        <div className="mt-4">
          <div className="flex h-3 w-full overflow-hidden rounded-pill bg-beige-warm">
            {base > 0 && (
              <>
                <span className="bg-clay-300" style={{ width: `${Math.min(100, (cabPersonal / base) * 100)}%` }} title="Personal" />
                <span className="bg-warn" style={{ width: `${Math.min(100, (cabDespl / base) * 100)}%` }} title="Desplazamientos" />
                <span className="bg-error" style={{ width: `${Math.min(100, (cabMaterial / base) * 100)}%` }} title="Material" />
                {cabComision > 0 && <span className="bg-sage" style={{ width: `${Math.min(100, (cabComision / base) * 100)}%` }} title="Comisión" />}
                {cabColchon > 0 && <span className="bg-warn-tint" style={{ width: `${Math.min(100, (cabColchon / base) * 100)}%` }} title="Contingencia" />}
                <span className="bg-ok" style={{ width: `${Math.max(0, (cabMargen / base) * 100)}%` }} title="Margen" />
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            <Leg color="bg-clay-300" t={`Personal ${eur(cabPersonal)}`} />
            <Leg color="bg-warn" t={`Desplazamientos ${eur(cabDespl)}`} />
            <Leg color="bg-error" t={`Material ${eur(cabMaterial)}`} />
            {cabComision > 0 && <Leg color="bg-sage" t={`Comisión ${eur(cabComision)}`} />}
            {cabColchon > 0 && <Leg color="bg-warn-tint" t={`Contingencia ${eur(cabColchon)}`} />}
            <Leg color="bg-ok" t={`Margen ${eur(cabMargen)}`} />
          </div>
          {cComision > 0 && comisionDetalle.length > 0 && (
            <p className="mt-2 text-[11px] text-ink-muted">
              Comisión asignada a{" "}
              {comisionDetalle
                .map((c) => `${c.persona} · ${num(c.porcentaje, 0)}% = ${eur(c.importe)}`)
                .join(" · ")}
              . Se cambia en <b>Editar</b> (campo «Comisión para»).
            </p>
          )}
        </div>
        {/* Pre-evento (estimado) vs post-evento (real), partida a partida */}
        {totalEstimado > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md bg-beige-light p-3">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  <th className="py-1 text-left font-semibold">Pre vs post</th>
                  <th className="py-1 text-right font-semibold">Previsto</th>
                  <th className="py-1 text-right font-semibold">Real</th>
                  <th className="py-1 text-right font-semibold">Desviación</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Personal", estPorCat.personal, cPersonal],
                    ["Desplazamientos", estPorCat.desplazamiento, cDespl],
                    ["Material y otros", estPorCat.material + estPorCat.otro, cMaterial],
                  ] as [string, number, number][]
                ).map(([nombre, est, real]) => (
                  <tr key={nombre}>
                    <td className="border-t border-border/60 py-1.5">{nombre}</td>
                    <td className="border-t border-border/60 py-1.5 text-right tabular">{eur(est)}</td>
                    <td className="border-t border-border/60 py-1.5 text-right tabular">
                      {usarPrevisto ? <span className="text-ink-muted">—</span> : eur(real)}
                    </td>
                    <td className={`border-t border-border/60 py-1.5 text-right tabular font-semibold ${usarPrevisto ? "text-ink-muted" : real - est > 0.01 ? "text-error" : "text-ok"}`}>
                      {usarPrevisto ? "—" : `${real - est > 0 ? "+" : ""}${eur(real - est)}`}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="border-t-2 border-ink/40 py-1.5">Total (+{num(contingenciaPct, 0)}% contingencia)</td>
                  <td className="border-t-2 border-ink/40 py-1.5 text-right tabular">{eur(estimadoConColchon)}</td>
                  <td className="border-t-2 border-ink/40 py-1.5 text-right tabular">
                    {usarPrevisto ? <span className="text-ink-muted">—</span> : eur(costes)}
                  </td>
                  <td className={`border-t-2 border-ink/40 py-1.5 text-right tabular ${usarPrevisto ? "text-ink-muted" : desviacion > 0.01 ? "text-error" : "text-ok"}`}>
                    {usarPrevisto ? "—" : `${desviacion > 0 ? "+" : ""}${eur(desviacion)}`}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink-secondary">Margen (sobre base {eur(base)})</td>
                  <td className="py-1.5 text-right tabular">{eur(base - estimadoConColchon)}</td>
                  <td className={`py-1.5 text-right tabular font-semibold ${usarPrevisto ? "text-ink-muted" : margen >= 0 ? "text-ok" : "text-error"}`}>
                    {usarPrevisto ? "—" : eur(margen)}
                  </td>
                  <td className={`py-1.5 text-right tabular ${usarPrevisto ? "text-ink-muted" : margen - (base - estimadoConColchon) < -0.01 ? "text-error" : "text-ok"}`}>
                    {usarPrevisto ? "—" : `${margen - (base - estimadoConColchon) > 0 ? "+" : ""}${eur(margen - (base - estimadoConColchon))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TODOS los costes en un solo cuadro: la rejilla de entrada arriba y,
          debajo, Previsto y Real visiblemente separados pero juntos, con sus
          totales actualizándose a la vez. */}
      <div className="rounded-lg border-hair border-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-sage">
            <Zap size={15} /> Costes del evento
          </div>
          <div className="text-[12px] text-ink-secondary">
            Previsto <b className="tabular">{eur(estimadoConColchon)}</b>
            <span className="mx-1.5 text-ink-muted">·</span>
            Real <b className="tabular">{usarPrevisto ? <span className="text-ink-muted">—</span> : eur(costes)}</b>
            {totalEstimado > 0 && !usarPrevisto && (
              <>
                <span className="mx-1.5 text-ink-muted">·</span>
                Desviación{" "}
                <b className={`tabular ${desviacion > 0.01 ? "text-error" : "text-ok"}`}>
                  {desviacion > 0 ? "+" : ""}
                  {eur(desviacion)}
                </b>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* 🧮 PREVISTO */}
          <section className="rounded-md border-hair border-sage-tint-deep bg-sage-tint/25 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-sage">
                <Calculator size={14} /> Previsto (plan)
              </span>
              <span className="tabular text-[14px] font-semibold text-sage">
                {totalEstimado > 0 ? eur(estimadoConColchon) : "—"}
              </span>
            </div>
            <EstimacionBlock
              oportunidadId={oportunidadId}
              estimados={estimados}
              totalEstimado={totalEstimado}
              contingenciaPct={contingenciaPct}
              margenObjetivoPct={margenObjetivoPct}
              base={base}
              cerrada={cerrada}
              equipo={equipo}
              onDone={r}
              lugar={lugar}
              kmPrecio={kmPrecio}
              catalogo={catalogo}
              otrasOportunidades={otrasOportunidades}
              proveedores={proveedores}
              subproyectos={subproyectos}
            />
            {/* Comisión prevista dentro del plan: para que quien la cobra (p. ej.
                Cristina) la vea al planificar. No se teclea, sale del % por tipo
                de evento; no suma al total del plan (se cuenta aparte en el margen). */}
            {comisionDetalle.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-sm border-hair border-sage-tint-deep bg-white px-3 py-2 text-[12px]">
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Percent size={12} className="text-sage" /> Comisión prevista ·{" "}
                  {comisionDetalle.map((c) => `${c.persona} ${num(c.porcentaje, 0)}%`).join(" · ")}
                </span>
                <span className="tabular font-semibold text-sage">{eur(cComision)}</span>
              </div>
            )}
          </section>

          {/* ✅ REAL */}
          <section className="rounded-md border-hair border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                ✅ Real (contabilidad)
              </span>
              <span className="tabular text-[14px] font-semibold">{eur(costes)}</span>
            </div>

            <SubGrupo icon={<Users size={13} />} titulo="Personal (horas)" total={eur(cPersonal)}>
              {!cerrada && <PersonalForm oportunidadId={oportunidadId} equipo={equipo} onDone={r} />}
              {partes.length > 0 && (
                <Tabla headers={["Persona", "Tarea", "Horas", "€/h", "Coste", ""]}>
                  {partes.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        {p.equipo?.nombre ??
                          (p.persona_externa ? (
                            <>
                              {p.persona_externa}
                              <span className="ml-1 rounded-sm bg-clay-tint px-1 py-0.5 text-[9.5px] font-semibold text-clay">
                                externo · efectivo
                              </span>
                            </>
                          ) : (
                            "—"
                          ))}
                      </Td>
                      <Td>{p.tarea ?? "—"}</Td>
                      <Td right>{num(p.horas, 1)}</Td>
                      <Td right>{eur(p.precio_hora)}</Td>
                      <Td right bold>{eur(Number(p.horas) * Number(p.precio_hora))}</Td>
                      <Td right>{!cerrada && <Del onClick={async () => { await borrarParteHoras(p.id, oportunidadId); r(); }} />}</Td>
                    </tr>
                  ))}
                </Tabla>
              )}
            </SubGrupo>

            <SubGrupo icon={<Truck size={13} />} titulo="Desplazamientos" total={eur(cDespl)}>
              {!cerrada && (
                <DesplForm
                  oportunidadId={oportunidadId}
                  kmPrecio={kmPrecio}
                  lugar={lugar}
                  pagadores={equipo.map((e) => e.nombre)}
                  onDone={r}
                />
              )}
              {desplazamientos.length > 0 && (
                <Tabla headers={["Trayecto", "Km", "Gasolina", "Peaje", "Parking", "Total", ""]}>
                  {desplazamientos.map((d) => {
                    const tot = Number(d.coste_gasolina ?? 0) + Number(d.peaje ?? 0) + Number(d.parking ?? 0);
                    return (
                      <tr key={d.id}>
                        <Td>{d.trayecto ?? "—"}{d.ida_vuelta ? " (ida y vuelta)" : ""}</Td>
                        <Td right>{d.km ?? "—"}</Td>
                        <Td right>{eur(Number(d.coste_gasolina ?? 0))}</Td>
                        <Td right>{eur(Number(d.peaje ?? 0))}</Td>
                        <Td right>{eur(Number(d.parking ?? 0))}</Td>
                        <Td right bold>{eur(tot)}</Td>
                        <Td right>{!cerrada && <Del onClick={async () => { await borrarDesplazamiento(d.id, d.tesoreria_id, oportunidadId); r(); }} />}</Td>
                      </tr>
                    );
                  })}
                </Tabla>
              )}
            </SubGrupo>

            <SubGrupo icon={<Flower2 size={13} />} titulo="Compras / material" total={eur(cMaterial)}>
              {!cerrada && <CompraForm oportunidadId={oportunidadId} proveedores={proveedores} pagadores={equipo.map((e) => e.nombre)} categoriasGasto={categoriasGasto} onDone={r} />}
              {compras.length > 0 && (
                <Tabla headers={["Concepto", "Fecha", "Pagado por", "Ticket", "Importe", ""]}>
                  {compras.map((m) => (
                    <tr key={m.id}>
                      <Td>
                        {m.concepto}
                        {m.naturaleza === "amigos" && (
                          <span className="ml-1.5 rounded-sm bg-clay/10 px-1 text-[10px] font-semibold text-clay">🤝 amigos</span>
                        )}
                      </Td>
                      <Td>{fecha(m.fecha)}</Td>
                      <Td>
                        {m.quien_lo_paga ?? "TDO"}
                        {m.quien_lo_paga && !m.liquidado && (
                          <span className="ml-1 text-[10.5px] font-semibold text-warn">· reembolso pdte.</span>
                        )}
                      </Td>
                      <Td right><TicketBtn mov={m} oportunidadId={oportunidadId} onDone={r} /></Td>
                      <Td right bold>{eur(Number(m.importe))}</Td>
                      <Td right>{!cerrada && <Del onClick={async () => { await borrarCompra(m.id, oportunidadId); r(); }} />}</Td>
                    </tr>
                  ))}
                </Tabla>
              )}
            </SubGrupo>

            {/* Comisión: es coste real del evento (se paga a quien la lleva) y
                cuenta en el total de arriba; se muestra aquí para que cuadre. */}
            {cComision > 0 && (
              <SubGrupo icon={<Percent size={13} />} titulo="Comisión" total={eur(cComision)}>
                <p className="px-1 py-1.5 text-[11.5px] text-ink-muted">
                  {comisionDetalle.length > 0 ? (
                    <>
                      Comisión de{" "}
                      {comisionDetalle
                        .map((c) => `${c.persona} (${num(c.porcentaje, 0)}%)`)
                        .join(", ")}{" "}
                      sobre la base del presupuesto ({eur(base)}). No se teclea: sale del campo
                      «Comisión para» de la ficha (Editar).
                    </>
                  ) : (
                    <>Comisión sobre la base del presupuesto ({eur(base)}).</>
                  )}
                </p>
              </SubGrupo>
            )}
          </section>
        </div>
      </div>

      {/* Botón de cierre post-evento */}
      {!cerrada && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-dashed border-border-strong bg-white p-4">
          <div className="text-[12.5px] text-ink-secondary">
            Cuando el evento haya pasado y estén todos los gastos metidos (con sus tickets),
            ciérralo: los costes quedan <b>congelados</b> y el margen pasa a ser el definitivo.
          </div>
          <Button size="sm" onClick={toggleCierre}>
            <Lock size={14} /> Cerrar evento
          </Button>
        </div>
      )}
    </div>
  );
}

// Tipos de gasto por defecto (además de los que ya se hayan usado). Se pueden
// añadir nuevos y quedan guardados en cuanto se registra un gasto con ellos.
const GASTOS_BASE = ["Material", "Alquiler de vehículos", "Dietas y comida", "Flores", "Atrezzo", "Otro"];

// Une los tipos base con los ya usados, sin duplicar (ignorando may/mín).
function unirCategorias(extra: string[]): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const c of [...GASTOS_BASE, ...extra]) {
    const t = c.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (vistas.has(k)) continue;
    vistas.add(k);
    salida.push(t);
  }
  return salida;
}


// ---------- Estimación previa ----------
// Escandallo previsto ANTES del presupuesto: costes aproximados + colchón de
// contingencia + margen objetivo → precio mínimo sugerido al cliente. No toca
// la contabilidad; los reales de abajo son los que cuentan.
function EstimacionBlock({
  oportunidadId,
  estimados,
  totalEstimado,
  contingenciaPct,
  margenObjetivoPct,
  base,
  cerrada = false,
  equipo = [],
  onDone,
  lugar = null,
  kmPrecio = 0.26,
  catalogo = [],
  otrasOportunidades = [],
  proveedores = [],
  subproyectos = [],
}: {
  oportunidadId: string;
  estimados: CosteEstimado[];
  totalEstimado: number;
  contingenciaPct: number;
  margenObjetivoPct: number;
  base: number;
  cerrada?: boolean;
  equipo?: Pick<Equipo, "id" | "nombre" | "precio_hora">[];
  onDone: () => void;
  lugar?: LugarInfo;
  kmPrecio?: number;
  catalogo?: CatalogoItem[];
  otrasOportunidades?: OportunidadLite[];
  proveedores?: Pick<Proveedor, "id" | "nombre">[];
  subproyectos?: { nombre: string; color: string }[];
}) {
  const [cont, setCont] = React.useState(contingenciaPct);
  const [margenObj, setMargenObj] = React.useState(margenObjetivoPct);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Subproyectos/elementos del evento: nombres presentes en las líneas (zona)
  // unidos a los guardados (con color/orden). Vista "por subproyecto" = cada uno
  // en su recuadro con su color; "por módulo" = la de siempre.
  const PALETA_SUB = ["#C08A2E", "#5C7A4C", "#4E6E86", "#A65D5D", "#6E5A86", "#3F4A36"];
  const zonasEnLineas = React.useMemo(
    () => Array.from(new Set(estimados.map((e) => (e.zona ?? "").trim()).filter(Boolean))),
    [estimados],
  );
  const subproyectosOrden = React.useMemo(() => {
    const guardados = subproyectos.filter((s) => s.nombre?.trim());
    const nombres = guardados.map((s) => s.nombre);
    const extra = zonasEnLineas.filter((z) => !nombres.includes(z));
    const lista = [...guardados, ...extra.map((nombre, i) => ({ nombre, color: PALETA_SUB[(guardados.length + i) % PALETA_SUB.length] }))];
    return lista;
  }, [subproyectos, zonasEnLineas]);
  const hayLineasSinSub = estimados.some((e) => !(e.zona ?? "").trim());
  const puedeSubproyectos = subproyectosOrden.length > 0 || hayLineasSinSub;
  const [vista, setVista] = React.useState<"subproyecto" | "modulo">(
    subproyectosOrden.length >= 1 ? "subproyecto" : "modulo",
  );

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const conColchon = totalEstimado * (1 + (cont || 0) / 100);
  const margenPrevisto = base - conColchon;
  const margenPrevistoPct = base > 0 ? (margenPrevisto / base) * 100 : 0;
  const paramsCambiados = cont !== contingenciaPct || margenObj !== margenObjetivoPct;

  // Persiste la lista de subproyectos (nombre + color). Se guarda entera para
  // que los colores autoasignados a las zonas también queden fijados.
  function guardarSubs(lista: { nombre: string; color: string }[]) {
    void run(async () => {
      await guardarSubproyectos(oportunidadId, lista.map((s) => ({ nombre: s.nombre, color: s.color })));
    });
  }
  function setColorSub(nombre: string, color: string) {
    guardarSubs(subproyectosOrden.map((s) => (s.nombre === nombre ? { ...s, color } : s)));
  }
  function addSubproyecto() {
    const nombre = window.prompt("Nombre del subproyecto / elemento (p. ej. Carpa Beduina):")?.trim();
    if (!nombre) return;
    if (subproyectosOrden.some((s) => s.nombre.toLowerCase() === nombre.toLowerCase())) {
      window.alert("Ya existe un subproyecto con ese nombre.");
      return;
    }
    const color = PALETA_SUB[subproyectosOrden.length % PALETA_SUB.length];
    guardarSubs([...subproyectosOrden, { nombre, color }]);
  }
  const totalSinSub = estimados
    .filter((e) => !(e.zona ?? "").trim())
    .reduce((s, e) => s + Number(e.importe), 0);

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-ink-muted">
        Organiza aquí los costes del evento por módulos, tipo Excel: pulsa <b>«Añadir línea»</b> en
        cada bloque y rellena las celdas. No entra en contabilidad; cuando sepas el coste real,
        <b> cuadra</b> cada línea con la flecha. Para poner precio con margen y semáforo, usa la{" "}
        <b>Calculadora</b>.
      </p>

      {!cerrada && otrasOportunidades.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-beige-light/70 px-3 py-2 text-[11.5px]">
          <span className="text-ink-secondary">¿Partir de un evento parecido?</span>
          <Select
            value=""
            disabled={busy}
            onChange={(ev) => {
              const oid = ev.target.value;
              if (!oid) return;
              const nombre = otrasOportunidades.find((o) => o.id === oid)?.titulo ?? "ese evento";
              if (
                estimados.length > 0 &&
                !window.confirm(`Se añadirán los costes de «${nombre}» a los que ya hay. ¿Continuar?`)
              )
                return;
              run(async () => {
                const n = await copiarCostesDeOportunidad(oportunidadId, oid);
                if (!n) window.alert("Ese evento no tiene costes previstos que copiar.");
              });
            }}
            className="w-auto max-w-[260px] py-1 text-[11.5px]"
            title="Copia el plan de costes de otra oportunidad, para ajustarlo"
          >
            <option value="">Copiar costes de…</option>
            {otrasOportunidades.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titulo} ({o.numero})
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Toggle de vista: por subproyecto (recuadros con color) o por módulo. */}
      {puedeSubproyectos && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex overflow-hidden rounded-md border-med border-border text-[11.5px] font-semibold">
            <button
              onClick={() => setVista("subproyecto")}
              className={`px-3 py-1.5 ${vista === "subproyecto" ? "bg-sage text-white" : "bg-white text-ink-secondary hover:bg-beige-warm"}`}
            >
              Por subproyecto
            </button>
            <button
              onClick={() => setVista("modulo")}
              className={`px-3 py-1.5 ${vista === "modulo" ? "bg-sage text-white" : "bg-white text-ink-secondary hover:bg-beige-warm"}`}
            >
              Por módulo
            </button>
          </div>
          {vista === "subproyecto" && !cerrada && (
            <button
              onClick={addSubproyecto}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border-med border-dashed border-border-strong px-3 py-1.5 text-[11.5px] font-semibold text-sage hover:bg-sage-tint/30 disabled:opacity-50"
            >
              <Plus size={13} /> Añadir subproyecto
            </button>
          )}
        </div>
      )}

      {vista === "modulo" || !puedeSubproyectos ? (
        <ModulosPrevisto
          oportunidadId={oportunidadId}
          estimados={estimados}
          equipo={equipo}
          cerrada={cerrada}
          busy={busy}
          run={run}
          onDone={onDone}
          lugar={lugar}
          kmPrecio={kmPrecio}
          catalogo={catalogo}
          proveedores={proveedores}
        />
      ) : (
        <div className="space-y-3">
          {subproyectosOrden.map((sp) => {
            const total = estimados
              .filter((e) => (e.zona ?? "").trim() === sp.nombre)
              .reduce((s, e) => s + Number(e.importe), 0);
            return (
              <div
                key={sp.nombre}
                className="overflow-hidden rounded-lg border-hair border-border bg-white"
                style={{ borderLeft: `5px solid ${sp.color}` }}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5" style={{ background: `${sp.color}14` }}>
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sp.color }} />
                    <span className="text-[14.5px] font-bold">{sp.nombre}</span>
                    {!cerrada && (
                      <span className="ml-1 flex items-center gap-1">
                        {PALETA_SUB.map((c) => (
                          <button
                            key={c}
                            onClick={() => setColorSub(sp.nombre, c)}
                            title="Cambiar color del subproyecto"
                            className="h-3.5 w-3.5 rounded-full border border-white/70 ring-1 ring-black/10"
                            style={{ background: c, outline: sp.color === c ? `2px solid ${c}` : "none", outlineOffset: "1px" }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  <span className="tabular text-[14.5px] font-bold">{eur(total)}</span>
                </div>
                <div className="p-3">
                  <ModulosPrevisto
                    oportunidadId={oportunidadId}
                    estimados={estimados}
                    equipo={equipo}
                    cerrada={cerrada}
                    busy={busy}
                    run={run}
                    onDone={onDone}
                    lugar={lugar}
                    kmPrecio={kmPrecio}
                    catalogo={catalogo}
                    proveedores={proveedores}
                    zonaFiltro={sp.nombre}
                    zonaNueva={sp.nombre}
                    ocultarResumenes
                    soloConLineas
                  />
                  {!cerrada && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] text-ink-muted">Añadir a {sp.nombre}:</span>
                      {MODULOS_PREVISTO.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => void run(async () => { await anadirLineaEstimada(oportunidadId, m.categoria, { zona: sp.nombre }); })}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-sm border-med border-border bg-white px-2 py-1 text-[10.5px] font-semibold text-ink-secondary hover:border-sage hover:text-sage disabled:opacity-50"
                        >
                          <m.Icon size={11} /> {m.titulo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {hayLineasSinSub && (
            <div className="overflow-hidden rounded-lg border-hair border-border bg-white" style={{ borderLeft: "5px solid #C9C2B0" }}>
              <div className="flex items-center justify-between gap-3 bg-beige-light px-3 py-2.5">
                <span className="text-[14.5px] font-bold text-ink-secondary">Sin subproyecto</span>
                <span className="tabular text-[14.5px] font-bold">{eur(totalSinSub)}</span>
              </div>
              <div className="p-3">
                <ModulosPrevisto
                  oportunidadId={oportunidadId}
                  estimados={estimados}
                  equipo={equipo}
                  cerrada={cerrada}
                  busy={busy}
                  run={run}
                  onDone={onDone}
                  lugar={lugar}
                  kmPrecio={kmPrecio}
                  catalogo={catalogo}
                  proveedores={proveedores}
                  zonaFiltro={null}
                  zonaNueva={null}
                  ocultarResumenes
                  soloConLineas
                />
                <p className="mt-2 text-[10.5px] text-ink-muted">
                  Estas líneas no tienen subproyecto. Ponles una “Zona” con el nombre del subproyecto para agruparlas.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {!cerrada && estimados.some((e) => !e.cuadrado) && (
        <p className="text-[11px] text-ink-muted">
          <b>Cuadrar:</b> cuando sepas lo que ha costado de verdad, valida cada línea con la flecha
          (deja el importe si fue tal cual, o cámbialo). Se crea el coste real en su sección y la
          línea queda marcada ✓ — así ves qué queda por confirmar.
        </p>
      )}

      {/* Parámetros + precio sugerido */}
      <div className="flex flex-col gap-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-2">
          <div title="Colchón para imprevistos. Sirve también para cubrir la inflación de materiales entre el presupuesto y el evento (flores, fungibles…): si presupuestas con meses de antelación, súbela.">
            <Field label="Contingencia % ⓘ">
              <Input type="number" step="1" min="0" value={cont || ""} onChange={(e) => setCont(Number(e.target.value))} className="w-[80px] text-right tabular" />
            </Field>
          </div>
          <Field label="Margen objetivo %">
            <Input type="number" step="1" min="0" value={margenObj || ""} onChange={(e) => setMargenObj(Number(e.target.value))} className="w-[80px] text-right tabular" />
          </Field>
          {paramsCambiados && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await guardarParamsCostes(oportunidadId, cont || 0, margenObj || 0);
                  onDone();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Guardar
            </Button>
          )}
        </div>
        <div className="text-[12.5px]">
          {totalEstimado > 0 && (
            <div>
              Costes previstos + {num(cont || 0, 0)}%: <b className="tabular">{eur(conColchon)}</b>
            </div>
          )}
          {base > 0 && (
            <div className={margenPrevistoPct >= (margenObj || 0) ? "text-ok" : "text-error"}>
              Con el presu actual ({eur(base)}): margen previsto {eur(margenPrevisto)} ({num(margenPrevistoPct, 0)}%)
              {margenPrevistoPct >= (margenObj || 0) ? " ✓" : " — por debajo del objetivo"}
            </div>
          )}
          {/* El precio se pone en la Calculadora (única fuente de precio). */}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href={`/oportunidades/${oportunidadId}?tab=calculadora`}
              className="inline-flex items-center gap-1 font-semibold text-sage hover:underline"
            >
              <Calculator size={13} /> ¿Poner precio? → Calculadora
            </Link>
            <Link
              href={`/oportunidades/${oportunidadId}/escandallo`}
              className="inline-flex items-center gap-1 font-semibold text-ink-secondary hover:text-sage hover:underline"
              title="Desglose interno de costes para compartir con los socios"
            >
              <FileText size={13} /> Escandallo PDF
            </Link>
          </div>
        </div>
      </div>
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}

// ---------- Módulos del plan previsto (edición estilo Excel) ----------
// Cada módulo agrupa un tipo de coste, con su rejilla editable celda a celda,
// subtotal y "añadir línea". Mapea 1:1 con lo que consume la Calculadora.
const MODULOS_PREVISTO = [
  { key: "manoObra", categoria: "personal", titulo: "Mano de obra", Icon: Users, persona: true, cantLabel: "Horas", precioLabel: "€/h", conceptoLabel: "Tarea / fase",
    sugerencias: ["Comercial", "Preparación", "Montaje", "Durante el evento", "Recogida", "Desmontaje", "Limpieza", "Post-evento"] },
  { key: "transporte", categoria: "desplazamiento", titulo: "Transporte", Icon: Truck, persona: false, cantLabel: "Cant.", precioLabel: "€/ud", conceptoLabel: "Concepto",
    sugerencias: ["Gasolina (km)", "Taxi", "Tren", "Bus", "Furgoneta (alquiler)", "Peaje", "Parking", "Kilometraje"] },
  { key: "dietas", categoria: "Dietas y comida", titulo: "Dietas y comida", Icon: Utensils, persona: false, cantLabel: "Nº pers.", precioLabel: "€/pers.", conceptoLabel: "Concepto",
    sugerencias: ["Comida del equipo", "Dietas de desplazamiento", "Café / desayuno"] },
  { key: "materiales", categoria: "Material", titulo: "Materiales", Icon: Flower2, persona: false, cantLabel: "Cant.", precioLabel: "€/ud", conceptoLabel: "Concepto",
    sugerencias: ["Flores y centros", "Mantelería", "Atrezzo", "Fungibles", "Impresión / papelería", "Velas", "Mobiliario decorativo"] },
  { key: "alquiler", categoria: "Alquiler externo", titulo: "Alquiler externo", Icon: Package, persona: false, cantLabel: "Cant./días", precioLabel: "€/ud", conceptoLabel: "Concepto",
    sugerencias: ["Furgoneta", "Carpa", "Mobiliario", "Vajilla", "Subcontrata"] },
  { key: "logistica", categoria: "Almacén y logística", titulo: "Almacén y logística", Icon: Warehouse, persona: false, cantLabel: "Días/ud", precioLabel: "€/ud", conceptoLabel: "Concepto",
    sugerencias: ["Trastero / almacén (Bluespace)", "Guardamuebles", "Punto limpio / residuos", "Custodia de material"] },
] as const;

type ModuloDef = (typeof MODULOS_PREVISTO)[number];

// A qué módulo pertenece una línea, a partir de su categoría (insensible a
// mayúsculas). 'personal'/'desplazamiento' son claves; el resto por etiqueta.
function moduloDeEstimado(categoria: string | null | undefined): string {
  const c = (categoria ?? "material").toLowerCase();
  if (c === "personal") return "manoObra";
  if (c === "desplazamiento") return "transporte";
  if (c.includes("dieta") || c.includes("comida")) return "dietas";
  if (c.includes("almac") || c.includes("logíst") || c.includes("logist") || c.includes("trastero")) return "logistica";
  if (c.includes("alquiler")) return "alquiler";
  return "materiales";
}

function ModulosPrevisto({
  oportunidadId,
  estimados,
  equipo,
  cerrada,
  busy,
  run,
  onDone,
  lugar,
  kmPrecio,
  catalogo,
  proveedores,
  zonaFiltro,
  zonaNueva = null,
  ocultarResumenes = false,
  soloConLineas = false,
}: {
  oportunidadId: string;
  estimados: CosteEstimado[];
  equipo: Pick<Equipo, "id" | "nombre" | "precio_hora">[];
  cerrada: boolean;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  onDone: () => void;
  lugar: LugarInfo;
  kmPrecio: number;
  catalogo: CatalogoItem[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  // Vista "por subproyecto": filtra a una zona (string), a las líneas sin zona
  // (null) o no filtra (undefined). zonaNueva = zona que se asigna al añadir.
  zonaFiltro?: string | null;
  zonaNueva?: string | null;
  ocultarResumenes?: boolean;
  soloConLineas?: boolean;
}) {
  // Líneas visibles según el filtro de subproyecto (zona).
  const visibles =
    zonaFiltro === undefined
      ? estimados
      : zonaFiltro === null
        ? estimados.filter((e) => !(e.zona ?? "").trim())
        : estimados.filter((e) => (e.zona ?? "").trim() === zonaFiltro);
  return (
    <div className="space-y-3">
      {/* Sugerencias de concepto por módulo (se elige una o se escribe otra). */}
      {MODULOS_PREVISTO.map((m) => (
        <datalist key={`sug-${m.key}`} id={`sug-${m.key}`}>
          {m.sugerencias.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ))}
      {/* Sugerencias de zona: las ya usadas + espacios habituales. */}
      <datalist id="zonas-evento">
        {Array.from(
          new Set([
            ...estimados.map((e) => e.zona).filter(Boolean) as string[],
            "Entrada", "Lobby", "Planta 1", "Planta 2", "Planta 3", "Exterior", "General",
          ]),
        ).map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
      {/* Resumen por zona: cuánto cuesta cada espacio (solo si se usan zonas). */}
      {(() => {
        if (ocultarResumenes) return null;
        const porZona = new Map<string, number>();
        for (const e of estimados) {
          if (!e.zona) continue;
          porZona.set(e.zona, (porZona.get(e.zona) ?? 0) + Number(e.importe));
        }
        if (porZona.size === 0) return null;
        return (
          <div className="rounded-md border-hair border-sage-tint-deep bg-sage-tint/20 p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sage">
              Coste por zona / subproyecto
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
              {[...porZona.entries()].sort((a, b) => b[1] - a[1]).map(([z, t]) => (
                <span key={z}>
                  <b className="font-semibold text-ink-secondary">{z}:</b>{" "}
                  <span className="tabular">{eur(t)}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}
      {/* Inversión en stock (Opción C): material que se queda vs coste operativo. */}
      {(() => {
        if (ocultarResumenes) return null;
        const seQuedan = estimados.filter((e) => e.se_queda);
        if (seQuedan.length === 0) return null;
        const totalPrevisto = estimados.reduce((s, e) => s + Number(e.importe), 0);
        const invLinea = (e: CosteEstimado) => {
          const imp = Number(e.importe);
          const usos = Number(e.usos_previstos ?? 0);
          return usos > 1 ? imp * (1 - 1 / usos) : imp; // sin usos: todo es inversión
        };
        const inversion = seQuedan.reduce((s, e) => s + invLinea(e), 0);
        const costeOperativo = totalPrevisto - inversion;
        return (
          <div className="rounded-md border-med border-sage bg-sage-tint/25 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sage">
              <Recycle size={13} /> Inversión en stock (material que se queda)
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]">
              <span>Coste previsto total: <b className="tabular">{eur(totalPrevisto)}</b></span>
              <span className="text-sage">Inversión en stock (reutilizable): <b className="tabular">{eur(inversion)}</b></span>
              <span>Coste <b>operativo</b> del evento: <b className="tabular">{eur(costeOperativo)}</b></span>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Ese material se reutiliza en otros eventos: el coste real de operar este evento es {eur(inversion)} más bajo
              que el contable. Marca los usos para amortizar, o da de alta la pieza en Inventario para reservarla luego.
            </p>
            <div className="mt-2 space-y-1.5">
              {seQuedan.map((e) => (
                <LineaSeQueda key={e.id} e={e} oportunidadId={oportunidadId} cerrada={cerrada} busy={busy} run={run} onDone={onDone} />
              ))}
            </div>
          </div>
        );
      })()}
      {MODULOS_PREVISTO.map((m) => {
        const filas = visibles.filter((e) => moduloDeEstimado(e.categoria) === m.key);
        if (soloConLineas && filas.length === 0) return null;
        const subtotal = filas.reduce((s, e) => s + Number(e.importe), 0);
        // Horas totales del evento (solo mano de obra) para ver de un vistazo si
        // un evento come demasiada mano de obra.
        const horas = m.persona ? filas.reduce((s, e) => s + Number(e.cantidad ?? 0), 0) : 0;
        // Reparto de horas por persona (mano de obra).
        const horasPersona = new Map<string, number>();
        if (m.persona) {
          for (const e of filas) {
            const nombre = equipo.find((p) => p.id === e.equipo_id)?.nombre ?? e.persona_externa ?? "Sin asignar";
            horasPersona.set(nombre, (horasPersona.get(nombre) ?? 0) + Number(e.cantidad ?? 0));
          }
        }
        // Subproyectos: si el módulo tiene líneas en 2+ zonas con nombre, se
        // agrupan por zona (estilo Excel: cada subproyecto separado con su
        // subtotal). Una sola zona (o ninguna) → lista plana como siempre.
        const zonaDe = (e: CosteEstimado) => (e.zona ?? "").trim();
        const zonasModulo: string[] = [];
        for (const e of filas) {
          const z = zonaDe(e);
          if (!zonasModulo.includes(z)) zonasModulo.push(z);
        }
        const agrupaZona = zonasModulo.filter(Boolean).length >= 2;
        // Columnas de la tabla (para el colSpan de la cabecera de subproyecto):
        // concepto+zona+cant+precio+total+hueco (6) + persona|paga (1) +
        // proveedor (materiales/alquiler) + cuadrar (si no está cerrada).
        const nColsTabla = 6 + 1 + (m.key === "materiales" || m.key === "alquiler" ? 1 : 0) + (!cerrada ? 1 : 0);
        return (
          <div key={m.key} className="rounded-md border-hair border-border bg-beige-light/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sage">
                <m.Icon size={13} /> {m.titulo}
              </span>
              <span className="tabular text-[12.5px] font-semibold">
                {m.persona && horas > 0 && <span className="mr-2 font-normal text-ink-muted">{num(horas, 1)} h</span>}
                {eur(subtotal)}
              </span>
            </div>
            {filas.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                      {m.persona && <th className="border-b border-border py-1 text-left font-semibold">Persona</th>}
                      <th className="border-b border-border py-1 text-left font-semibold">{m.conceptoLabel}</th>
                      <th className="border-b border-border py-1 text-left font-semibold">Zona</th>
                      <th className="border-b border-border py-1 text-right font-semibold">{m.cantLabel}</th>
                      <th className="border-b border-border py-1 text-right font-semibold">{m.precioLabel}</th>
                      {!m.persona && <th className="border-b border-border py-1 text-left font-semibold">Paga</th>}
                      {(m.key === "materiales" || m.key === "alquiler") && (
                        <th className="border-b border-border py-1 text-left font-semibold">Proveedor</th>
                      )}
                      <th className="border-b border-border py-1 text-right font-semibold">Total</th>
                      {!cerrada && <th className="border-b border-border py-1 text-right font-semibold">Cuadrar → real</th>}
                      <th className="border-b border-border py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agrupaZona
                      ? zonasModulo.map((z) => {
                          const grupo = filas.filter((e) => zonaDe(e) === z);
                          if (grupo.length === 0) return null;
                          const subt = grupo.reduce((s, e) => s + Number(e.importe), 0);
                          return (
                            <React.Fragment key={z || "sin-zona"}>
                              <tr>
                                <td colSpan={nColsTabla} className="bg-sage-tint/25 px-1 pb-1 pt-2.5">
                                  <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage">
                                    <span>{z || "Sin subproyecto"}</span>
                                    <span className="tabular">{eur(subt)}</span>
                                  </div>
                                </td>
                              </tr>
                              {grupo.map((e) => (
                                <FilaEstimado
                                  key={e.id}
                                  e={e}
                                  modulo={m}
                                  oportunidadId={oportunidadId}
                                  equipo={equipo}
                                  proveedores={proveedores}
                                  cerrada={cerrada}
                                  busy={busy}
                                  run={run}
                                  onDone={onDone}
                                />
                              ))}
                            </React.Fragment>
                          );
                        })
                      : filas.map((e) => (
                          <FilaEstimado
                            key={e.id}
                            e={e}
                            modulo={m}
                            oportunidadId={oportunidadId}
                            equipo={equipo}
                            proveedores={proveedores}
                            cerrada={cerrada}
                            busy={busy}
                            run={run}
                            onDone={onDone}
                          />
                        ))}
                  </tbody>
                </table>
              </div>
            )}
            {m.persona && horasPersona.size > 1 && (
              <div className="mt-1.5 text-[10.5px] text-ink-muted">
                Reparto:{" "}
                {[...horasPersona.entries()].map(([n, h], i) => (
                  <span key={n}>
                    {i > 0 ? " · " : ""}
                    <b className="font-semibold text-ink-secondary">{n}</b> {num(h, 1)} h
                  </span>
                ))}
              </div>
            )}
            {!cerrada && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    await anadirLineaEstimada(oportunidadId, m.categoria, { zona: zonaNueva });
                    onDone();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage hover:underline"
                  title={`Añadir una línea a ${m.titulo}`}
                >
                  <Plus size={12} /> Añadir línea
                </button>
                {/* Transporte: atajo de gasolina por km del lugar (ida y vuelta). */}
                {m.key === "transporte" && lugar?.distancia_km ? (
                  <button
                    onClick={async () => {
                      await anadirLineaEstimada(oportunidadId, m.categoria, {
                        concepto: lugar.nombre ? `Gasolina · ${lugar.nombre} (ida y vuelta)` : "Gasolina (ida y vuelta)",
                        cantidad: Number(lugar.distancia_km) * 2,
                        precioUnitario: kmPrecio,
                        zona: zonaNueva,
                      });
                      onDone();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-clay-600 hover:underline"
                    title={`Gasolina por kilometraje del lugar a ${kmPrecio} €/km`}
                  >
                    <Plus size={12} /> Km del lugar ({Number(lugar.distancia_km) * 2} km)
                  </button>
                ) : null}
                {/* Materiales: traer un artículo del catálogo con su coste. */}
                {m.key === "materiales" && catalogo.length > 0 && (
                  <Select
                    value=""
                    onChange={async (ev) => {
                      const art = catalogo.find((c) => c.id === ev.target.value);
                      if (!art) return;
                      await anadirLineaEstimada(oportunidadId, "Material", {
                        concepto: art.articulo,
                        cantidad: 1,
                        precioUnitario: art.coste,
                        zona: zonaNueva,
                      });
                      onDone();
                    }}
                    className="w-auto max-w-[240px] py-1 text-[11px]"
                    title="Añadir un artículo del inventario con su coste"
                  >
                    <option value="">＋ Del catálogo…</option>
                    {catalogo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.articulo}
                        {c.coste > 0 ? ` · ${eur(c.coste)}` : ""}
                      </option>
                    ))}
                  </Select>
                )}
                {filas.length === 0 && (
                  <span className="text-[10.5px] text-ink-muted">— sin líneas —</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Una línea de "material que se queda": permite fijar los usos previstos
// (amortización) y darla de alta en Inventario para reutilizarla.
function LineaSeQueda({
  e,
  oportunidadId,
  cerrada,
  busy,
  run,
  onDone,
}: {
  e: CosteEstimado;
  oportunidadId: string;
  cerrada: boolean;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  onDone: () => void;
}) {
  const [usos, setUsos] = React.useState(e.usos_previstos != null ? String(e.usos_previstos) : "");
  const enInventario = Boolean(e.inventario_id);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-white/70 px-2.5 py-1.5 text-[12.5px]">
      <span className="min-w-[130px] flex-1 font-medium">{e.concepto || "Sin concepto"}</span>
      <span className="tabular text-ink-secondary">{eur(Number(e.importe))}</span>
      {!cerrada && (
        <label className="flex items-center gap-1 text-[11px] text-ink-muted" title="Nº de usos previstos para amortizar (vacío = no amortiza, cuenta como inversión)">
          usos
          <Input
            type="number"
            min={1}
            step={1}
            value={usos}
            onChange={(ev) => setUsos(ev.target.value)}
            onBlur={() => Number(usos || 0) !== Number(e.usos_previstos ?? 0) && run(async () => { await updateCosteEstimado({ id: e.id, oportunidadId, usosPrevistos: usos ? Number(usos) : null }); onDone(); })}
            className="w-[64px] py-1 text-right text-[12px] tabular"
            placeholder="—"
          />
        </label>
      )}
      {enInventario ? (
        <span className="inline-flex items-center gap-1 rounded-pill bg-ok-tint px-2 py-0.5 text-[10.5px] font-semibold text-ok">
          ✓ en inventario
        </span>
      ) : (
        !cerrada && (
          <button
            disabled={busy}
            onClick={() => run(async () => { await altaEnInventario(e.id, oportunidadId); onDone(); })}
            className="inline-flex items-center gap-1 rounded-sm border-med border-sage px-2 py-0.5 text-[10.5px] font-semibold text-sage hover:bg-sage-tint"
            title="Dar de alta esta pieza en Inventario para poder reservarla en otros eventos"
          >
            <Warehouse size={11} /> Alta en inventario
          </button>
        )
      )}
    </div>
  );
}

function FilaEstimado({
  e,
  modulo,
  oportunidadId,
  equipo,
  proveedores,
  cerrada,
  busy,
  run,
  onDone,
}: {
  e: CosteEstimado;
  modulo: ModuloDef;
  oportunidadId: string;
  equipo: Pick<Equipo, "id" | "nombre" | "precio_hora">[];
  proveedores: Pick<Proveedor, "id" | "nombre">[];
  cerrada: boolean;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  onDone: () => void;
}) {
  // Bloqueado si la línea ya está cuadrada (tiene coste real) o si el evento
  // está cerrado: en ambos casos el plan previsto es historia, no se edita.
  const bloqueado = !!e.cuadrado || cerrada;
  const [concepto, setConcepto] = React.useState(e.concepto ?? "");
  const [cantidad, setCantidad] = React.useState(String(Number(e.cantidad ?? 1)));
  const [precio, setPrecio] = React.useState(String(Number(e.precio_unitario ?? 0)));
  const [pagador, setPagador] = React.useState(e.pagador ?? "");
  const [proveedorSel, setProveedorSel] = React.useState(e.proveedor_id ?? "");
  const [zona, setZona] = React.useState(e.zona ?? "");
  const [recargo, setRecargo] = React.useState(Number(e.recargo_pct ?? 0));
  // Importe para cuadrar: null hasta que se teclee → muestra el total vivo
  // (así no se queda obsoleto si se edita la cantidad/precio antes de cuadrar).
  const [realEdit, setRealEdit] = React.useState<string | null>(null);
  // El total lleva el recargo (nocturnidad): cantidad × precio × (1+recargo%).
  const total = (Number(cantidad) || 0) * (Number(precio) || 0) * (1 + recargo / 100);
  const RECARGO_NOCTURNO = 25; // % estándar de nocturnidad/festivo
  const real = realEdit ?? String(Math.round(total * 100) / 100);
  const tieneProveedor = modulo.key === "materiales" || modulo.key === "alquiler";

  async function guardar(patch: {
    concepto?: string;
    cantidad?: number;
    precioUnitario?: number;
    equipoId?: string | null;
    personaExterna?: string | null;
    pagador?: string | null;
    proveedorId?: string | null;
    nota?: string | null;
    zona?: string | null;
    porConfirmar?: boolean;
    recargoPct?: number | null;
    seQueda?: boolean;
    usosPrevistos?: number | null;
  }) {
    if (bloqueado) return;
    try {
      await updateCosteEstimado({ id: e.id, oportunidadId, ...patch });
      onDone();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // La mano de obra puede ser: alguien del equipo, un proveedor externo (de la
  // lista) o un externo/amigo suelto (texto libre). El proveedor se guarda en
  // proveedor_id + su nombre en persona_externa (para que se vea igual).
  const personaVal = e.equipo_id
    ? e.equipo_id
    : e.proveedor_id
      ? `prov:${e.proveedor_id}`
      : e.persona_externa
        ? "__cur_ext__"
        : "";
  // Línea a medias: tiene concepto pero importe 0 (falta precio/horas), o —en
  // módulos que no son mano de obra— importe sin concepto (¿qué es?).
  const incompleta =
    !bloqueado &&
    ((concepto.trim() !== "" && total <= 0) ||
      (!modulo.persona && concepto.trim() === "" && total > 0) ||
      // Mano de obra: persona elegida pero sin importe (falta horas o €/h).
      (modulo.persona && personaVal !== "" && total <= 0));

  return (
    <tr
      className={incompleta ? "bg-warn-tint/40" : e.por_confirmar ? "bg-[#fff7e6]" : ""}
      title={incompleta ? "Línea a medias: falta el concepto o el importe" : e.por_confirmar ? "Precio por confirmar (pendiente de proveedor)" : undefined}
    >
      {modulo.persona && (
        <td className="border-b border-[#f0eae1] py-1 pr-1">
          <Select
            value={personaVal}
            disabled={bloqueado}
            onChange={(ev) => {
              const v = ev.target.value;
              if (v === "__cur_ext__") return;
              if (v === "__ext__") {
                const nombre = (window.prompt("Nombre del externo / amigo") || "").trim();
                if (nombre) guardar({ equipoId: null, personaExterna: nombre, proveedorId: null });
              } else if (v.startsWith("prov:")) {
                // Mano de obra subcontratada a un proveedor de la lista: se guarda
                // el proveedor y su nombre (para que se lea igual que una persona).
                const prov = proveedores.find((p) => p.id === v.slice(5));
                if (prov) guardar({ equipoId: null, personaExterna: prov.nombre, proveedorId: prov.id });
              } else {
                // Al elegir una persona del equipo, se autorrellena su €/h.
                const p = equipo.find((x) => x.id === v);
                const patch: { equipoId: string | null; personaExterna: null; proveedorId: null; precioUnitario?: number } = {
                  equipoId: v || null,
                  personaExterna: null,
                  proveedorId: null,
                };
                if (p?.precio_hora != null) {
                  patch.precioUnitario = Number(p.precio_hora);
                  setPrecio(String(Number(p.precio_hora)));
                }
                guardar(patch);
              }
            }}
            className="min-w-[96px] py-1 text-[12px]"
          >
            <option value="">—</option>
            {equipo.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
            {proveedores.length > 0 && (
              <optgroup label="Proveedores (mano de obra externa)">
                {proveedores.map((p) => (
                  <option key={p.id} value={`prov:${p.id}`}>{p.nombre}</option>
                ))}
              </optgroup>
            )}
            {e.persona_externa && !e.proveedor_id && <option value="__cur_ext__">{e.persona_externa} (ext.)</option>}
            <option value="__ext__">➕ Externo suelto…</option>
          </Select>
        </td>
      )}
      <td className="border-b border-[#f0eae1] py-1 pr-1">
        {/* Ancho mínimo legible: sin él, en pantallas medianas la celda se
            comprimía hasta dejar el concepto en 2 letras (el módulo ya tiene
            scroll horizontal propio para absorberlo). */}
        <Input
          value={concepto}
          disabled={bloqueado}
          list={`sug-${modulo.key}`}
          onChange={(ev) => setConcepto(ev.target.value)}
          onBlur={() => concepto !== (e.concepto ?? "") && guardar({ concepto })}
          placeholder={modulo.conceptoLabel}
          className="min-w-[150px] py-1 text-[12.5px]"
        />
      </td>
      <td className="border-b border-[#f0eae1] py-1 pl-1">
        <Input
          value={zona}
          disabled={bloqueado}
          list="zonas-evento"
          onChange={(ev) => setZona(ev.target.value)}
          onBlur={() => zona !== (e.zona ?? "") && guardar({ zona })}
          placeholder="—"
          title="Zona/espacio del evento (Entrada, Lobby, Planta 1…)"
          className="min-w-[100px] py-1 text-[12px]"
        />
      </td>
      <td className="border-b border-[#f0eae1] py-1">
        <Input
          type="number"
          step="0.5"
          value={cantidad}
          disabled={bloqueado}
          onChange={(ev) => setCantidad(ev.target.value)}
          // Manda cantidad y precio juntos: el importe se calcula con ambos
          // valores actuales, no leyendo el otro (posiblemente obsoleto) de la BD.
          onBlur={() => Number(cantidad) !== Number(e.cantidad ?? 1) && guardar({ cantidad: Number(cantidad) || 0, precioUnitario: Number(precio) || 0 })}
          className="w-[70px] py-1 text-right text-[12.5px] tabular"
        />
      </td>
      <td className="border-b border-[#f0eae1] py-1 pl-1">
        <Input
          type="number"
          step="0.01"
          value={precio}
          disabled={bloqueado}
          onChange={(ev) => setPrecio(ev.target.value)}
          onBlur={() => Number(precio) !== Number(e.precio_unitario ?? 0) && guardar({ cantidad: Number(cantidad) || 0, precioUnitario: Number(precio) || 0 })}
          className="w-[75px] py-1 text-right text-[12.5px] tabular"
        />
      </td>
      {!modulo.persona && (
        <td className="border-b border-[#f0eae1] py-1 pl-1">
          <Select
            value={pagador}
            disabled={bloqueado}
            onChange={(ev) => {
              setPagador(ev.target.value);
              guardar({ pagador: ev.target.value || null });
            }}
            title="¿Quién adelanta este gasto? Si no es TDO, queda como reembolso al cuadrar."
            className={`py-1 text-[11px] ${pagador ? "font-semibold text-clay" : ""}`}
          >
            <option value="">TDO</option>
            {equipo.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </Select>
        </td>
      )}
      {tieneProveedor && (
        <td className="border-b border-[#f0eae1] py-1 pl-1">
          <Select
            value={proveedorSel}
            disabled={bloqueado}
            onChange={(ev) => {
              setProveedorSel(ev.target.value);
              guardar({ proveedorId: ev.target.value || null });
            }}
            title="¿De qué proveedor es? (para saber a quién pagar)"
            className="py-1 text-[11px]"
          >
            <option value="">—</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>
        </td>
      )}
      <td className="border-b border-[#f0eae1] py-1 text-right tabular font-semibold">
        {recargo > 0 && <span title={`Recargo nocturnidad +${recargo}%`} className="mr-1 text-sage">🌙</span>}
        {e.se_queda && <span title="Material que se queda (inversión en stock)" className="mr-1 text-sage">♻</span>}
        {e.por_confirmar && <span title="Precio por confirmar" className="mr-1 text-[#7a5a1a]">?</span>}
        {eur(total)}
      </td>
      {!cerrada && (
        <td className="border-b border-[#f0eae1] py-1 text-right">
          {bloqueado ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-ok-tint px-2 py-0.5 text-[10px] font-semibold text-ok">
              ✓ {eur(Number(e.importe_real ?? e.importe))}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Input
                type="number"
                step="0.01"
                value={real}
                onChange={(ev) => setRealEdit(ev.target.value)}
                title="Importe real para cuadrar"
                className="w-[72px] py-1 text-right text-[11.5px] tabular"
              />
              <button
                disabled={busy}
                onClick={() => run(async () => { await cuadrarEstimado({ estimadoId: e.id, oportunidadId, importeReal: Number(real) }); })}
                title="Pasar a costes reales con este importe"
                className="rounded-sm border-med border-sage bg-sage px-1.5 py-1 text-[10px] font-semibold text-cream hover:opacity-90"
              >
                →
              </button>
            </span>
          )}
        </td>
      )}
      <td className="border-b border-[#f0eae1] py-1 text-center">
        {!cerrada && !bloqueado && (
          <span className="inline-flex items-center">
            {modulo.key === "materiales" && (
              <button
                title={e.se_queda ? "Material que se queda (reutilizable). Pulsa para quitar." : "Marcar como material que se queda en inventario (reutilizable)"}
                onClick={() => guardar({ seQueda: !e.se_queda })}
                className={`rounded-sm p-1 ${e.se_queda ? "bg-sage-tint text-sage" : "text-ink-muted"} hover:bg-beige-warm hover:text-sage`}
              >
                <Recycle size={13} />
              </button>
            )}
            {modulo.persona && (
              <button
                title={recargo > 0 ? `Nocturnidad +${recargo}% (pulsa para quitar)` : `Aplicar recargo de nocturnidad (+${RECARGO_NOCTURNO}%)`}
                onClick={() => {
                  const nuevo = recargo > 0 ? 0 : RECARGO_NOCTURNO;
                  setRecargo(nuevo);
                  guardar({ recargoPct: nuevo || null });
                }}
                className={`rounded-sm p-1 ${recargo > 0 ? "bg-sage-tint text-sage" : "text-ink-muted"} hover:bg-beige-warm hover:text-sage`}
              >
                <Moon size={13} />
              </button>
            )}
            <button
              title={e.por_confirmar ? "Precio por confirmar (marcado). Pulsa para quitar." : "Marcar precio 'por confirmar' (pendiente de proveedor)"}
              onClick={() => guardar({ porConfirmar: !e.por_confirmar })}
              className={`rounded-sm p-1 ${e.por_confirmar ? "bg-warn-tint text-[#7a5a1a]" : "text-ink-muted"} hover:bg-beige-warm hover:text-[#7a5a1a]`}
            >
              <HelpCircle size={13} />
            </button>
            <button
              title={e.nota ? `Nota: ${e.nota}` : "Añadir nota"}
              onClick={() => {
                const v = (window.prompt("Nota de la línea (matiz, recordatorio…):", e.nota ?? "") ?? "").trim();
                guardar({ nota: v || null });
              }}
              className={`rounded-sm p-1 ${e.nota ? "text-clay" : "text-ink-muted"} hover:bg-beige-warm hover:text-clay`}
            >
              <StickyNote size={13} />
            </button>
            <button
              title="Duplicar línea"
              onClick={async () => { await duplicarCosteEstimado(e.id, oportunidadId); onDone(); }}
              className="rounded-sm p-1 text-ink-muted hover:bg-beige-warm hover:text-sage"
            >
              <Copy size={13} />
            </button>
            <Del onClick={async () => { await borrarCosteEstimado(e.id, oportunidadId); onDone(); }} />
          </span>
        )}
      </td>
    </tr>
  );
}

// Adjuntar/ver la foto del ticket de un gasto.
function TicketBtn({ mov, oportunidadId, onDone }: { mov: Tesoreria; oportunidadId: string; onDone: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1">
      {mov.ticket_url && (
        <a
          href={mov.ticket_url}
          target="_blank"
          rel="noreferrer"
          title="Ver ticket"
          className="rounded-sm p-1 text-sage hover:bg-beige-warm"
        >
          <Paperclip size={13} />
        </a>
      )}
      <button
        title={mov.ticket_url ? "Sustituir ticket" : "Adjuntar foto del ticket"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={`rounded-sm px-1.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.04em] ${
          mov.ticket_url ? "text-ink-muted hover:bg-beige-warm" : "border-med border-border-strong text-ink-secondary hover:bg-beige-warm"
        }`}
      >
        {busy ? "Subiendo…" : mov.ticket_url ? "↺" : "Ticket"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            const fd = new FormData();
            fd.set("tesoreriaId", mov.id);
            fd.set("oportunidadId", oportunidadId);
            fd.set("ticket", f);
            await adjuntarTicket(fd);
            onDone();
          } catch (err) {
            setError((err as Error).message);
            alert((err as Error).message);
          } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      />
      {error && <span className="sr-only">{error}</span>}
    </span>
  );
}

// ---------- Subcomponentes ----------
function Kpi({ label, v, tone }: { label: string; v: string; tone: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[22px] tabular ${tone}`}>{v}</div>
    </div>
  );
}
function Leg({ color, t }: { color: string; t: string }) {
  return <span className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${color}`} />{t}</span>;
}
// Subgrupo dentro del panel Real: cabecera fina con icono y subtotal.
function SubGrupo({ icon, titulo, total, children }: { icon: React.ReactNode; titulo: string; total: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          {icon} {titulo}
        </span>
        <span className="tabular text-[12.5px] font-semibold">{total}</span>
      </div>
      {children}
    </div>
  );
}

function Bloque({ icon, titulo, total, children }: { icon: React.ReactNode; titulo: string; total: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-hair border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-sage">
          {icon} {titulo}
        </div>
        <span className="tabular text-[13px] font-semibold">{total}</span>
      </div>
      {children}
    </div>
  );
}
function Tabla({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
            {headers.map((h, i) => (
              <th key={i} className={`border-b border-border py-2 font-semibold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Td({ children, right, bold }: { children: React.ReactNode; right?: boolean; bold?: boolean }) {
  return <td className={`border-b border-[#f0eae1] py-2 ${right ? "text-right tabular" : ""} ${bold ? "font-semibold" : ""}`}>{children}</td>;
}
function Del({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error">
      <Trash2 size={14} />
    </button>
  );
}

function PersonalForm({ oportunidadId, equipo, onDone }: { oportunidadId: string; equipo: Pick<Equipo, "id" | "nombre" | "precio_hora">[]; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [equipoId, setEquipoId] = React.useState("");
  const [externo, setExterno] = React.useState("");
  const [pagador, setPagador] = React.useState("");
  const [tarea, setTarea] = React.useState("");
  const [horas, setHoras] = React.useState(0);
  const [precio, setPrecio] = React.useState(0);
  const [fechaP, setFechaP] = React.useState("");
  const [caja, setCaja] = React.useState("oficial");
  const [fase, setFase] = React.useState("pre");
  const [busy, setBusy] = React.useState(false);
  const esExterno = equipoId === "__ext__";

  function onPersona(id: string) {
    setEquipoId(id);
    const p = equipo.find((e) => e.id === id);
    if (id !== "__ext__") setPrecio(Number(p?.precio_hora ?? 0));
  }
  async function add() {
    setBusy(true);
    try {
      await crearParteHoras({
        oportunidadId,
        equipoId: esExterno ? null : equipoId || null,
        tarea, horas, precioHora: precio, fecha: fechaP || null,
        personaExterna: esExterno ? externo.trim() || null : null,
        pagadoPor: esExterno ? pagador || null : null,
        caja,
        fase,
      });
      setOpen(false); setEquipoId(""); setExterno(""); setPagador(""); setTarea(""); setHoras(0); setPrecio(0); setFechaP(""); setCaja("oficial"); setFase("pre"); onDone();
    } finally { setBusy(false); }
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={14} /> Añadir horas</Button>;
  return (
    <div className="space-y-2 rounded-md bg-beige-light p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="Persona">
          <Select value={equipoId} onChange={(e) => onPersona(e.target.value)}>
            <option value="">—</option>
            {equipo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            <option value="__ext__">➕ Externo (amigo)…</option>
          </Select>
        </Field>
        {esExterno && (
          <Field label="Nombre del externo">
            <Input value={externo} onChange={(e) => setExterno(e.target.value)} placeholder="Juanjo…" autoFocus />
          </Field>
        )}
        <Field label="Tarea"><Input value={tarea} onChange={(e) => setTarea(e.target.value)} placeholder="Montaje…" /></Field>
        <Field label="Horas"><Input type="number" step="0.5" value={horas || ""} onChange={(e) => setHoras(Number(e.target.value))} /></Field>
        <Field label="€/hora"><Input type="number" step="0.01" value={precio || ""} onChange={(e) => setPrecio(Number(e.target.value))} /></Field>
        <Field label="Fecha (vacía = hoy)"><Input type="date" value={fechaP} onChange={(e) => setFechaP(e.target.value)} /></Field>
        <Field label="Fase">
          <Select value={fase} onChange={(e) => setFase(e.target.value)}>
            {FASES_HORAS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </Select>
        </Field>
        {esExterno && (
          <Field label="Efectivo pagado por">
            <Select value={pagador} onChange={(e) => setPagador(e.target.value)}>
              <option value="">TDO (caja)</option>
              {equipo.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
            </Select>
          </Field>
        )}
        {esExterno && <CajaSelect caja={caja} setCaja={setCaja} />}
      </div>
      {esExterno && (
        <p className="text-[11px] text-ink-muted">
          El pago al externo sale en Tesorería como gasto en efectivo del evento
          {pagador ? ` — y como lo adelanta ${pagador}, queda reembolso pendiente en deudas.` : "."}
        </p>
      )}
      <div className="flex justify-end gap-1"><Button size="sm" onClick={add} disabled={busy || (esExterno && !externo.trim())}>{busy ? "Guardando…" : "Añadir"}</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button></div>
    </div>
  );
}

// Caja de la que sale el gasto del evento: la oficial de TDO (por defecto) o
// la de amigos. La de amigos no computa en la contabilidad oficial y actualiza
// el saldo/movimientos de la caja de amigos.
function CajaSelect({ caja, setCaja }: { caja: string; setCaja: (v: string) => void }) {
  return (
    <Field label="Caja">
      <Select
        value={caja}
        onChange={(e) => setCaja(e.target.value)}
        className={caja === "amigos" ? "font-semibold text-clay" : ""}
      >
        <option value="oficial">🏦 Oficial (TDO)</option>
        <option value="amigos">🤝 Amigos</option>
      </Select>
    </Field>
  );
}

// Desplegable de "quién lo ha pagado": la empresa (por defecto) o alguien del
// equipo — SIEMPRE del desplegable, sin texto libre, para no crear duplicados
// de nombres. Si lo pagó una persona, el gasto queda como reembolso pendiente
// y aparece en las deudas de Tesorería.
function PagadoPor({
  nombres, quien, setQuien,
}: {
  nombres: string[]; quien: string;
  setQuien: (v: string) => void;
}) {
  return (
    <Field label="Pagado por (equipo)">
      <Select value={quien} onChange={(e) => setQuien(e.target.value)}>
        <option value="">TDO (cuenta empresa)</option>
        {nombres.map((n) => <option key={n} value={n}>{n}</option>)}
      </Select>
    </Field>
  );
}

function DesplForm({ oportunidadId, kmPrecio, lugar, pagadores, onDone }: { oportunidadId: string; kmPrecio: number; lugar: LugarInfo; pagadores: string[]; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [trayecto, setTrayecto] = React.useState(lugar?.nombre ?? "");
  const [km, setKm] = React.useState(lugar?.distancia_km ?? 0);
  const [ida, setIda] = React.useState(true);
  const [gasManual, setGasManual] = React.useState<string>("");
  const [peaje, setPeaje] = React.useState(0);
  const [parking, setParking] = React.useState(0);
  const [precioKm, setPrecioKm] = React.useState(kmPrecio);
  const [quien, setQuien] = React.useState("");
  const [fechaD, setFechaD] = React.useState("");
  const [caja, setCaja] = React.useState("oficial");
  const [busy, setBusy] = React.useState(false);

  const kmTotal = (km || 0) * (ida ? 2 : 1);
  const gasEstim = Math.round(kmTotal * precioKm * 100) / 100;
  const gas = gasManual ? Number(gasManual) : gasEstim;
  const total = Math.round((gas + peaje + parking) * 100) / 100;
  const quienFinal = quien;

  async function add() {
    setBusy(true);
    try {
      await crearDesplazamiento({
        oportunidadId, trayecto, km, idaVuelta: ida,
        gasolinaManual: gasManual ? Number(gasManual) : null,
        peaje, parking, fecha: fechaD || null,
        quienLoPaga: quienFinal || null,
        caja,
      });
      setOpen(false); onDone();
    } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={14} /> Añadir desplazamiento</Button>
        <KmPrecioEditor kmPrecio={kmPrecio} onDone={onDone} />
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-md bg-beige-light p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Trayecto / lugar"><Input value={trayecto} onChange={(e) => setTrayecto(e.target.value)} /></Field>
        <Field label="Km (solo ida)"><Input type="number" value={km || ""} onChange={(e) => setKm(Number(e.target.value))} /></Field>
        <Field label="Peaje €"><Input type="number" step="0.01" value={peaje || ""} onChange={(e) => setPeaje(Number(e.target.value))} /></Field>
        <Field label="Parking €"><Input type="number" step="0.01" value={parking || ""} onChange={(e) => setParking(Number(e.target.value))} /></Field>
        <Field label="Fecha (vacía = hoy)"><Input type="date" value={fechaD} onChange={(e) => setFechaD(e.target.value)} /></Field>
        <PagadoPor nombres={pagadores} quien={quien} setQuien={setQuien} />
        <CajaSelect caja={caja} setCaja={setCaja} />
      </div>
      {quienFinal && (
        <p className="text-[11px] text-warn">
          Quedará como reembolso pendiente a {quienFinal} en las deudas de Tesorería.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-[12px]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={ida} onChange={(e) => setIda(e.target.checked)} className="h-4 w-4 accent-sage" /> Ida y vuelta</label>
        <span className="text-ink-muted">Gasolina estimada ({kmTotal} km × {num(precioKm, 2)} €/km): <b className="text-ink">{eur(gasEstim)}</b></span>
        <label className="flex items-center gap-1">o manual €: <input type="number" step="0.01" value={gasManual} onChange={(e) => setGasManual(e.target.value)} className="w-20 rounded-sm border-med border-border px-2 py-1" /></label>
        {lugar && km > 0 && km !== (lugar.distancia_km ?? -1) && (
          <button type="button" onClick={async () => { await guardarDistanciaLugar(lugar.id, km, oportunidadId); onDone(); }} className="text-[11px] font-semibold text-clay hover:text-clay-600">
            Guardar {km} km como distancia de «{lugar.nombre}»
          </button>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-[13px] font-semibold">Total desplazamiento: <span className="tabular">{eur(total)}</span></span>
        <div className="flex gap-1">
          <Button size="sm" onClick={add} disabled={busy}>{busy ? "Guardando…" : "Añadir"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

function KmPrecioEditor({ kmPrecio, onDone }: { kmPrecio: number; onDone: () => void }) {
  const [v, setV] = React.useState(String(kmPrecio));
  const [busy, setBusy] = React.useState(false);
  return (
    <span className="flex items-center gap-1 text-[11px] text-ink-muted">
      €/km:
      <input type="number" step="0.01" value={v} onChange={(e) => setV(e.target.value)} className="w-16 rounded-sm border-med border-border px-2 py-1" />
      <button
        onClick={async () => { setBusy(true); try { await guardarKmPrecio(Number(v)); onDone(); } finally { setBusy(false); } }}
        disabled={busy}
        className="font-semibold text-sage hover:underline"
      >
        Guardar
      </button>
    </span>
  );
}

function CompraForm({ oportunidadId, proveedores, pagadores, categoriasGasto = [], onDone }: { oportunidadId: string; proveedores: Pick<Proveedor, "id" | "nombre">[]; pagadores: string[]; categoriasGasto?: string[]; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [concepto, setConcepto] = React.useState("");
  const [importe, setImporte] = React.useState(0);
  const [proveedorId, setProveedorId] = React.useState("");
  const [proveedorNuevo, setProveedorNuevo] = React.useState("");
  const [quien, setQuien] = React.useState("");
  const [fechaC, setFechaC] = React.useState("");
  const [caja, setCaja] = React.useState("oficial");
  const [cats, setCats] = React.useState<string[]>(() => unirCategorias(categoriasGasto));
  const [categoria, setCategoria] = React.useState("Material");
  const [ticket, setTicket] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const ticketRef = React.useRef<HTMLInputElement>(null);
  const quienFinal = quien;
  async function add() {
    setBusy(true);
    try {
      const movId = await crearCompra({
        oportunidadId, concepto, importe, fecha: fechaC || null,
        proveedorId: proveedorId && proveedorId !== "__nuevo__" ? proveedorId : null,
        proveedorNuevo: proveedorId === "__nuevo__" ? proveedorNuevo.trim() || null : null,
        quienLoPaga: quienFinal || null,
        caja,
        categoria,
      });
      // Ticket en el mismo paso: se adjunta al gasto recién creado.
      if (ticket && movId) {
        const fd = new FormData();
        fd.set("tesoreriaId", movId);
        fd.set("oportunidadId", oportunidadId);
        fd.set("ticket", ticket);
        try {
          await adjuntarTicket(fd);
        } catch (e) {
          alert(`El gasto se guardó, pero el ticket no se pudo subir: ${(e as Error).message}`);
        }
      }
      setOpen(false); setConcepto(""); setImporte(0); setProveedorId(""); setProveedorNuevo(""); setQuien(""); setFechaC(""); setCaja("oficial"); setTicket(null); onDone();
    } finally { setBusy(false); }
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={14} /> Añadir compra</Button>;
  return (
    <div className="space-y-2 rounded-md bg-beige-light p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Concepto"><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Flores, moqueta…" /></Field>
        <Field label="Tipo de gasto">
          <Select
            value={categoria}
            onChange={(e) => {
              if (e.target.value === "__nuevo__") {
                const nombre = (window.prompt("Nuevo tipo de gasto (p. ej. Alquiler de vehículos, Dietas…)") || "").trim();
                if (!nombre) return;
                setCats((cs) => unirCategorias([...cs, nombre]));
                setCategoria(nombre);
              } else setCategoria(e.target.value);
            }}
          >
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            {!cats.some((c) => c.toLowerCase() === categoria.toLowerCase()) && <option value={categoria}>{categoria}</option>}
            <option value="__nuevo__">➕ Nuevo tipo…</option>
          </Select>
        </Field>
        <Field label="Importe €"><Input type="number" step="0.01" value={importe || ""} onChange={(e) => setImporte(Number(e.target.value))} /></Field>
        <Field label="Proveedor">
          <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">—</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            <option value="__nuevo__">➕ Nuevo proveedor…</option>
          </Select>
        </Field>
        {proveedorId === "__nuevo__" && (
          <Field label="Nombre del proveedor">
            <Input value={proveedorNuevo} onChange={(e) => setProveedorNuevo(e.target.value)} placeholder="Floristería…" autoFocus />
          </Field>
        )}
        <PagadoPor nombres={pagadores} quien={quien} setQuien={setQuien} />
        <CajaSelect caja={caja} setCaja={setCaja} />
        <Field label="Fecha (vacía = hoy)"><Input type="date" value={fechaC} onChange={(e) => setFechaC(e.target.value)} /></Field>
        <Field label="Ticket (foto, opcional)">
          <button
            onClick={() => ticketRef.current?.click()}
            className="flex w-full items-center gap-1.5 rounded-sm border-med border-dashed border-border-strong bg-white px-3 py-2 text-left text-[12px] text-ink-secondary hover:bg-beige-warm"
          >
            <Paperclip size={13} className="shrink-0 text-sage" />
            <span className="truncate">{ticket ? ticket.name : "Hacer foto / elegir archivo"}</span>
          </button>
          <input
            ref={ticketRef}
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => setTicket(e.target.files?.[0] ?? null)}
          />
        </Field>
      </div>
      {quienFinal && (
        <p className="text-[11px] text-warn">
          Quedará como reembolso pendiente a {quienFinal} en las deudas de Tesorería.
        </p>
      )}
      <div className="flex justify-end gap-1">
        <Button size="sm" onClick={add} disabled={busy || !concepto}>{busy ? "Guardando…" : "Añadir"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
      </div>
    </div>
  );
}
