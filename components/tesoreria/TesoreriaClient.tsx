"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Check, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { Donut, DONUT_COLORS } from "@/components/ui/Donut";
import { marcarMovimientoPagado, cambiarEstadoMovimiento, marcarMovimientoLiquidado, reembolsarMovimiento } from "@/app/actions";
import { PersonaCajaModal } from "@/components/ui/PersonaCajaModal";
import { canonizarNombre } from "@/lib/personas";
import { eur, fecha } from "@/lib/format";
import {
  NATURALEZA_LABEL,
  NATURALEZAS_MOV,
  ESTADOS_MOV,
  ESTADO_MOV_META,
  etapaDeFecha,
} from "@/lib/estados";
import type { Cliente, Oportunidad, Tesoreria, Proveedor } from "@/lib/types";

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];
function mesLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

export function TesoreriaClient({
  movimientos,
  clientes,
  oportunidades,
  proveedores = [],
  responsables = [],
  personasCaja = [],
  planPorOportunidad = {},
  hoy = "",
}: {
  movimientos: Tesoreria[];
  clientes: Cliente[];
  oportunidades: Pick<Oportunidad, "id" | "numero" | "titulo">[];
  proveedores?: Pick<Proveedor, "id" | "nombre">[];
  responsables?: string[];
  // Quien actúa como caja de TDO: no aparece en "Cuentas con el equipo".
  personasCaja?: string[];
  planPorOportunidad?: Record<string, { id: string; concepto: string; importe: number }[]>;
  hoy?: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [mes, setMes] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  const [naturaleza, setNaturaleza] = React.useState("");
  const [estado, setEstado] = React.useState("");
  // Caja: todo · oficial (todo menos amigos) · amigos. Filtra la lista y
  // recalcula los saldos de arriba.
  const [caja, setCaja] = React.useState<"" | "oficial" | "amigos">("");
  // Persona abierta en el detalle de cuentas con el equipo.
  const [personaDetalle, setPersonaDetalle] = React.useState<string | null>(null);
  // Panel de deudas: marcar pagado en un clic y ver solo unas pocas por defecto.
  const [pagando, setPagando] = React.useState<string | null>(null);
  const [verTodasDeudas, setVerTodasDeudas] = React.useState(false);

  async function pagar(id: string) {
    setPagando(id);
    try {
      await marcarMovimientoPagado(id);
      router.refresh();
    } finally {
      setPagando(null);
    }
  }
  const [etapa, setEtapa] = React.useState("");

  const meses = React.useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [movimientos]);

  // Categorías ya usadas: se pasan al diálogo para que las nuevas escritas a
  // mano aparezcan en la lista a partir de entonces.
  const categoriasUsadas = React.useMemo(() => {
    const set = new Set<string>();
    for (const m of movimientos) if (m.categoria) set.add(m.categoria);
    return Array.from(set);
  }, [movimientos]);

  const visibles = movimientos.filter((m) => {
    if (caja === "amigos" && m.naturaleza !== "amigos") return false;
    if (caja === "oficial" && m.naturaleza === "amigos") return false;
    if (mes && m.fecha.slice(0, 7) !== mes) return false;
    if (tipo && m.tipo !== tipo) return false;
    if (naturaleza && m.naturaleza !== naturaleza) return false;
    if (estado && m.estado !== estado) return false;
    if (etapa && etapaDeFecha(m.fecha) !== etapa) return false;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      const hay =
        m.concepto.toLowerCase().includes(t) ||
        (m.categoria ?? "").toLowerCase().includes(t) ||
        (m.oportunidad?.titulo ?? "").toLowerCase().includes(t) ||
        (m.cliente?.nombre ?? "").toLowerCase().includes(t);
      if (!hay) return false;
    }
    return true;
  });

  const ingresos = visibles.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.importe), 0);
  const gastos = visibles.filter((m) => m.tipo === "gasto").reduce((s, m) => s + Number(m.importe), 0);

  // Deudas / pendiente de pago: gastos aún no pagados (previsto o vencido).
  // "A quién": el proveedor si está enlazado; si no, quien lo pagó de su bolsillo
  // (reembolso pendiente); si tampoco, el concepto. Se calcula sobre TODOS los
  // movimientos (no solo los filtrados) para que sea un panel fijo de alarma.
  const provNombre = React.useMemo(
    () => Object.fromEntries(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores],
  );
  const deudas = movimientos.filter(
    (m) => m.tipo === "gasto" && (m.estado === "previsto" || m.estado === "vencido"),
  );
  const totalDeuda = deudas.reduce((s, m) => s + Number(m.importe), 0);
  const aQuien = (m: Tesoreria) =>
    (m.proveedor_id ? provNombre[m.proveedor_id] : null) ??
    canonizarNombre(m.quien_lo_paga, responsables) ??
    m.concepto;

  // Cuentas con el equipo, en los dos sentidos y por caja:
  //  · TDO le debe → gastos sin pagar que adelantó de su bolsillo (quien_lo_paga).
  //  · Le debe a TDO → cobros que recibió en mano y aún no ha entregado
  //    (cobrado_por, sin liquidar).
  // Los nombres se canonizan contra el equipo: "Jero" y "Jero (Jerónimo
  // Alonso Marcos)" son SIEMPRE la misma persona, aunque el dato guardado
  // tenga la grafía corta. Quien actúa como caja de TDO (es_caja) también
  // aparece, pero como caja: su fila es su balance (lo que la SL le deberá),
  // sin reembolsos ni entregas que marcar.
  const cuentasEquipo = React.useMemo(() => {
    type Lado = { oficial: number; amigos: number };
    const map = new Map<string, { debeTDO: Lado; debenTDO: Lado }>();
    const get = (n: string) =>
      map.get(n) ?? { debeTDO: { oficial: 0, amigos: 0 }, debenTDO: { oficial: 0, amigos: 0 } };
    // TDO debe a la persona: cualquier gasto que adelantó de su bolsillo y aún
    // no se le ha reembolsado (liquidado). El estado del gasto (pagado al
    // proveedor o no) es indiferente para la deuda con la persona.
    for (const m of movimientos) {
      const persona = canonizarNombre(m.quien_lo_paga, responsables);
      if (!persona) continue;
      if (m.tipo !== "gasto" || m.liquidado) continue;
      const acc = get(persona);
      if (m.naturaleza === "amigos") acc.debeTDO.amigos += Number(m.importe);
      else acc.debeTDO.oficial += Number(m.importe);
      map.set(persona, acc);
    }
    // La persona debe a TDO (cobros que tiene sin entregar)
    for (const m of movimientos) {
      const persona = canonizarNombre(m.cobrado_por, responsables);
      if (!persona) continue;
      if (m.tipo !== "ingreso" || m.liquidado) continue;
      const acc = get(persona);
      if (m.naturaleza === "amigos") acc.debenTDO.amigos += Number(m.importe);
      else acc.debenTDO.oficial += Number(m.importe);
      map.set(persona, acc);
    }
    return Array.from(map.entries())
      .map(([nombre, v]) => {
        const debeTotal = v.debeTDO.oficial + v.debeTDO.amigos;
        const debenTotal = v.debenTDO.oficial + v.debenTDO.amigos;
        return {
          nombre,
          ...v,
          debeTotal,
          debenTotal,
          neto: debeTotal - debenTotal,
          esCaja: personasCaja.includes(nombre),
        };
      })
      // La caja al final: primero las cuentas pendientes de verdad.
      .sort((a, b) => Number(a.esCaja) - Number(b.esCaja) || Math.abs(b.neto) - Math.abs(a.neto));
  }, [movimientos, responsables, personasCaja]);
  const hayCuentasEquipo = cuentasEquipo.some((c) => c.debeTotal > 0 || c.debenTotal > 0);

  // Desglose de la deuda por acreedor (a quién se debe) para el donut. Se
  // agrupan importes por "a quién" y se ordenan de mayor a menor; a partir
  // del 7º se agrupan en "Otros" para no saturar la gráfica.
  const deudaPorAcreedor = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const m of deudas) {
      const k = aQuien(m);
      map.set(k, (map.get(k) ?? 0) + Number(m.importe));
    }
    const orden = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const top = orden.slice(0, 6);
    const resto = orden.slice(6);
    const segs = top.map(([label, value], i) => ({
      label,
      value,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
    if (resto.length) {
      segs.push({
        label: `Otros (${resto.length})`,
        value: resto.reduce((s, [, v]) => s + v, 0),
        color: "#B8AE9C",
      });
    }
    return segs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deudas, provNombre]);

  const selectCls =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] text-ink-secondary focus:border-sage-300 focus:outline-none";

  return (
    <div className="flex flex-col gap-4">
      {/* Deudas y cuentas con el equipo: al final para no estorbar arriba */}
      <div className="order-last flex flex-col gap-4">
      {/* Deudas / pendiente de pago (gastos sin pagar) */}
      {deudas.length > 0 && (
        <Card className="border-l-[3px] border-l-warn">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">
              Pendiente de pagar
              <span className="ml-2 text-[11px] font-medium text-ink-muted">
                {deudas.length} {deudas.length === 1 ? "deuda" : "deudas"}
              </span>
            </span>
            <span className="tabular font-display text-[18px] text-warn">{eur(totalDeuda)}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            {/* Donut: a quién se debe */}
            <div className="flex items-center gap-4 border-b border-border pb-3 md:flex-col md:items-center md:border-b-0 md:border-r md:pb-0 md:pr-4">
              <Donut
                segments={deudaPorAcreedor}
                centerLabel={`${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" }).format(Math.round(totalDeuda))} €`}
                centerSub="a pagar"
              />
              <ul className="space-y-1 text-[11.5px]">
                {deudaPorAcreedor.map((s) => (
                  <li key={s.label} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="max-w-[130px] truncate">{s.label}</span>
                    <span className="ml-auto pl-2 tabular text-ink-muted">{eur(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Lista de deudas (solo unas pocas por defecto para no saturar) */}
            <div className="space-y-0.5">
              {(verTodasDeudas ? deudas : deudas.slice(0, 5)).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[12.5px] hover:bg-beige-light"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{aQuien(m)}</span>
                    <span className="truncate text-[11px] text-ink-muted">
                      {m.concepto} · {fecha(m.fecha)}
                    </span>
                  </span>
                  {m.estado === "vencido" && <Badge tone="error">Vencido</Badge>}
                  <span
                    className={`tabular shrink-0 font-semibold ${m.estado === "vencido" ? "text-error" : "text-ink-secondary"}`}
                  >
                    {eur(Number(m.importe))}
                  </span>
                  <button
                    type="button"
                    onClick={() => pagar(m.id)}
                    disabled={pagando === m.id}
                    title="Marcar como pagado"
                    className="shrink-0 rounded-full border-hair border-ok/40 bg-ok-tint p-1 text-ok transition-colors hover:bg-ok hover:text-white disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                  <MovimientoDialog
                    clientes={clientes}
                    oportunidades={oportunidades}
                    proveedores={proveedores}
                    responsables={responsables}
                    planPorOportunidad={planPorOportunidad}
                    movimiento={m}
                    categoriasExtra={categoriasUsadas}
                  />
                </div>
              ))}
              {deudas.length > 5 && (
                <button
                  type="button"
                  onClick={() => setVerTodasDeudas((v) => !v)}
                  className="mt-1 flex items-center gap-1 px-2 text-[11.5px] font-semibold text-sage hover:text-sage-600"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${verTodasDeudas ? "rotate-180" : ""}`}
                  />
                  {verTodasDeudas ? "Ver menos" : `Ver todas (${deudas.length})`}
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Cuentas con el equipo: en los dos sentidos y por caja */}
      {hayCuentasEquipo && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Cuentas con el equipo
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
                  <th className="border-b border-border py-2 text-left font-semibold">Persona</th>
                  <th className="border-b border-border py-2 text-right font-semibold">TDO le debe</th>
                  <th className="border-b border-border py-2 text-right font-semibold">Le debe a TDO</th>
                  <th className="border-b border-border py-2 text-right font-semibold">Neto</th>
                </tr>
              </thead>
              <tbody>
                {cuentasEquipo.map((c) => (
                  <tr key={c.nombre}>
                    <td className="border-b border-[#f0eae1] py-2 font-medium">
                      <button onClick={() => setPersonaDetalle(c.nombre)} className="text-left text-sage hover:underline">
                        {c.nombre}
                      </button>
                      {c.esCaja && (
                        <span className="ml-1.5 rounded-pill bg-sage-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-sage">
                          🏦 caja
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[#f0eae1] py-2 text-right">
                      {c.debeTotal > 0 ? (
                        <span className="tabular">
                          {eur(c.debeTotal)}
                          <CajaDetalle oficial={c.debeTDO.oficial} amigos={c.debeTDO.amigos} />
                        </span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="border-b border-[#f0eae1] py-2 text-right">
                      {c.debenTotal > 0 ? (
                        <span className="tabular">
                          {eur(c.debenTotal)}
                          <CajaDetalle oficial={c.debenTDO.oficial} amigos={c.debenTDO.amigos} />
                        </span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className={`border-b border-[#f0eae1] py-2 text-right tabular font-semibold ${c.neto > 0.01 ? "text-warn" : c.neto < -0.01 ? "text-ok" : "text-ink-muted"}`}>
                      {c.esCaja
                        ? c.neto > 0.01
                          ? `ha puesto ${eur(c.neto)} (para la SL)`
                          : c.neto < -0.01
                            ? `balance a favor de TDO ${eur(-c.neto)}`
                            : "—"
                        : c.neto > 0.01
                          ? `TDO paga ${eur(c.neto)}`
                          : c.neto < -0.01
                            ? `${c.nombre.split(" ")[0]} paga ${eur(-c.neto)}`
                            : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            <b>TDO le debe</b>: gastos que la persona adelantó de su bolsillo (reembolso pendiente).{" "}
            <b>Le debe a TDO</b>: cobros que recibió en mano y aún no ha entregado a la caja. Cada
            importe indica su caja (🏦 oficial / 🤝 amigos). Pincha en una persona para ver su
            historial y saldar cada movimiento.
            {personasCaja.length > 0 && (
              <>
                {" "}
                <b>{personasCaja.join(" y ")}</b> actúa como caja de TDO (hasta que exista la SL):
                su fila es su balance como caja — lo que lleva puesto neto, que la SL le deberá —
                sin reembolsos ni entregas que marcar.
              </>
            )}
          </p>
        </Card>
      )}
      </div>

      {personaDetalle && (
        <PersonaDetalle
          persona={personaDetalle}
          movimientos={movimientos}
          responsables={responsables}
          esCaja={personasCaja.includes(personaDetalle)}
          onClose={() => setPersonaDetalle(null)}
          onDone={() => router.refresh()}
        />
      )}

      {/* Caja: los saldos y la lista se recalculan según la caja elegida */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["", "Todo"],
            ["oficial", "🏦 Caja oficial"],
            ["amigos", "🤝 Caja amigos"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setCaja(k)}
            className={`rounded-pill border-med px-[14px] py-[7px] text-[12px] transition-colors ${
              caja === k
                ? k === "amigos"
                  ? "border-clay bg-clay text-cream"
                  : "border-sage bg-sage text-cream"
                : "border-border bg-white text-ink-secondary hover:border-sage-300"
            }`}
          >
            {label}
          </button>
        ))}
        {caja === "amigos" && (
          <span className="text-[11.5px] text-ink-muted">
            Solo el dinero del circuito de amigos (sin factura, no computa en la oficial).
          </span>
        )}
      </div>

      {/* Resumen del filtro */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Ingresos{caja === "amigos" ? " (amigos)" : caja === "oficial" ? " (oficial)" : ""}
          </div>
          <div className="mt-1 font-display text-[20px] tabular text-ok">{eur(ingresos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Gastos{caja === "amigos" ? " (amigos)" : caja === "oficial" ? " (oficial)" : ""}
          </div>
          <div className="mt-1 font-display text-[20px] tabular text-error">{eur(gastos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Balance{caja === "amigos" ? " (amigos)" : caja === "oficial" ? " (oficial)" : ""}
          </div>
          <div className={`mt-1 font-display text-[20px] tabular ${ingresos - gastos >= 0 ? "text-sage" : "text-error"}`}>
            {eur(ingresos - gastos)}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar concepto, categoría, cliente…"
          className="min-w-[200px] flex-1 rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
        />
        <select value={mes} onChange={(e) => setMes(e.target.value)} className={selectCls}>
          <option value="">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{mesLabel(m)}</option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
          <option value="">Tipo</option>
          <option value="ingreso">Ingresos</option>
          <option value="gasto">Gastos</option>
        </select>
        <select value={naturaleza} onChange={(e) => setNaturaleza(e.target.value)} className={selectCls}>
          <option value="">Naturaleza</option>
          {NATURALEZAS_MOV.map((n) => (
            <option key={n} value={n}>{NATURALEZA_LABEL[n]}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
          <option value="">Estado</option>
          {ESTADOS_MOV.map((s) => (
            <option key={s} value={s}>{ESTADO_MOV_META[s].label}</option>
          ))}
        </select>
        <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className={selectCls}>
          <option value="">Etapa</option>
          <option value="nueva">Nueva etapa</option>
          <option value="cristina">Etapa Cristina</option>
        </select>
      </div>

      <div className="text-[12px] text-ink-muted">{visibles.length} movimientos</div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Fecha", "Concepto", "Naturaleza", "Enlace", "Estado", "Importe", ""].map((h) => (
                <th key={h} className="bg-beige-warm px-[14px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((m) => {
              return (
                <tr key={m.id} className="hover:bg-beige-light">
                  <td className="border-t border-border px-[14px] py-3 text-[12.5px] text-ink-secondary">{fecha(m.fecha)}</td>
                  <td className="border-t border-border px-[14px] py-3 text-[13px]">
                    {m.concepto}
                    {m.categoria && <span className="ml-2 text-[11px] text-ink-muted">{m.categoria}</span>}
                    {!m.computa_contabilidad && (
                      <span className="ml-2 rounded-xs bg-beige-warm px-1 text-[9.5px] uppercase text-ink-muted">no computa</span>
                    )}
                  </td>
                  <td className="border-t border-border px-[14px] py-3 text-[12px] text-ink-secondary">
                    {NATURALEZA_LABEL[m.naturaleza] ?? m.naturaleza}
                  </td>
                  <td className="border-t border-border px-[14px] py-3 text-[12px]">
                    {m.oportunidad_id && m.oportunidad ? (
                      <Link
                        href={`/oportunidades/${m.oportunidad_id}`}
                        className="inline-flex items-center gap-1 font-medium text-clay hover:text-clay-600 hover:underline"
                      >
                        {m.oportunidad.titulo}
                        <ExternalLink size={12} className="opacity-70" />
                      </Link>
                    ) : (
                      <span className="text-ink-muted">{m.cliente?.nombre ?? "—"}</span>
                    )}
                  </td>
                  <td className="border-t border-border px-[14px] py-3"><EstadoMovSelect mov={m} hoy={hoy} responsables={responsables} /></td>
                  <td className={`border-t border-border px-[14px] py-3 text-right text-[13px] tabular font-semibold ${m.tipo === "ingreso" ? "text-ok" : "text-error"}`}>
                    {m.tipo === "ingreso" ? "+" : "−"}{eur(Number(m.importe))}
                  </td>
                  <td className="border-t border-border px-[14px] py-3 text-right">
                    <span className="inline-flex items-center">
                      <MovimientoDialog clientes={clientes} oportunidades={oportunidades} proveedores={proveedores} responsables={responsables} planPorOportunidad={planPorOportunidad} movimiento={m} duplicar categoriasExtra={categoriasUsadas} />
                      <MovimientoDialog clientes={clientes} oportunidades={oportunidades} proveedores={proveedores} responsables={responsables} planPorOportunidad={planPorOportunidad} movimiento={m} categoriasExtra={categoriasUsadas} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="space-y-2 md:hidden">
        {visibles.map((m) => {
          return (
            <Card key={m.id} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[13px] font-semibold">{m.concepto}</div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {fecha(m.fecha)} · {NATURALEZA_LABEL[m.naturaleza] ?? m.naturaleza}
                  </div>
                </div>
                <span className={`tabular text-[14px] font-semibold ${m.tipo === "ingreso" ? "text-ok" : "text-error"}`}>
                  {m.tipo === "ingreso" ? "+" : "−"}{eur(Number(m.importe))}
                </span>
              </div>
              {m.oportunidad_id && m.oportunidad && (
                <Link
                  href={`/oportunidades/${m.oportunidad_id}`}
                  className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-clay hover:underline"
                >
                  Ver evento: {m.oportunidad.titulo}
                  <ExternalLink size={11} />
                </Link>
              )}
              <div className="mt-2 flex items-center justify-between">
                <EstadoMovSelect mov={m} hoy={hoy} responsables={responsables} />
                <span className="inline-flex items-center">
                  <MovimientoDialog clientes={clientes} oportunidades={oportunidades} proveedores={proveedores} responsables={responsables} planPorOportunidad={planPorOportunidad} movimiento={m} duplicar categoriasExtra={categoriasUsadas} />
                  <MovimientoDialog clientes={clientes} oportunidades={oportunidades} proveedores={proveedores} responsables={responsables} planPorOportunidad={planPorOportunidad} movimiento={m} categoriasExtra={categoriasUsadas} />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Detalle de una persona: historial de gastos que adelantó (reembolsos) y
// cobros que tiene en mano, con opción de saldar cada uno.
function PersonaDetalle({
  persona,
  movimientos,
  responsables,
  esCaja = false,
  onClose,
  onDone,
}: {
  persona: string;
  movimientos: Tesoreria[];
  responsables: string[];
  // La caja de TDO: se ve el historial y el balance, sin nada que marcar.
  esCaja?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  // Mismos criterios que la tabla: el nombre guardado se canoniza antes de
  // comparar, para que "Jero" y "Jero (Jerónimo Alonso Marcos)" no se separen.
  const reembolsos = movimientos.filter(
    (m) => m.tipo === "gasto" && canonizarNombre(m.quien_lo_paga, responsables) === persona,
  );
  const cobros = movimientos.filter(
    (m) => m.tipo === "ingreso" && canonizarNombre(m.cobrado_por, responsables) === persona,
  );
  const debePend = reembolsos.filter((m) => !m.liquidado);
  const debenPend = cobros.filter((m) => !m.liquidado);
  const debe = debePend.reduce((s, m) => s + Number(m.importe), 0);
  const deben = debenPend.reduce((s, m) => s + Number(m.importe), 0);
  const neto = debe - deben;
  const nombreCorto = persona.split(" ")[0];

  async function saldar(id: string, liquidado: boolean) {
    setBusy(id);
    try {
      await marcarMovimientoLiquidado(id, liquidado);
      onDone();
    } finally {
      setBusy(null);
    }
  }
  async function reembolsar(id: string, caja: "oficial" | "amigos") {
    setBusy(id);
    try {
      await reembolsarMovimiento(id, caja);
      onDone();
    } finally {
      setBusy(null);
    }
  }

  const fila = (m: Tesoreria, tipoLado: "reembolso" | "cobro") => (
    <div key={m.id} className="flex items-center justify-between gap-2 border-b border-[#f0eae1] py-2 text-[12.5px]">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {m.concepto}
          {m.naturaleza === "amigos" ? <span className="ml-1.5 text-[10px] font-semibold text-clay">🤝</span> : <span className="ml-1.5 text-[10px] text-ink-muted">🏦</span>}
        </div>
        <div className="text-[11px] text-ink-muted">{fecha(m.fecha)}{m.categoria ? ` · ${m.categoria}` : ""}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="tabular font-semibold">{eur(Number(m.importe))}</span>
        {/* La caja no tiene nada que marcar: es su propio dinero operando. */}
        {!esCaja &&
          (m.liquidado ? (
            <button onClick={() => saldar(m.id, false)} disabled={busy === m.id} className="rounded-sm bg-ok-tint px-2 py-1 text-[10.5px] font-semibold text-ok">
              {tipoLado === "reembolso" ? "reembolsado" : "entregado"} ✓
            </button>
          ) : tipoLado === "reembolso" ? (
            <span className="inline-flex items-center gap-1" title="Reembolsar desde…">
              <span className="text-[10px] text-ink-muted">reembolsar:</span>
              <button onClick={() => reembolsar(m.id, "oficial")} disabled={busy === m.id} className="rounded-sm border-med border-border-strong px-1.5 py-1 text-[11px] hover:bg-sage-tint" title="Desde la caja oficial">🏦</button>
              <button onClick={() => reembolsar(m.id, "amigos")} disabled={busy === m.id} className="rounded-sm border-med border-border-strong px-1.5 py-1 text-[11px] hover:bg-clay-tint" title="Desde la caja de amigos">🤝</button>
            </span>
          ) : (
            <button onClick={() => saldar(m.id, true)} disabled={busy === m.id} className="rounded-sm border-med border-border-strong px-2 py-1 text-[10.5px] font-semibold text-ink-secondary hover:bg-beige-warm">
              {busy === m.id ? "…" : "Marcar entregado"}
            </button>
          ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 p-4 pt-[6vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[560px] rounded-lg border-hair border-border bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between">
          <div className="font-display text-[18px]">
            {persona}
            {esCaja && (
              <span className="ml-2 rounded-pill bg-sage-tint px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.05em] text-sage">
                🏦 caja de TDO
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-sm px-2 py-1 text-[16px] leading-none text-ink-muted hover:bg-beige-warm">×</button>
        </div>

        {/* De dónde sale el neto: la resta explicada paso a paso */}
        <div className="mb-4 rounded-md border-hair border-border bg-beige-light/70 p-3">
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            De dónde sale el saldo
          </div>
          <div className="space-y-1 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">
                {esCaja ? "Ha puesto de su bolsillo" : "TDO le debe"}{" "}
                <span className="text-ink-muted">({debePend.length} gasto{debePend.length === 1 ? "" : "s"}{esCaja ? "" : " que adelantó"})</span>
              </span>
              <span className="tabular font-semibold text-warn">+{eur(debe)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">
                {esCaja ? "Ha cobrado en su cuenta" : "Le debe a TDO"}{" "}
                <span className="text-ink-muted">({debenPend.length} cobro{debenPend.length === 1 ? "" : "s"}{esCaja ? "" : " sin entregar"})</span>
              </span>
              <span className="tabular font-semibold text-ok">−{eur(deben)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5">
              <span className="font-semibold">
                {esCaja
                  ? Math.abs(neto) < 0.01
                    ? "En equilibrio"
                    : neto > 0
                      ? "Lleva puesto neto (la SL se lo deberá)"
                      : "Balance a favor de TDO"
                  : Math.abs(neto) < 0.01
                    ? "En paz"
                    : neto > 0
                      ? "TDO le paga a " + nombreCorto
                      : nombreCorto + " le entrega a TDO"}
              </span>
              <span className={`tabular font-display text-[16px] ${neto > 0.01 ? "text-warn" : neto < -0.01 ? "text-ok" : "text-ink-muted"}`}>
                {Math.abs(neto) < 0.01 ? "—" : eur(Math.abs(neto))}
              </span>
            </div>
          </div>
          {esCaja && (
            <p className="mt-2 text-[11px] text-ink-muted">
              {nombreCorto} actúa como caja de TDO hasta que exista la SL: aquí no hay nada que
              marcar, es el histórico de su dinero operando como TDO.
            </p>
          )}
        </div>

        {reembolsos.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {esCaja ? "Gastos que pagó (como caja)" : "Gastos que adelantó (TDO le debe)"}
            </div>
            {reembolsos.map((m) => fila(m, "reembolso"))}
          </div>
        )}
        {cobros.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {esCaja ? "Cobros en su cuenta (como caja)" : "Cobros en mano (le debe a TDO)"}
            </div>
            {cobros.map((m) => fila(m, "cobro"))}
          </div>
        )}
        {reembolsos.length === 0 && cobros.length === 0 && (
          <p className="py-3 text-center text-[12px] text-ink-muted">Sin movimientos con esta persona.</p>
        )}
      </div>
    </div>
  );
}

// Desglose por caja (🏦 oficial / 🤝 amigos) bajo un importe de las cuentas.
function CajaDetalle({ oficial, amigos }: { oficial: number; amigos: number }) {
  const partes: string[] = [];
  if (oficial > 0) partes.push(`🏦 ${eur(oficial)}`);
  if (amigos > 0) partes.push(`🤝 ${eur(amigos)}`);
  if (partes.length < 2) return null;
  return <span className="ml-1 block text-[10px] font-normal text-ink-muted">{partes.join(" · ")}</span>;
}

// Desplegable de estado del movimiento: cambia entre Previsto y Cobrado
// (ingresos) o Pagado (gastos). Si la fecha ya venció y sigue previsto, se
// muestra en rojo como "Vencido" automáticamente. Al dar por COBRADO un
// ingreso pregunta quién recibió el dinero (equipo o directo a la caja).
function EstadoMovSelect({ mov, hoy, responsables = [] }: { mov: Tesoreria; hoy: string; responsables?: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [preguntando, setPreguntando] = React.useState(false);
  const realizado = mov.tipo === "ingreso" ? "cobrado" : "pagado";
  const realizadoLabel = mov.tipo === "ingreso" ? "Cobrado" : "Pagado";
  // Si ya sabemos quién lo pagó/cobró, el movimiento está resuelto: nunca se
  // enseña como "Vencido" pidiendo que alguien lo vuelva a marcar.
  const conDueno =
    (mov.tipo === "gasto" && Boolean(mov.quien_lo_paga)) ||
    (mov.tipo === "ingreso" && Boolean(mov.cobrado_por));
  const vencida =
    mov.estado === "previsto" && !conDueno && Boolean(mov.fecha) && Boolean(hoy) && (mov.fecha as string) < hoy;
  const valor = mov.estado === realizado ? realizado : "previsto";
  const tono = vencida ? "error" : ESTADO_MOV_META[valor]?.tone ?? "neutral";
  const cls: Record<string, string> = {
    error: "border-error/40 bg-error-tint text-error",
    ok: "border-ok/40 bg-ok-tint text-ok",
    sage: "border-sage/40 bg-sage-tint text-sage",
    warn: "border-[#e7d3a6] bg-warn-tint text-[#7a5a1a]",
    neutral: "border-border bg-white text-ink-secondary",
  };

  async function set(v: string, cobradoPor?: string | null) {
    setBusy(true);
    try {
      await cambiarEstadoMovimiento(mov.id, v, cobradoPor);
      router.refresh();
    } finally {
      setBusy(false);
      setPreguntando(false);
    }
  }

  return (
    <>
      <select
        value={valor}
        disabled={busy}
        onChange={(e) => {
          // Cobrar un ingreso: primero se pregunta quién lo recibió.
          if (e.target.value === "cobrado" && mov.tipo === "ingreso" && responsables.length > 0) {
            setPreguntando(true);
          } else {
            set(e.target.value);
          }
        }}
        title={vencida ? "Vencido: la fecha ya pasó y sigue sin cobrarse/pagarse" : "Cambiar estado"}
        className={`cursor-pointer rounded-pill border-med px-2.5 py-1 text-[11.5px] font-semibold focus:outline-none disabled:opacity-60 ${cls[tono]}`}
      >
        <option value="previsto">{vencida ? "Vencido" : "Previsto"}</option>
        <option value={realizado}>{realizadoLabel}</option>
      </select>
      {preguntando && (
        <PersonaCajaModal
          titulo="Dar por cobrado"
          descripcion={`${mov.concepto} · ${eur(Number(mov.importe))}`}
          responsables={responsables}
          busy={busy}
          confirmLabel="Cobrado"
          onConfirm={({ persona }) => set("cobrado", persona)}
          onClose={() => setPreguntando(false)}
        />
      )}
    </>
  );
}
