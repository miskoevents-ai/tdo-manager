"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, Truck, Flower2, Calculator, Paperclip, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { eur, fecha, num } from "@/lib/format";
import {
  crearParteHoras, borrarParteHoras,
  crearDesplazamiento, borrarDesplazamiento,
  crearCompra, borrarCompra,
  guardarKmPrecio, guardarDistanciaLugar,
  crearCosteEstimado, borrarCosteEstimado, guardarParamsCostes,
  adjuntarTicket, cerrarEvento,
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
        {/* Estimado vs real */}
        {totalEstimado > 0 && (
          <div className="mt-3 rounded-md bg-beige-light px-3 py-2 text-[12px]">
            Estimado (con {num(contingenciaPct, 0)}% de contingencia):{" "}
            <b className="tabular">{eur(estimadoConColchon)}</b>
            <span className="mx-2 text-ink-muted">·</span>
            Real: <b className="tabular">{eur(costes)}</b>
            <span className="mx-2 text-ink-muted">·</span>
            Desviación:{" "}
            <b className={`tabular ${desviacion > 0.01 ? "text-error" : "text-ok"}`}>
              {desviacion > 0 ? "+" : ""}
              {eur(desviacion)}
            </b>
          </div>
        )}
      </div>

      {/* Estimación previa al presupuesto (se oculta al cerrar el evento) */}
      {!cerrada && (
        <Bloque
          icon={<Calculator size={15} />}
          titulo="Estimación previa (para cuadrar el precio)"
          total={totalEstimado > 0 ? eur(estimadoConColchon) : "—"}
        >
          <EstimacionBlock
            oportunidadId={oportunidadId}
            estimados={estimados}
            totalEstimado={totalEstimado}
            contingenciaPct={contingenciaPct}
            margenObjetivoPct={margenObjetivoPct}
            base={base}
            onDone={r}
          />
        </Bloque>
      )}

      {/* A) Personal */}
      <Bloque icon={<Users size={15} />} titulo="Personal (horas)" total={eur(cPersonal)}>
        {!cerrada && <PersonalForm oportunidadId={oportunidadId} equipo={equipo} onDone={r} />}
        {partes.length > 0 && (
          <Tabla headers={["Persona", "Tarea", "Horas", "€/h", "Coste", ""]}>
            {partes.map((p) => (
              <tr key={p.id}>
                <Td>{p.equipo?.nombre ?? "—"}</Td>
                <Td>{p.tarea ?? "—"}</Td>
                <Td right>{num(p.horas, 1)}</Td>
                <Td right>{eur(p.precio_hora)}</Td>
                <Td right bold>{eur(Number(p.horas) * Number(p.precio_hora))}</Td>
                <Td right>{!cerrada && <Del onClick={async () => { await borrarParteHoras(p.id, oportunidadId); r(); }} />}</Td>
              </tr>
            ))}
          </Tabla>
        )}
      </Bloque>

      {/* B) Desplazamientos */}
      <Bloque icon={<Truck size={15} />} titulo="Desplazamientos" total={eur(cDespl)}>
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
      </Bloque>

      {/* C) Material / compras */}
      <Bloque icon={<Flower2 size={15} />} titulo="Compras / material" total={eur(cMaterial)}>
        {!cerrada && <CompraForm oportunidadId={oportunidadId} proveedores={proveedores} pagadores={equipo.map((e) => e.nombre)} onDone={r} />}
        {compras.length > 0 && (
          <Tabla headers={["Concepto", "Fecha", "Pagado por", "Ticket", "Importe", ""]}>
            {compras.map((m) => (
              <tr key={m.id}>
                <Td>{m.concepto}</Td>
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
      </Bloque>

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
  onDone,
}: {
  oportunidadId: string;
  estimados: CosteEstimado[];
  totalEstimado: number;
  contingenciaPct: number;
  margenObjetivoPct: number;
  base: number;
  onDone: () => void;
}) {
  const [concepto, setConcepto] = React.useState("");
  const [categoria, setCategoria] = React.useState("material");
  const [cantidad, setCantidad] = React.useState(1);
  const [precioUd, setPrecioUd] = React.useState(0);
  const [cont, setCont] = React.useState(contingenciaPct);
  const [margenObj, setMargenObj] = React.useState(margenObjetivoPct);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const conColchon = totalEstimado * (1 + (cont || 0) / 100);
  const precioSugerido = margenObj < 95 ? conColchon / (1 - (margenObj || 0) / 100) : 0;
  const margenPrevisto = base - conColchon;
  const margenPrevistoPct = base > 0 ? (margenPrevisto / base) * 100 : 0;
  const paramsCambiados = cont !== contingenciaPct || margenObj !== margenObjetivoPct;

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await crearCosteEstimado({ oportunidadId, concepto, cantidad, precioUnitario: precioUd, categoria });
      setConcepto("");
      setCantidad(1);
      setPrecioUd(0);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const CATS: Record<string, string> = {
    material: "Material",
    personal: "Personal",
    desplazamiento: "Desplazamiento",
    otro: "Otro",
  };

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-ink-muted">
        Apunta aquí los gastos que prevés <b>antes de hacer el presupuesto</b>. Con la contingencia
        y el margen objetivo te sugiere el precio mínimo al cliente. No entra en contabilidad: los
        reales son los de abajo.
      </p>

      {/* Añadir estimado: tipo + concepto + cantidad × precio unitario */}
      <div className="flex flex-wrap items-end gap-2 rounded-md bg-beige-light p-3">
        <Field label="Tipo">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-[140px]">
            <option value="material">Material</option>
            <option value="personal">Personal</option>
            <option value="desplazamiento">Desplazamiento</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <div className="min-w-[170px] flex-1">
          <Field label="Concepto previsto">
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ramos de petunias, gasolina, horas de Pepe…" />
          </Field>
        </div>
        <Field label="Cant.">
          <Input type="number" step="0.5" value={cantidad || ""} onChange={(e) => setCantidad(Number(e.target.value))} className="w-[70px] text-right tabular" />
        </Field>
        <Field label="€/ud">
          <Input type="number" step="0.01" value={precioUd || ""} onChange={(e) => setPrecioUd(Number(e.target.value))} className="w-[90px] text-right tabular" />
        </Field>
        <div className="pb-2 text-[12.5px] text-ink-secondary">
          = <b className="tabular">{eur((cantidad || 0) * (precioUd || 0))}</b>
        </div>
        <Button size="sm" onClick={add} disabled={busy || !concepto.trim() || !((cantidad || 0) * (precioUd || 0) > 0)}>
          <Plus size={14} /> Añadir
        </Button>
      </div>

      {estimados.length > 0 && (
        <Tabla headers={["Concepto", "Tipo", "Cant.", "€/ud", "Total", ""]}>
          {estimados.map((e) => (
            <tr key={e.id}>
              <Td>{e.concepto}</Td>
              <Td right>{CATS[e.categoria ?? ""] ?? "—"}</Td>
              <Td right>{num(Number(e.cantidad ?? 1), 1)}</Td>
              <Td right>{e.precio_unitario != null ? eur(Number(e.precio_unitario)) : "—"}</Td>
              <Td right bold>{eur(Number(e.importe))}</Td>
              <Td right><Del onClick={async () => { await borrarCosteEstimado(e.id, oportunidadId); onDone(); }} /></Td>
            </tr>
          ))}
        </Tabla>
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
  const [tarea, setTarea] = React.useState("");
  const [horas, setHoras] = React.useState(0);
  const [precio, setPrecio] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  function onPersona(id: string) {
    setEquipoId(id);
    const p = equipo.find((e) => e.id === id);
    setPrecio(Number(p?.precio_hora ?? 0));
  }
  async function add() {
    setBusy(true);
    try {
      await crearParteHoras({ oportunidadId, equipoId: equipoId || null, tarea, horas, precioHora: precio, fecha: null });
      setOpen(false); setEquipoId(""); setTarea(""); setHoras(0); setPrecio(0); onDone();
    } finally { setBusy(false); }
  }
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus size={14} /> Añadir horas</Button>;
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md bg-beige-light p-3 sm:grid-cols-5">
      <Field label="Persona"><Select value={equipoId} onChange={(e) => onPersona(e.target.value)}><option value="">—</option>{equipo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></Field>
      <Field label="Tarea"><Input value={tarea} onChange={(e) => setTarea(e.target.value)} placeholder="Montaje…" /></Field>
      <Field label="Horas"><Input type="number" step="0.5" value={horas || ""} onChange={(e) => setHoras(Number(e.target.value))} /></Field>
      <Field label="€/hora"><Input type="number" step="0.01" value={precio || ""} onChange={(e) => setPrecio(Number(e.target.value))} /></Field>
      <div className="flex items-end gap-1"><Button size="sm" onClick={add} disabled={busy}>Añadir</Button><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button></div>
    </div>
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
        peaje, parking, fecha: null,
        quienLoPaga: quienFinal || null,
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
        <PagadoPor nombres={pagadores} quien={quien} otro={otro} setQuien={setQuien} setOtro={setOtro} />
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
  const [busy, setBusy] = React.useState(false);
  const quienFinal = quien === "__otro__" ? otro.trim() : quien;
  async function add() {
    setBusy(true);
    try {
      await crearCompra({
        oportunidadId, concepto, importe, fecha: null,
        proveedorId: proveedorId && proveedorId !== "__nuevo__" ? proveedorId : null,
        proveedorNuevo: proveedorId === "__nuevo__" ? proveedorNuevo.trim() || null : null,
        quienLoPaga: quienFinal || null,
      });
      setOpen(false); setConcepto(""); setImporte(0); setProveedorId(""); setProveedorNuevo(""); setQuien(""); setOtro(""); onDone();
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
