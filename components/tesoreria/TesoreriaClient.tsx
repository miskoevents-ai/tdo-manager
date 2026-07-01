"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MovimientoDialog } from "@/components/tesoreria/MovimientoDialog";
import { eur, fecha } from "@/lib/format";
import {
  NATURALEZA_LABEL,
  NATURALEZAS_MOV,
  ESTADOS_MOV,
  ESTADO_MOV_META,
  etapaDeFecha,
} from "@/lib/estados";
import type { Cliente, Oportunidad, Tesoreria } from "@/lib/types";

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
}: {
  movimientos: Tesoreria[];
  clientes: Cliente[];
  oportunidades: Pick<Oportunidad, "id" | "numero" | "titulo">[];
}) {
  const [q, setQ] = React.useState("");
  const [mes, setMes] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  const [naturaleza, setNaturaleza] = React.useState("");
  const [estado, setEstado] = React.useState("");
  const [etapa, setEtapa] = React.useState("");

  const meses = React.useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [movimientos]);

  const visibles = movimientos.filter((m) => {
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

  const selectCls =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] text-ink-secondary focus:border-sage-300 focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Resumen del filtro */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Ingresos</div>
          <div className="mt-1 font-display text-[20px] tabular text-ok">{eur(ingresos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Gastos</div>
          <div className="mt-1 font-display text-[20px] tabular text-error">{eur(gastos)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Balance</div>
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
              const em = ESTADO_MOV_META[m.estado] ?? { label: m.estado, tone: "neutral" as const };
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
                  <td className="border-t border-border px-[14px] py-3"><Badge tone={em.tone}>{em.label}</Badge></td>
                  <td className={`border-t border-border px-[14px] py-3 text-right text-[13px] tabular font-semibold ${m.tipo === "ingreso" ? "text-ok" : "text-error"}`}>
                    {m.tipo === "ingreso" ? "+" : "−"}{eur(Number(m.importe))}
                  </td>
                  <td className="border-t border-border px-[14px] py-3 text-right">
                    <MovimientoDialog clientes={clientes} oportunidades={oportunidades} movimiento={m} />
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
          const em = ESTADO_MOV_META[m.estado] ?? { label: m.estado, tone: "neutral" as const };
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
                <Badge tone={em.tone}>{em.label}</Badge>
                <MovimientoDialog clientes={clientes} oportunidades={oportunidades} movimiento={m} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
