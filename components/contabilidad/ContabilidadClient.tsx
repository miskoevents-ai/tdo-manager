"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Card, Overline } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { eur, num } from "@/lib/format";
import { NATURALEZA_LABEL } from "@/lib/estados";
import type { Tesoreria } from "@/lib/types";

const INICIO = "2026-06"; // La contabilidad arranca en junio 2026 (regla §5.4)
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

type Socio = { nombre: string; porcentaje: number };

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

export function ContabilidadClient({
  movimientos,
  socios,
}: {
  movimientos: Tesoreria[];
  socios: Socio[];
}) {
  // Solo lo que computa y desde junio 2026
  const contables = React.useMemo(
    () => movimientos.filter((m) => m.computa_contabilidad && m.fecha.slice(0, 7) >= INICIO),
    [movimientos],
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

      {/* KPIs del rango */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Ingresos cobrados" value={eur(stats.ingresosCobrados)} tone="text-ok" />
        <Kpi label="Gastos" value={eur(stats.gastos)} tone="text-error" />
        <Kpi
          label="Resultado"
          value={eur(stats.resultado)}
          tone={stats.resultado >= 0 ? "text-sage" : "text-error"}
        />
        <Kpi label="Previsto por cobrar" value={eur(stats.previsto)} tone="text-warn" />
      </div>

      {/* Tabla por mes */}
      <Card className="overflow-x-auto">
        <Overline>Por mes (desde junio 2026)</Overline>
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
                const s = statsDe(contables.filter((x) => x.fecha.slice(0, 7) === m));
                return (
                  <tr key={m}>
                    <td className="border-b border-[#f0eae1] py-2 font-medium">{mesLabel(m)}</td>
                    <td className="border-b border-[#f0eae1] py-2 text-right tabular text-ok">{eur(s.ingresosCobrados)}</td>
                    <td className="border-b border-[#f0eae1] py-2 text-right tabular text-error">{eur(s.gastos)}</td>
                    <td className={`border-b border-[#f0eae1] py-2 text-right tabular font-semibold ${s.resultado >= 0 ? "text-sage" : "text-error"}`}>{eur(s.resultado)}</td>
                    <td className="border-b border-[#f0eae1] py-2 text-right tabular text-warn">{eur(s.previsto)}</td>
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
        {/* Reparto por socio */}
        <Card>
          <Overline>Reparto del resultado por socio</Overline>
          <p className="mb-3 mt-1 text-[11.5px] text-ink-muted">Según el % de cada socio (editable en Equipo).</p>
          {socios.length === 0 && <p className="text-small text-ink-muted">No hay socios con % definido.</p>}
          {socios.map((s) => (
            <div key={s.nombre} className="flex items-center justify-between border-t border-border py-2 text-[13px] first:border-t-0">
              <span>{s.nombre} <span className="text-ink-muted">· {num(s.porcentaje, 0)}%</span></span>
              <span className={`tabular font-semibold ${stats.resultado >= 0 ? "text-sage" : "text-error"}`}>
                {eur((stats.resultado * s.porcentaje) / 100)}
              </span>
            </div>
          ))}
        </Card>

        {/* Desglose por naturaleza */}
        <Card>
          <Overline>Desglose por naturaleza</Overline>
          <div className="mt-2">
            {porNaturaleza.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-t border-border py-2 text-[13px] first:border-t-0">
                <span>{k}</span>
                <span className={`tabular font-semibold ${v >= 0 ? "text-ok" : "text-error"}`}>{eur(v)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Desglose por categoría */}
        <Card className="lg:col-span-2">
          <Overline>Desglose por categoría</Overline>
          <div className="mt-2 grid gap-x-8 md:grid-cols-2">
            {porCategoria.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-t border-border py-2 text-[13px]">
                <span>{k}</span>
                <span className={`tabular font-semibold ${v >= 0 ? "text-ok" : "text-error"}`}>{eur(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="p-4">
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
