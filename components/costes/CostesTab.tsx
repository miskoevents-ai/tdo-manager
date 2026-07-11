"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, Truck, Flower2, Calculator, Paperclip, Lock, LockOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { eur, fecha, num } from "@/lib/format";
import {
  crearParteHoras, borrarParteHoras,
  crearDesplazamiento, borrarDesplazamiento,
  crearCompra, borrarCompra,
  guardarKmPrecio, guardarDistanciaLugar,
  crearCosteEstimado, borrarCosteEstimado, guardarParamsCostes,
  adjuntarTicket, cerrarEvento, cuadrarEstimado,
} from "@/app/actions";
import type { ParteHoras, Desplazamiento, Tesoreria, Equipo, Proveedor, CosteEstimado } from "@/lib/types";

type LugarInfo = { id: string; nombre: string; distancia_km: number | null } | null;

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
  estimados = [],
  contingenciaPct = 5,
  margenObjetivoPct = 35,
  cerrada = false,
  cerradaFecha = null,
  pendienteCobro = 0,
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
  estimados?: CosteEstimado[];
  contingenciaPct?: number;
  margenObjetivoPct?: number;
  cerrada?: boolean;
  cerradaFecha?: string | null;
  pendienteCobro?: number;
}) {
  const router = useRouter();
  const r = () => router.refresh();

  const cPersonal = partes.reduce((s, p) => s + Number(p.horas) * Number(p.precio_hora), 0);
  const cDespl = desplazamientos.reduce(
    (s, d) => s + Number(d.coste_gasolina ?? 0) + Number(d.peaje ?? 0) + Number(d.parking ?? 0),
    0,
  );
  const cMaterial = compras.reduce((s, m) => s + Number(m.importe), 0);
  const costes = cPersonal + cDespl + cMaterial;
  const margen = base - costes;
  const margenPct = base > 0 ? (margen / base) * 100 : 0;

  // Estimación previa: total + contingencia, para comparar con los reales.
  const totalEstimado = estimados.reduce((s, e) => s + Number(e.importe), 0);
  const estimadoConColchon = totalEstimado * (1 + contingenciaPct / 100);
  const desviacion = costes - estimadoConColchon;

  const estimadosVisibles = estimados.length > 0;

  // Estimado por categoría, para la comparativa pre vs post.
  const estPorCat = { personal: 0, desplazamiento: 0, material: 0, otro: 0 };
  for (const e of estimados) {
    const c = (e.categoria ?? "material") as keyof typeof estPorCat;
    estPorCat[c in estPorCat ? c : "otro"] += Number(e.importe);
  }

  // Reembolsos a personas aún pendientes (para la validación del cierre).
  const reembolsosPdtes = compras.filter((m) => m.quien_lo_paga && m.estado !== "pagado").length;

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

  return (
    <div className="space-y-5">
      {/* Cierre del evento */}
      {cerrada && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border-hair border-ok bg-ok-tint px-4 py-3 text-[13px]">
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
      )}

      {/* Resumen / escandallo */}
      <div className="rounded-lg border-hair border-border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Ingreso (base)" v={eur(base)} tone="text-ink" />
          <Kpi label="Costes" v={eur(costes)} tone="text-error" />
          <Kpi label="Margen" v={eur(margen)} tone={margen >= 0 ? "text-ok" : "text-error"} />
          <Kpi label="Margen %" v={`${num(margenPct, 0)}%`} tone={margen >= 0 ? "text-sage" : "text-error"} />
        </div>
        {/* Barra escandallo */}
        <div className="mt-4">
          <div className="flex h-3 w-full overflow-hidden rounded-pill bg-beige-warm">
            {base > 0 && (
              <>
                <span className="bg-clay-300" style={{ width: `${Math.min(100, (cPersonal / base) * 100)}%` }} title="Personal" />
                <span className="bg-warn" style={{ width: `${Math.min(100, (cDespl / base) * 100)}%` }} title="Desplazamientos" />
                <span className="bg-error" style={{ width: `${Math.min(100, (cMaterial / base) * 100)}%` }} title="Material" />
                <span className="bg-ok" style={{ width: `${Math.max(0, (margen / base) * 100)}%` }} title="Margen" />
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            <Leg color="bg-clay-300" t={`Personal ${eur(cPersonal)}`} />
            <Leg color="bg-warn" t={`Desplazamientos ${eur(cDespl)}`} />
            <Leg color="bg-error" t={`Material ${eur(cMaterial)}`} />
            <Leg color="bg-ok" t={`Margen ${eur(margen)}`} />
          </div>
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
                    <td className="border-t border-border/60 py-1.5 text-right tabular">{eur(real)}</td>
                    <td className={`border-t border-border/60 py-1.5 text-right tabular font-semibold ${real - est > 0.01 ? "text-error" : "text-ok"}`}>
                      {real - est > 0 ? "+" : ""}{eur(real - est)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="border-t-2 border-ink/40 py-1.5">Total (+{num(contingenciaPct, 0)}% contingencia)</td>
                  <td className="border-t-2 border-ink/40 py-1.5 text-right tabular">{eur(estimadoConColchon)}</td>
                  <td className="border-t-2 border-ink/40 py-1.5 text-right tabular">{eur(costes)}</td>
                  <td className={`border-t-2 border-ink/40 py-1.5 text-right tabular ${desviacion > 0.01 ? "text-error" : "text-ok"}`}>
                    {desviacion > 0 ? "+" : ""}{eur(desviacion)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-ink-secondary">Margen (sobre base {eur(base)})</td>
                  <td className="py-1.5 text-right tabular">{eur(base - estimadoConColchon)}</td>
                  <td className={`py-1.5 text-right tabular font-semibold ${margen >= 0 ? "text-ok" : "text-error"}`}>{eur(margen)}</td>
                  <td className={`py-1.5 text-right tabular ${margen - (base - estimadoConColchon) < -0.01 ? "text-error" : "text-ok"}`}>
                    {margen - (base - estimadoConColchon) > 0 ? "+" : ""}{eur(margen - (base - estimadoConColchon))}
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
            Real <b className="tabular">{eur(costes)}</b>
            {totalEstimado > 0 && (
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

        {!cerrada && (
          <div className="mb-5 rounded-md border-hair border-border bg-beige-light/60 p-3">
            <ApunteRapido oportunidadId={oportunidadId} equipo={equipo} onDone={r} />
          </div>
        )}

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
            {estimadosVisibles ? (
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
              />
            ) : (
              <p className="py-2 text-[12px] text-ink-muted">
                Sin plan todavía. Añade líneas con la rejilla de arriba en modo{" "}
                <b>🧮 Previsto</b>: verás aquí el plan, el precio mínimo sugerido y el cuadre con lo
                real.
              </p>
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
              {!cerrada && <CompraForm oportunidadId={oportunidadId} proveedores={proveedores} pagadores={equipo.map((e) => e.nombre)} onDone={r} />}
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
                        {m.quien_lo_paga && m.estado !== "pagado" && (
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

// ---------- Apunte rápido (tipo Excel) ----------
// Rejilla para meter varios gastos de golpe tecleando, como en una hoja de
// cálculo: tipo + concepto + cantidad/horas × €/ud con total automático y
// fila nueva sola. Al guardar, cada fila va a su sitio real: Personal →
// partes de horas, Desplazamiento → desplazamientos, Material/Otro → compras.
type FilaRapida = { tipo: string; persona: string; personaExt: string; concepto: string; cantidad: number; precio: number; pagador: string; caja: string };
const FILA_RAPIDA: FilaRapida = { tipo: "material", persona: "", personaExt: "", concepto: "", cantidad: 1, precio: 0, pagador: "", caja: "oficial" };

function ApunteRapido({
  oportunidadId,
  equipo,
  onDone,
}: {
  oportunidadId: string;
  equipo: Pick<Equipo, "id" | "nombre" | "precio_hora">[];
  onDone: () => void;
}) {
  const [filas, setFilas] = React.useState<FilaRapida[]>([{ ...FILA_RAPIDA }]);
  // Destino de las filas: previstos (plan, antes del presu) o reales (contabilidad).
  const [modo, setModo] = React.useState<"previsto" | "real">("previsto");
  // Fecha común de los apuntes reales (para cargar datos antiguos); vacía = hoy.
  const [fechaComun, setFechaComun] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function set(i: number, patch: Partial<FilaRapida>) {
    setFilas((fs) => {
      const nuevas = fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
      // Como en Excel: al escribir en la última fila aparece otra vacía debajo.
      if (i === fs.length - 1 && (patch.concepto ?? "").trim()) {
        nuevas.push({ ...FILA_RAPIDA, tipo: nuevas[i].tipo });
      }
      return nuevas;
    });
  }

  const validas = filas.filter((f) => f.concepto.trim() && f.cantidad * f.precio > 0);
  const total = validas.reduce((s, f) => s + f.cantidad * f.precio, 0);

  async function guardarTodo() {
    setBusy(true);
    setMsg(null);
    try {
      for (const f of validas) {
        const esExterno = f.tipo === "personal" && f.persona === "__ext__";
        if (modo === "previsto") {
          await crearCosteEstimado({
            oportunidadId,
            concepto: f.concepto.trim(),
            cantidad: f.cantidad,
            precioUnitario: f.precio,
            categoria: f.tipo,
            equipoId: f.tipo === "personal" && !esExterno ? f.persona || null : null,
            personaExterna: esExterno ? f.personaExt.trim() || null : null,
            pagador: f.tipo !== "personal" || esExterno ? f.pagador || null : null,
            caja: f.caja,
          });
          continue;
        }
        if (f.tipo === "personal") {
          await crearParteHoras({
            oportunidadId,
            equipoId: esExterno ? null : f.persona || null,
            tarea: f.concepto.trim(),
            horas: f.cantidad,
            precioHora: f.precio,
            fecha: fechaComun || null,
            personaExterna: esExterno ? f.personaExt.trim() || null : null,
            pagadoPor: esExterno ? f.pagador || null : null,
            caja: f.caja,
          });
        } else if (f.tipo === "desplazamiento") {
          await crearDesplazamiento({
            oportunidadId,
            trayecto: f.concepto.trim(),
            km: 0,
            idaVuelta: false,
            gasolinaManual: Math.round(f.cantidad * f.precio * 100) / 100,
            peaje: 0,
            parking: 0,
            fecha: fechaComun || null,
            quienLoPaga: f.pagador || null,
            caja: f.caja,
          });
        } else {
          await crearCompra({
            oportunidadId,
            concepto: f.concepto.trim(),
            importe: Math.round(f.cantidad * f.precio * 100) / 100,
            fecha: fechaComun || null,
            proveedorId: null,
            quienLoPaga: f.pagador || null,
            caja: f.caja,
          });
        }
      }
      setFilas([{ ...FILA_RAPIDA }]);
      setMsg(
        modo === "previsto"
          ? `${validas.length} línea(s) añadidas al plan previsto (${eur(total)}).`
          : `${validas.length} gasto(s) reales guardados (${eur(total)}).`,
      );
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Interruptor: ¿estas filas son plan previsto o gastos reales? */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["previsto", "🧮 Previsto (antes del presu)"],
            ["real", "✅ Real (gasto de verdad)"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setModo(k)}
            className={`rounded-pill border-med px-[14px] py-[7px] text-[12px] transition-colors ${
              modo === k
                ? "border-sage bg-sage text-cream"
                : "border-border bg-white text-ink-secondary hover:border-sage-300"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-[11px] text-ink-muted">
          {modo === "previsto"
            ? "Las filas van al plan previsto (no tocan contabilidad)."
            : "Las filas van a los costes reales (horas, desplazamientos, compras)."}
        </span>
        {modo === "real" && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-ink-secondary">
            Fecha de los apuntes
            <Input
              type="date"
              value={fechaComun}
              onChange={(e) => setFechaComun(e.target.value)}
              title="Vacía = hoy. Útil para cargar gastos antiguos."
              className="w-[140px] py-1.5 text-[12px]"
            />
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="w-[130px] border-b border-border py-2 text-left font-semibold">Tipo</th>
              <th className="w-[150px] border-b border-border py-2 pl-2 text-left font-semibold">Persona</th>
              <th className="border-b border-border py-2 pl-2 text-left font-semibold">Concepto</th>
              <th className="w-[85px] border-b border-border py-2 text-right font-semibold">Cant./h</th>
              <th className="w-[95px] border-b border-border py-2 text-right font-semibold">€/ud·h</th>
              <th className="w-[95px] border-b border-border py-2 text-right font-semibold">Total</th>
              <th className="w-[130px] border-b border-border py-2 pl-2 text-left font-semibold">Pagado por</th>
              <th className="w-[120px] border-b border-border py-2 pl-2 text-left font-semibold">Caja</th>
              <th className="w-[36px] border-b border-border py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td className="border-b border-[#f0eae1] py-1 pr-1">
                  <Select value={f.tipo} onChange={(e) => set(i, { tipo: e.target.value })} className="py-1.5 text-[12px]">
                    <option value="material">Material</option>
                    <option value="personal">Personal</option>
                    <option value="desplazamiento">Desplaz.</option>
                    <option value="otro">Otro</option>
                  </Select>
                </td>
                <td className="border-b border-[#f0eae1] py-1 pl-1 pr-1">
                  {f.tipo === "personal" ? (
                    f.persona === "__ext__" ? (
                      <Input
                        value={f.personaExt}
                        onChange={(e) => set(i, { personaExt: e.target.value })}
                        placeholder="Nombre del amigo…"
                        autoFocus
                        className="py-1.5 text-[12px]"
                      />
                    ) : (
                      <Select
                        value={f.persona}
                        onChange={(e) => {
                          const p = equipo.find((x) => x.id === e.target.value);
                          set(i, { persona: e.target.value, precio: f.precio || Number(p?.precio_hora ?? 0) });
                        }}
                        className="py-1.5 text-[12px]"
                      >
                        <option value="">—</option>
                        {equipo.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                        <option value="__ext__">➕ Externo (amigo)…</option>
                      </Select>
                    )
                  ) : (
                    <span className="block px-1 text-[12px] text-ink-muted">—</span>
                  )}
                </td>
                <td className="border-b border-[#f0eae1] py-1 pl-1 pr-1">
                  <Input
                    value={f.concepto}
                    onChange={(e) => set(i, { concepto: e.target.value })}
                    placeholder={f.tipo === "personal" ? "Montaje…" : f.tipo === "desplazamiento" ? "Gasolina finca…" : "Petunias, moqueta…"}
                    className="py-1.5 text-[12.5px]"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1">
                  <Input type="number" step="0.5" value={f.cantidad || ""} onChange={(e) => set(i, { cantidad: Number(e.target.value) })} className="py-1.5 text-right text-[12.5px] tabular" />
                </td>
                <td className="border-b border-[#f0eae1] py-1 pl-1">
                  <Input type="number" step="0.01" value={f.precio || ""} onChange={(e) => set(i, { precio: Number(e.target.value) })} className="py-1.5 text-right text-[12.5px] tabular" />
                </td>
                <td className="border-b border-[#f0eae1] py-1 text-right text-[12.5px] tabular font-semibold">
                  {eur(f.cantidad * f.precio)}
                </td>
                <td className="border-b border-[#f0eae1] py-1 pl-1">
                  {f.tipo === "personal" && f.persona !== "__ext__" ? (
                    <span className="block px-1 text-[11px] text-ink-muted">n/a</span>
                  ) : (
                    <Select value={f.pagador} onChange={(e) => set(i, { pagador: e.target.value })} className="py-1.5 text-[12px]">
                      <option value="">TDO</option>
                      {equipo.map((p) => (
                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="border-b border-[#f0eae1] py-1 pl-1">
                  <Select
                    value={f.caja}
                    onChange={(e) => set(i, { caja: e.target.value })}
                    title="¿De qué caja sale este gasto?"
                    className={`py-1.5 text-[12px] ${f.caja === "amigos" ? "font-semibold text-clay" : ""}`}
                  >
                    <option value="oficial">🏦 Oficial</option>
                    <option value="amigos">🤝 Amigos</option>
                  </Select>
                </td>
                <td className="border-b border-[#f0eae1] py-1 text-center">
                  {filas.length > 1 && (
                    <button
                      onClick={() => setFilas((fs) => fs.filter((_, idx) => idx !== i))}
                      className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-ink-muted">
          Escribe y aparecen filas nuevas solas. Al guardar, cada fila va a su sección (horas,
          desplazamientos, compras). Si lo pagó alguien, queda como reembolso pendiente en deudas.
          Para adjuntar tickets, usa el formulario de compras de abajo.
        </p>
        <Button size="sm" onClick={guardarTodo} disabled={busy || validas.length === 0}>
          {busy ? "Guardando…" : `Guardar todo (${validas.length} · ${eur(total)})`}
        </Button>
      </div>
      {msg && <p className="text-caption text-ink-muted">{msg}</p>}
    </div>
  );
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
}) {
  const nombreEquipo = (id: string | null | undefined) =>
    equipo.find((p) => p.id === id)?.nombre ?? null;
  const [cont, setCont] = React.useState(contingenciaPct);
  const [margenObj, setMargenObj] = React.useState(margenObjetivoPct);
  // Importe real tecleado por línea, para el cuadre pre → post.
  const [reales, setReales] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
  const precioSugerido = margenObj < 95 ? conColchon / (1 - (margenObj || 0) / 100) : 0;
  const margenPrevisto = base - conColchon;
  const margenPrevistoPct = base > 0 ? (margenPrevisto / base) * 100 : 0;
  const paramsCambiados = cont !== contingenciaPct || margenObj !== margenObjetivoPct;

  const CATS: Record<string, string> = {
    material: "Material",
    personal: "Personal",
    desplazamiento: "Desplazamiento",
    otro: "Otro",
  };

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-ink-muted">
        El plan de gastos hecho <b>antes del presupuesto</b> (se añade desde la rejilla de arriba,
        en modo 🧮 Previsto). Con la contingencia y el margen objetivo te sugiere el precio mínimo
        al cliente. No entra en contabilidad; cuando sepas el coste real, <b>cuadra</b> cada línea
        con la flecha.
      </p>

      {estimados.length > 0 && (
        <Tabla headers={["Concepto", "Tipo", "Quién", "Cant.", "€/ud", "Previsto", "Cuadrar → real €", ""]}>
          {estimados.map((e) => (
            <tr key={e.id}>
              <Td>{e.concepto}</Td>
              <Td right>{CATS[e.categoria ?? ""] ?? "—"}</Td>
              <Td right>
                {e.categoria === "personal"
                  ? nombreEquipo(e.equipo_id) ?? (e.persona_externa ? `${e.persona_externa} (ext.)` : "—")
                  : e.pagador ?? "TDO"}
              </Td>
              <Td right>{num(Number(e.cantidad ?? 1), 1)}</Td>
              <Td right>{e.precio_unitario != null ? eur(Number(e.precio_unitario)) : "—"}</Td>
              <Td right bold>{eur(Number(e.importe))}</Td>
              <Td right>
                {e.cuadrado ? (
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <span className="inline-flex items-center gap-1 rounded-pill bg-ok-tint px-2 py-0.5 text-[10.5px] font-semibold text-ok">
                      ✓ {eur(Number(e.importe_real ?? e.importe))}
                    </span>
                    {e.importe_real != null && Math.abs(Number(e.importe_real) - Number(e.importe)) > 0.01 && (
                      <span className={`text-[10px] tabular ${Number(e.importe_real) > Number(e.importe) ? "text-error" : "text-ok"}`}>
                        {Number(e.importe_real) > Number(e.importe) ? "+" : ""}
                        {eur(Number(e.importe_real) - Number(e.importe))} vs previsto
                      </span>
                    )}
                  </span>
                ) : cerrada ? (
                  <span className="text-[11px] text-ink-muted">—</span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={reales[e.id] ?? String(Number(e.importe))}
                      onChange={(ev) => setReales((r) => ({ ...r, [e.id]: ev.target.value }))}
                      className="w-[85px] py-1.5 text-right text-[12px] tabular"
                    />
                    <button
                      title="Pasar a costes reales con este importe (tal cual o ajustado)"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await cuadrarEstimado({
                            estimadoId: e.id,
                            oportunidadId,
                            importeReal: Number(reales[e.id] ?? e.importe),
                          });
                        })
                      }
                      className="rounded-sm border-med border-sage bg-sage px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-cream hover:opacity-90"
                    >
                      →
                    </button>
                  </span>
                )}
              </Td>
              <Td right>{!cerrada && <Del onClick={async () => { await borrarCosteEstimado(e.id, oportunidadId); onDone(); }} />}</Td>
            </tr>
          ))}
        </Tabla>
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
          <Field label="Contingencia %">
            <Input type="number" step="1" min="0" value={cont || ""} onChange={(e) => setCont(Number(e.target.value))} className="w-[80px] text-right tabular" />
          </Field>
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
        {totalEstimado > 0 && (
          <div className="text-[12.5px]">
            <div>
              Costes previstos + {num(cont || 0, 0)}%: <b className="tabular">{eur(conColchon)}</b>
            </div>
            <div>
              Precio mínimo sugerido (margen {num(margenObj || 0, 0)}%):{" "}
              <b className="tabular text-sage">{eur(precioSugerido)}</b>
            </div>
            {base > 0 && (
              <div className={margenPrevistoPct >= (margenObj || 0) ? "text-ok" : "text-error"}>
                Con el presu actual ({eur(base)}): margen previsto {eur(margenPrevisto)} ({num(margenPrevistoPct, 0)}%)
                {margenPrevistoPct >= (margenObj || 0) ? " ✓" : " — por debajo del objetivo"}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
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
      });
      setOpen(false); setEquipoId(""); setExterno(""); setPagador(""); setTarea(""); setHoras(0); setPrecio(0); setFechaP(""); setCaja("oficial"); onDone();
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

// Desplegable de "quién lo ha pagado": la empresa (por defecto), alguien del
// equipo o una persona externa escrita a mano. Si lo pagó una persona, el
// gasto queda como reembolso pendiente y aparece en las deudas de Tesorería.
function PagadoPor({
  nombres, quien, otro, setQuien, setOtro,
}: {
  nombres: string[]; quien: string; otro: string;
  setQuien: (v: string) => void; setOtro: (v: string) => void;
}) {
  return (
    <>
      <Field label="Pagado por">
        <Select value={quien} onChange={(e) => setQuien(e.target.value)}>
          <option value="">TDO (cuenta empresa)</option>
          {nombres.map((n) => <option key={n} value={n}>{n}</option>)}
          <option value="__otro__">Otra persona…</option>
        </Select>
      </Field>
      {quien === "__otro__" && (
        <Field label="Nombre de quien pagó">
          <Input value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Nombre…" autoFocus />
        </Field>
      )}
    </>
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
  const [otro, setOtro] = React.useState("");
  const [fechaD, setFechaD] = React.useState("");
  const [caja, setCaja] = React.useState("oficial");
  const [busy, setBusy] = React.useState(false);

  const kmTotal = (km || 0) * (ida ? 2 : 1);
  const gasEstim = Math.round(kmTotal * precioKm * 100) / 100;
  const gas = gasManual ? Number(gasManual) : gasEstim;
  const total = Math.round((gas + peaje + parking) * 100) / 100;
  const quienFinal = quien === "__otro__" ? otro.trim() : quien;

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
        <PagadoPor nombres={pagadores} quien={quien} otro={otro} setQuien={setQuien} setOtro={setOtro} />
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

function CompraForm({ oportunidadId, proveedores, pagadores, onDone }: { oportunidadId: string; proveedores: Pick<Proveedor, "id" | "nombre">[]; pagadores: string[]; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [concepto, setConcepto] = React.useState("");
  const [importe, setImporte] = React.useState(0);
  const [proveedorId, setProveedorId] = React.useState("");
  const [proveedorNuevo, setProveedorNuevo] = React.useState("");
  const [quien, setQuien] = React.useState("");
  const [otro, setOtro] = React.useState("");
  const [fechaC, setFechaC] = React.useState("");
  const [caja, setCaja] = React.useState("oficial");
  const [ticket, setTicket] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const ticketRef = React.useRef<HTMLInputElement>(null);
  const quienFinal = quien === "__otro__" ? otro.trim() : quien;
  async function add() {
    setBusy(true);
    try {
      const movId = await crearCompra({
        oportunidadId, concepto, importe, fecha: fechaC || null,
        proveedorId: proveedorId && proveedorId !== "__nuevo__" ? proveedorId : null,
        proveedorNuevo: proveedorId === "__nuevo__" ? proveedorNuevo.trim() || null : null,
        quienLoPaga: quienFinal || null,
        caja,
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
      setOpen(false); setConcepto(""); setImporte(0); setProveedorId(""); setProveedorNuevo(""); setQuien(""); setOtro(""); setFechaC(""); setCaja("oficial"); setTicket(null); onDone();
    } finally { setBusy(false); }
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={14} /> Añadir compra</Button>;
  return (
    <div className="space-y-2 rounded-md bg-beige-light p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Concepto"><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Flores, moqueta…" /></Field>
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
        <PagadoPor nombres={pagadores} quien={quien} otro={otro} setQuien={setQuien} setOtro={setOtro} />
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
