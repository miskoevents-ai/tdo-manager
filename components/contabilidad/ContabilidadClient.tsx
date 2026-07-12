"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { eur } from "@/lib/format";
import { NATURALEZA_LABEL } from "@/lib/estados";
import type { Tesoreria } from "@/lib/types";

const esCobrado = (m: Tesoreria) => m.tipo === "ingreso" && m.estado === "cobrado";
const esGasto = (m: Tesoreria) => m.tipo === "gasto";
const esPrevisto = (m: Tesoreria) => m.tipo === "ingreso" && m.estado === "previsto";
const totalConSigno = (movs: Tesoreria[]) =>
  movs.reduce((s, m) => s + (m.tipo === "ingreso" ? 1 : -1) * Number(m.importe), 0);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

function statsDe(movs: Tesoreria[]) {
  const ing = (m: Tesoreria) => m.tipo === "ingreso";
  const gas = (m: Tesoreria) => m.tipo === "gasto";
  const cobrado = (m: Tesoreria) => m.estado === "cobrado";
  const previsto = (m: Tesoreria) => m.estado === "previsto";
  const suma = (f: (m: Tesoreria) => boolean) =>
    movs.filter(f).reduce((s, m) => s + Number(m.importe), 0);
  const ingresosCobrados = suma((m) => ing(m) && cobrado(m));
  const gastos = suma(gas);
  return {
    ingresosCobrados,
    gastos,
    resultado: ingresosCobrados - gastos,
    previsto: suma((m) => ing(m) && previsto(m)),
  };
}

type Vista = "oficial" | "amigos" | "global";

const VISTAS: { key: Vista; label: string; desc: string }[] = [
  {
    key: "global",
    label: "Global",
    desc: "Todo el dinero real: oficial + amigos + comisiones pagadas (restan). La inversión se muestra aparte.",
  },
  { key: "oficial", label: "Oficial", desc: "Solo facturas propias cobradas y gastos oficiales (regla §5.4): lo declarable." },
  { key: "amigos", label: "Amigos", desc: "Aportaciones y gastos de préstamos a amigos, sin factura." },
];

export function ContabilidadClient({
  movimientos,
  inicio,
}: {
  movimientos: Tesoreria[];
  inicio?: string;
}) {
  // Mes de arranque de la contabilidad (configurable en ajustes).
  const INICIO = inicio && /^\d{4}-\d{2}$/.test(inicio) ? inicio : "2026-05";
  // Tres vistas: global por defecto (la foto real), luego oficial (§5.4) y amigos.
  const [vista, setVista] = React.useState<Vista>("global");
  const contables = React.useMemo(
    () =>
      movimientos.filter((m) => {
        if (m.fecha.slice(0, 7) < INICIO) return false;
        const esAmigos = m.naturaleza === "amigos";
        if (vista === "oficial") return m.computa_contabilidad && !esAmigos;
        if (vista === "amigos") return esAmigos;
        // Global = todo el dinero real: oficial + amigos + comisiones + la
        // inversión (para saber cómo vamos de verdad). Fuera solo los ajustes
        // internos ('otro': reembolsos/traspasos, que duplicarían).
        return (
          m.computa_contabilidad ||
          esAmigos ||
          m.naturaleza === "comision" ||
          m.naturaleza === "inversion"
        );
      }),
    [movimientos, vista],
  );
  const meses = React.useMemo(() => {
    const set = new Set(contables.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort();
  }, [contables]);

  const [desde, setDesde] = React.useState(meses[0] ?? INICIO);
  const [hasta, setHasta] = React.useState(meses[meses.length - 1] ?? INICIO);

  const enRango = contables.filter((m) => {
    const ym = m.fecha.slice(0, 7);
    return ym >= desde && ym <= hasta;
  });
  const stats = statsDe(enRango);

  // Desglose por naturaleza y categoría (dentro del rango)
  const porNaturaleza = agrupa(enRango, (m) => NATURALEZA_LABEL[m.naturaleza] ?? m.naturaleza);
  const porCategoria = agrupa(enRango, (m) => m.categoria ?? "Sin categoría");

  // Detalle: al pinchar una cifra, mostramos los movimientos que la componen.
  const [detalle, setDetalle] = React.useState<{ titulo: string; movs: Tesoreria[] } | null>(null);
  const abrir = (titulo: string, movs: Tesoreria[]) => setDetalle({ titulo, movs });

  // Inversión acumulada hasta el final del rango: es capital, no gasto del mes,
  // así que va fuera del resultado y se enseña como línea aparte en Global.
  const movsInversion = React.useMemo(
    () =>
      movimientos.filter(
        (m) => m.naturaleza === "inversion" && m.fecha.slice(0, 7) >= INICIO && m.fecha.slice(0, 7) <= hasta,
      ),
    [movimientos, hasta, INICIO],
  );
  const inversionAcum = totalConSigno(movsInversion);

  function exportarCSV() {
    const head = ["fecha", "concepto", "tipo", "naturaleza", "categoria", "importe", "estado"];
    const rows = enRango.map((m) => [
      m.fecha,
      (m.concepto ?? "").replace(/;/g, ","),
      m.tipo,
      m.naturaleza,
      (m.categoria ?? "").replace(/;/g, ","),
      (m.tipo === "gasto" ? "-" : "") + Number(m.importe).toFixed(2),
      m.estado,
    ]);
    const csv = [head, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contabilidad_${desde}_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none";

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Vista: oficial / amigos / global */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          {VISTAS.map((v) => (
            <button
              key={v.key}
              onClick={() => setVista(v.key)}
              className={`rounded-pill border-med px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
                vista === v.key
                  ? v.key === "amigos"
                    ? "border-transparent bg-clay text-cream"
                    : "border-transparent bg-sage text-cream"
                  : "border-border bg-white text-ink-secondary hover:border-sage-300"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-ink-muted">{VISTAS.find((v) => v.key === vista)?.desc}</p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Desde</label>
            <select value={desde} onChange={(e) => setDesde(e.target.value)} className={selectCls}>
              {meses.map((m) => (
                <option key={m} value={m}>{mesLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">Hasta</label>
            <select value={hasta} onChange={(e) => setHasta(e.target.value)} className={selectCls}>
              {meses.map((m) => (
                <option key={m} value={m}>{mesLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} /> PDF
          </Button>
        </div>
      </div>

      {/* KPIs del rango (pinchables → detalle) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Ingresos cobrados"
          value={eur(stats.ingresosCobrados)}
          tone="text-ok"
          onClick={() => abrir("Ingresos cobrados", enRango.filter(esCobrado))}
        />
        <Kpi
          label="Gastos"
          value={eur(stats.gastos)}
          tone="text-error"
          onClick={() => abrir("Gastos", enRango.filter(esGasto))}
        />
        <Kpi
          label="Resultado"
          value={eur(stats.resultado)}
          tone={stats.resultado >= 0 ? "text-sage" : "text-error"}
          onClick={() => abrir("Resultado (ingresos cobrados y gastos)", enRango.filter((m) => esCobrado(m) || esGasto(m)))}
        />
        <Kpi
          label="Previsto por cobrar"
          value={eur(stats.previsto)}
          tone="text-warn"
          onClick={() => abrir("Previsto por cobrar", enRango.filter(esPrevisto))}
        />
      </div>

      {/* Inversión: incluida en el resultado; se señala cuánto es (solo Global) */}
      {vista === "global" && movsInversion.length > 0 && (
        <button
          onClick={() => abrir("Inversión inicial (incluida en el resultado)", movsInversion)}
          className="flex w-full items-center justify-between rounded-md border-hair border-border bg-beige-light px-4 py-2.5 text-left text-[12.5px] hover:bg-beige-warm/70"
        >
          <span>
            💼 <b>Incluye inversión inicial</b>{" "}
            <span className="text-ink-muted">
              (compra del negocio, ya contada en el resultado · hasta {mesLabel(hasta)})
            </span>
          </span>
          <span className="tabular font-semibold text-clay-600">{eur(inversionAcum)}</span>
        </button>
      )}

      {/* Tabla por mes */}
      <Card className="overflow-x-auto">
        <Overline>Por mes (desde {mesLabel(INICIO)})</Overline>
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border py-2 text-left font-semibold">Mes</th>
              <th className="border-b border-border py-2 text-right font-semibold">Ing. cobrados</th>
              <th className="border-b border-border py-2 text-right font-semibold">Gastos</th>
              <th className="border-b border-border py-2 text-right font-semibold">Resultado</th>
              <th className="border-b border-border py-2 text-right font-semibold">Previsto</th>
            </tr>
          </thead>
          <tbody>
            {meses
              .filter((m) => m >= desde && m <= hasta)
              .map((m) => {
                const mm = contables.filter((x) => x.fecha.slice(0, 7) === m);
                const s = statsDe(mm);
                const lbl = mesLabel(m);
                const cel = "cursor-pointer hover:bg-beige-warm/60";
                return (
                  <tr key={m}>
                    <td
                      className={`border-b border-[#f0eae1] py-2 font-medium ${cel}`}
                      onClick={() => abrir(`${lbl} · todos`, mm)}
                    >
                      {lbl}
                    </td>
                    <td
                      className={`border-b border-[#f0eae1] py-2 text-right tabular text-ok ${cel}`}
                      onClick={() => abrir(`${lbl} · ingresos cobrados`, mm.filter(esCobrado))}
                    >
                      {eur(s.ingresosCobrados)}
                    </td>
                    <td
                      className={`border-b border-[#f0eae1] py-2 text-right tabular text-error ${cel}`}
                      onClick={() => abrir(`${lbl} · gastos`, mm.filter(esGasto))}
                    >
                      {eur(s.gastos)}
                    </td>
                    <td
                      className={`border-b border-[#f0eae1] py-2 text-right tabular font-semibold ${s.resultado >= 0 ? "text-sage" : "text-error"} ${cel}`}
                      onClick={() => abrir(`${lbl} · resultado`, mm.filter((x) => esCobrado(x) || esGasto(x)))}
                    >
                      {eur(s.resultado)}
                    </td>
                    <td
                      className={`border-b border-[#f0eae1] py-2 text-right tabular text-warn ${cel}`}
                      onClick={() => abrir(`${lbl} · previsto por cobrar`, mm.filter(esPrevisto))}
                    >
                      {eur(s.previsto)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
          <tfoot>
            <tr className="font-display">
              <td className="py-2 font-semibold">Total</td>
              <td className="py-2 text-right tabular text-ok">{eur(stats.ingresosCobrados)}</td>
              <td className="py-2 text-right tabular text-error">{eur(stats.gastos)}</td>
              <td className={`py-2 text-right tabular ${stats.resultado >= 0 ? "text-sage" : "text-error"}`}>{eur(stats.resultado)}</td>
              <td className="py-2 text-right tabular text-warn">{eur(stats.previsto)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Desglose por naturaleza */}
        <Card>
          <Overline>Desglose por naturaleza</Overline>
          <div className="mt-2">
            {porNaturaleza.map(([k, v]) => (
              <button
                key={k}
                onClick={() => abrir(k, enRango.filter((m) => (NATURALEZA_LABEL[m.naturaleza] ?? m.naturaleza) === k))}
                className="flex w-full items-center justify-between border-t border-border py-2 text-left text-[13px] first:border-t-0 hover:bg-beige-warm/60"
              >
                <span>{k}</span>
                <span className={`tabular font-semibold ${v >= 0 ? "text-ok" : "text-error"}`}>{eur(v)}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Desglose por categoría */}
        <Card>
          <Overline>Desglose por categoría</Overline>
          <div className="mt-2">
            {porCategoria.map(([k, v]) => (
              <button
                key={k}
                onClick={() => abrir(k, enRango.filter((m) => (m.categoria ?? "Sin categoría") === k))}
                className="flex w-full items-center justify-between border-t border-border py-2 text-left text-[13px] first:border-t-0 hover:bg-beige-warm/60"
              >
                <span>{k}</span>
                <span className={`tabular font-semibold ${v >= 0 ? "text-ok" : "text-error"}`}>{eur(v)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Detalle de movimientos al pinchar cualquier cifra */}
      <Dialog open={detalle !== null} onOpenChange={(o) => { if (!o) setDetalle(null); }}>
        {detalle && (
          <DialogContent title={detalle.titulo}>
            {detalle.movs.length === 0 ? (
              <p className="text-small text-ink-muted">No hay movimientos en este apartado.</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <tbody>
                    {detalle.movs
                      .slice()
                      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
                      .map((m) => (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap border-b border-[#f0eae1] py-1.5 pr-2 tabular text-ink-muted">
                            {m.fecha.slice(8, 10)}/{m.fecha.slice(5, 7)}
                          </td>
                          <td className="border-b border-[#f0eae1] py-1.5 pr-2">
                            <div>{m.concepto}</div>
                            {(m.cliente?.nombre || m.oportunidad?.titulo) && (
                              <div className="text-[11px] text-ink-secondary">
                                {[m.cliente?.nombre, m.oportunidad?.titulo].filter(Boolean).join(" · ")}
                              </div>
                            )}
                            <span className="text-[10.5px] text-ink-muted">
                              {m.naturaleza === "amigos" ? "🤝 amigos" : "🏦 oficial"} · {m.estado}
                              {m.categoria ? ` · ${m.categoria}` : ""}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap border-b border-[#f0eae1] py-1.5 text-right tabular font-semibold ${m.tipo === "ingreso" ? "text-ok" : "text-error"}`}>
                            {m.tipo === "gasto" ? "−" : "+"}{eur(Number(m.importe))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-display">
                      <td colSpan={2} className="py-2 font-semibold">Total · {detalle.movs.length} mov.</td>
                      <td className={`py-2 text-right tabular font-semibold ${totalConSigno(detalle.movs) >= 0 ? "text-sage" : "text-error"}`}>
                        {eur(totalConSigno(detalle.movs))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  tone: string;
  onClick?: () => void;
}) {
  const bar = tone.replace("text-", "bg-");
  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden p-4 pl-[18px] ${onClick ? "cursor-pointer transition-shadow hover:shadow-md" : ""}`}
    >
      <span className={`absolute left-0 top-0 h-full w-[3px] ${bar}`} />
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[24px] tabular ${tone}`}>{value}</div>
    </Card>
  );
}

// Agrupa importes con signo (ingreso +, gasto −) por una clave.
function agrupa(movs: Tesoreria[], key: (m: Tesoreria) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const m of movs) {
    const v = (m.tipo === "ingreso" ? 1 : -1) * Number(m.importe);
    map.set(key(m), (map.get(key(m)) ?? 0) + v);
  }
  return Array.from(map.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}
