"use client";

import * as React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { eur, num } from "@/lib/format";
import { ESTADO_META, ESTADOS_TODOS, TIPO_EVENTO_LABEL, CANAL_LABEL } from "@/lib/estados";

export type OpRow = {
  id: string;
  titulo: string;
  estado: string;
  contratada: boolean;
  tipoEvento: string;
  serie: string;
  canal: string | null;
  tipoOperacion: string;
  cliente: string | null;
  lugar: string | null;
  responsable: string | null;
  fecha: string | null;
  ym: string | null;
  total: number;
  cobrado: number;
  pendiente: number;
  gastos: number;
  margen: number;
  fianza: number;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
const selCls =
  "rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] text-ink-secondary focus:border-sage-300 focus:outline-none";

// Dimensiones para "agrupar por" y métricas seleccionables.
const DIMS: { k: keyof OpRow; label: string; fmt?: (v: string) => string }[] = [
  { k: "ym", label: "Mes", fmt: (v) => (v === "—" ? "Sin fecha" : mesLabel(v)) },
  { k: "canal", label: "Canal", fmt: (v) => CANAL_LABEL[v] ?? v },
  { k: "tipoEvento", label: "Tipo de evento", fmt: (v) => TIPO_EVENTO_LABEL[v] ?? v },
  { k: "serie", label: "Serie", fmt: (v) => (v === "evento" ? "Eventos" : "Alquileres") },
  { k: "estado", label: "Estado", fmt: (v) => ESTADO_META[v as keyof typeof ESTADO_META]?.label ?? v },
  { k: "tipoOperacion", label: "Operación", fmt: (v) => (v === "amigos_prestamo" ? "Amigos" : "Normal") },
  { k: "cliente", label: "Cliente" },
  { k: "lugar", label: "Lugar" },
  { k: "responsable", label: "Responsable" },
];

const METRICAS: { k: string; label: string; val: (r: OpRow) => number; money: boolean }[] = [
  { k: "facturacion", label: "Facturación", val: (r) => r.total, money: true },
  { k: "margen", label: "Margen de caja", val: (r) => r.margen, money: true },
  { k: "cobrado", label: "Cobrado", val: (r) => r.cobrado, money: true },
  { k: "pendiente", label: "Pendiente", val: (r) => r.pendiente, money: true },
  { k: "fianza", label: "Fianzas activas", val: (r) => r.fianza, money: true },
  { k: "num", label: "Nº oportunidades", val: () => 1, money: false },
];

export function CuadroMando({ rows }: { rows: OpRow[] }) {
  const [desde, setDesde] = React.useState("");
  const [hasta, setHasta] = React.useState("");
  const [tipoEvento, setTipoEvento] = React.useState("");
  const [canal, setCanal] = React.useState("");
  const [serie, setSerie] = React.useState("");
  const [operacion, setOperacion] = React.useState("");
  const [cliente, setCliente] = React.useState("");
  const [estados, setEstados] = React.useState<Set<string>>(new Set());
  const [importeMin, setImporteMin] = React.useState("");
  const [conFianza, setConFianza] = React.useState(false);
  const [conPendiente, setConPendiente] = React.useState(false);
  const [soloContratadas, setSoloContratadas] = React.useState(false);

  const [dimK, setDimK] = React.useState<keyof OpRow>("ym");
  const [metK, setMetK] = React.useState("facturacion");

  const canales = React.useMemo(() => uniq(rows.map((r) => r.canal)), [rows]);
  const clientes = React.useMemo(() => uniq(rows.map((r) => r.cliente)), [rows]);

  const filtradas = rows.filter((r) => {
    if (desde && (!r.ym || r.ym < desde)) return false;
    if (hasta && (!r.ym || r.ym > hasta)) return false;
    if (tipoEvento && r.tipoEvento !== tipoEvento) return false;
    if (canal && r.canal !== canal) return false;
    if (serie && r.serie !== serie) return false;
    if (operacion && r.tipoOperacion !== operacion) return false;
    if (cliente && r.cliente !== cliente) return false;
    if (estados.size && !estados.has(r.estado)) return false;
    if (importeMin && r.total < Number(importeMin)) return false;
    if (conFianza && r.fianza <= 0) return false;
    if (conPendiente && r.pendiente <= 0.01) return false;
    if (soloContratadas && !r.contratada) return false;
    return true;
  });

  const contratadas = filtradas.filter((r) => r.contratada);
  const facturacion = contratadas.reduce((s, r) => s + r.total, 0);
  const cobrado = contratadas.reduce((s, r) => s + r.cobrado, 0);
  const pendiente = contratadas.reduce((s, r) => s + r.pendiente, 0);
  const margen = contratadas.reduce((s, r) => s + r.margen, 0);
  const margenPct = facturacion > 0 ? (margen / facturacion) * 100 : 0;
  const ticket = contratadas.length ? facturacion / contratadas.length : 0;
  const conversion = filtradas.length ? (contratadas.length / filtradas.length) * 100 : 0;
  const fianzas = filtradas.reduce((s, r) => s + r.fianza, 0);
  const cobradoPct = facturacion > 0 ? (cobrado / facturacion) * 100 : 0;

  // --- Pivot dinámico: agrupar por dimensión × métrica ---
  const met = METRICAS.find((m) => m.k === metK)!;
  const dim = DIMS.find((d) => d.k === dimK)!;
  const baseFilas = met.k === "facturacion" || met.k === "margen" || met.k === "cobrado" || met.k === "pendiente" ? contratadas : filtradas;
  const pivot = React.useMemo(() => {
    const m = new Map<string, { valor: number; n: number }>();
    for (const r of baseFilas) {
      const raw = r[dim.k];
      const key = raw == null || raw === "" ? "—" : String(raw);
      const cur = m.get(key) ?? { valor: 0, n: 0 };
      cur.valor += met.val(r);
      cur.n += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries())
      .map(([k, v]) => ({ k, ...v }))
      .sort((a, b) => b.valor - a.valor);
  }, [baseFilas, dim, met]);
  const maxPivot = Math.max(1, ...pivot.map((p) => p.valor));
  const totalPivot = pivot.reduce((s, p) => s + p.valor, 0);
  const fmtMet = (v: number) => (met.money ? eur(v) : num(v, 0));

  // Top clientes y pipeline (fijos, siempre útiles)
  const topClientes = agruparObj(contratadas, (r) => r.cliente ?? "—")
    .map((g) => ({
      cliente: g.key,
      facturacion: g.rows.reduce((s, r) => s + r.total, 0),
      margen: g.rows.reduce((s, r) => s + r.margen, 0),
      n: g.rows.length,
    }))
    .sort((a, b) => b.facturacion - a.facturacion)
    .slice(0, 10);

  // Historial por meses (facturación) — clicable al mes en oportunidades.
  const porMes = React.useMemo(() => {
    const m = new Map<string, { valor: number; n: number }>();
    for (const r of contratadas) {
      const k = r.ym ?? "—";
      const cur = m.get(k) ?? { valor: 0, n: 0 };
      cur.valor += r.total;
      cur.n += 1;
      m.set(k, cur);
    }
    return Array.from(m.entries()).map(([k, v]) => ({ k, ...v })).sort((a, b) => (a.k < b.k ? -1 : 1));
  }, [contratadas]);
  const maxMes = Math.max(1, ...porMes.map((p) => p.valor));

  // Reparto por tipo de servicio (boda / alquiler / corporativo…) en %.
  const porServicio = React.useMemo(() => {
    const m = new Map<string, { valor: number; n: number }>();
    for (const r of contratadas) {
      const cur = m.get(r.tipoEvento) ?? { valor: 0, n: 0 };
      cur.valor += r.total;
      cur.n += 1;
      m.set(r.tipoEvento, cur);
    }
    return Array.from(m.entries()).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.valor - a.valor);
  }, [contratadas]);
  const totalServicio = porServicio.reduce((s, p) => s + p.valor, 0);

  function exportCSV() {
    const head = ["titulo", "estado", "tipo_evento", "serie", "canal", "cliente", "lugar", "fecha", "total", "cobrado", "pendiente", "margen", "fianza"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = filtradas.map((r) =>
      [r.titulo, r.estado, r.tipoEvento, r.serie, r.canal, r.cliente, r.lugar, r.fecha, r.total, r.cobrado, r.pendiente, r.margen, r.fianza].map(esc).join(";"),
    );
    const csv = [head.join(";"), ...body].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cuadro_mando.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Presets de fecha
  function preset(p: string) {
    if (p === "etapa") { setDesde("2026-06"); setHasta(""); }
    else if (p === "2026") { setDesde("2026-01"); setHasta("2026-12"); }
    else if (p === "todo") { setDesde(""); setHasta(""); }
  }
  function limpiar() {
    setDesde(""); setHasta(""); setTipoEvento(""); setCanal(""); setSerie("");
    setOperacion(""); setCliente(""); setEstados(new Set()); setImporteMin("");
    setConFianza(false); setConPendiente(false); setSoloContratadas(false);
  }
  const toggleEstado = (e: string) =>
    setEstados((prev) => {
      const n = new Set(prev);
      n.has(e) ? n.delete(e) : n.add(e);
      return n;
    });

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <Card className="!p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Rápido:</span>
          <Chip onClick={() => preset("etapa")}>Nueva etapa (jun 26+)</Chip>
          <Chip onClick={() => preset("2026")}>Año 2026</Chip>
          <Chip onClick={() => preset("todo")}>Todo</Chip>
          <button onClick={exportCSV} className="ml-auto inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-3 py-1.5 text-[12px] font-semibold text-ink-secondary hover:bg-beige-warm">
            <Download size={13} /> Exportar CSV
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Desde (mes)"><input type="month" value={desde} onChange={(e) => setDesde(e.target.value)} className={selCls} /></Campo>
          <Campo label="Hasta (mes)"><input type="month" value={hasta} onChange={(e) => setHasta(e.target.value)} className={selCls} /></Campo>
          <Campo label="Tipo de evento">
            <select value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)} className={selCls}>
              <option value="">Todos</option>
              {Object.entries(TIPO_EVENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Campo>
          <Campo label="Canal">
            <select value={canal} onChange={(e) => setCanal(e.target.value)} className={selCls}>
              <option value="">Todos</option>
              {canales.map((c) => <option key={c} value={c}>{CANAL_LABEL[c] ?? c}</option>)}
            </select>
          </Campo>
          <Campo label="Serie">
            <select value={serie} onChange={(e) => setSerie(e.target.value)} className={selCls}>
              <option value="">Todas</option>
              <option value="evento">Eventos</option>
              <option value="alquiler_encargo">Alquileres</option>
            </select>
          </Campo>
          <Campo label="Operación">
            <select value={operacion} onChange={(e) => setOperacion(e.target.value)} className={selCls}>
              <option value="">Todas</option>
              <option value="normal">Normal</option>
              <option value="amigos_prestamo">Amigos</option>
            </select>
          </Campo>
          <Campo label="Cliente">
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={selCls}>
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Importe mínimo €">
            <input type="number" value={importeMin} onChange={(e) => setImporteMin(e.target.value)} placeholder="0" className={`${selCls} w-[110px]`} />
          </Campo>
        </div>
        {/* Estados multi + toggles */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {ESTADOS_TODOS.map((e) => (
            <button
              key={e}
              onClick={() => toggleEstado(e)}
              className={`rounded-pill border-hair px-2.5 py-1 text-[11px] transition-colors ${
                estados.has(e) ? "border-transparent bg-sage text-cream" : "border-border bg-white text-ink-secondary hover:border-sage-300"
              }`}
            >
              {ESTADO_META[e].label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12.5px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={soloContratadas} onChange={(e) => setSoloContratadas(e.target.checked)} className="h-4 w-4 accent-sage" /> Solo contratadas</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={conFianza} onChange={(e) => setConFianza(e.target.checked)} className="h-4 w-4 accent-sage" /> Con fianza</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={conPendiente} onChange={(e) => setConPendiente(e.target.checked)} className="h-4 w-4 accent-sage" /> Con pendiente de cobro</label>
          <button onClick={limpiar} className="rounded-sm border-med border-border-strong px-3 py-1.5 text-[12px] text-ink-secondary hover:bg-beige-warm">Limpiar filtros</button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Facturación contratada" value={eur(facturacion)} tone="text-sage" />
        <Kpi label="Margen de caja" value={eur(margen)} sub={`${num(margenPct, 0)}%`} tone={margen >= 0 ? "text-ok" : "text-error"} />
        <Kpi label="Cobrado" value={eur(cobrado)} sub={`${num(cobradoPct, 0)}% de lo facturado`} tone="text-ok" />
        <Kpi label="Pendiente de cobro" value={eur(pendiente)} tone="text-error" />
        <Kpi label="Ticket medio" value={eur(ticket)} tone="text-clay" />
        <Kpi label="Conversión" value={`${num(conversion, 0)}%`} sub={`${contratadas.length}/${filtradas.length} oportunidades`} tone="text-sage" />
        <Kpi label="Fianzas activas" value={eur(fianzas)} tone="text-warn" />
        <Kpi label="Nº oportunidades" value={String(filtradas.length)} sub={`${contratadas.length} contratadas`} tone="text-ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Historial por meses (clicable) */}
        <Card>
          <SecTitle>Historial por meses</SecTitle>
          <p className="mt-1 text-[11px] text-ink-muted">Facturación contratada. Pincha un mes para ver sus oportunidades.</p>
          {porMes.length === 0 ? (
            <Vacio />
          ) : (
            <div className="mt-3 space-y-2">
              {porMes.map((p) => {
                const href = drillHref("ym", p.k);
                const fila = (
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-[11.5px] text-ink-muted">{p.k === "—" ? "Sin fecha" : mesLabel(p.k)}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-sm bg-beige-warm">
                      <div className="h-full rounded-sm bg-sage" style={{ width: `${(p.valor / maxMes) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[12px] tabular font-semibold">{eur(p.valor)}</span>
                  </div>
                );
                return href ? (
                  <Link key={p.k} href={href} className="block rounded-sm hover:bg-beige-warm/60">{fila}</Link>
                ) : (
                  <div key={p.k}>{fila}</div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Reparto por tipo de servicio (%) (clicable) */}
        <Card>
          <SecTitle>Reparto por tipo de servicio</SecTitle>
          <p className="mt-1 text-[11px] text-ink-muted">% de facturación. Pincha un tipo para ver sus oportunidades.</p>
          {porServicio.length === 0 ? (
            <Vacio />
          ) : (
            <div className="mt-3 space-y-2">
              {porServicio.map((p) => {
                const pctv = totalServicio > 0 ? (p.valor / totalServicio) * 100 : 0;
                const href = drillHref("tipoEvento", p.k);
                const fila = (
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-[12px] text-ink-secondary">{TIPO_EVENTO_LABEL[p.k] ?? p.k}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-sm bg-beige-warm">
                      <div className="h-full rounded-sm bg-clay" style={{ width: `${pctv}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[12px] tabular font-semibold">{Math.round(pctv)}%</span>
                    <span className="w-20 shrink-0 text-right text-[11px] tabular text-ink-muted">{eur(p.valor)}</span>
                  </div>
                );
                return href ? (
                  <Link key={p.k} href={href} className="block rounded-sm hover:bg-beige-warm/60">{fila}</Link>
                ) : (
                  <div key={p.k}>{fila}</div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Pivot dinámico */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecTitle>Análisis flexible</SecTitle>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-ink-muted">Agrupar por</span>
            <select value={String(dimK)} onChange={(e) => setDimK(e.target.value as keyof OpRow)} className={selCls}>
              {DIMS.map((d) => <option key={String(d.k)} value={String(d.k)}>{d.label}</option>)}
            </select>
            <span className="text-ink-muted">Métrica</span>
            <select value={metK} onChange={(e) => setMetK(e.target.value)} className={selCls}>
              {METRICAS.map((m) => <option key={m.k} value={m.k}>{m.label}</option>)}
            </select>
          </div>
        </div>
        {pivot.length === 0 ? (
          <Vacio />
        ) : (
          <div className="mt-4 space-y-2">
            {pivot.map((p) => {
              const href = drillHref(dim.k, p.k);
              const fila = (
                <div className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-[12px] text-ink-secondary" title={p.k}>{dim.fmt ? dim.fmt(p.k) : p.k}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-beige-warm">
                    <div className="h-full rounded-sm bg-sage" style={{ width: `${(p.valor / maxPivot) * 100}%` }} />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[11px] text-ink-muted">{p.n}</span>
                  <span className="w-24 shrink-0 text-right text-[12px] tabular font-semibold">{fmtMet(p.valor)}</span>
                  <span className="w-12 shrink-0 text-right text-[11px] text-ink-muted">{totalPivot > 0 ? `${Math.round((p.valor / totalPivot) * 100)}%` : ""}</span>
                </div>
              );
              return href ? (
                <Link key={p.k} href={href} className="block rounded-sm hover:bg-beige-warm/60">{fila}</Link>
              ) : (
                <div key={p.k}>{fila}</div>
              );
            })}
            <div className="flex items-center gap-3 border-t border-border pt-2">
              <span className="w-32 shrink-0 text-[12px] font-semibold">Total</span>
              <span className="flex-1" />
              <span className="w-12 shrink-0 text-right text-[11px] text-ink-muted">{baseFilas.length}</span>
              <span className="w-24 shrink-0 text-right text-[12.5px] tabular font-bold text-sage">{fmtMet(totalPivot)}</span>
              <span className="w-12 shrink-0" />
            </div>
          </div>
        )}
      </Card>

      {/* Top clientes */}
      <Card>
        <SecTitle>Top clientes (contratadas en el filtro)</SecTitle>
        <Tabla headers={["Cliente", "Nº", "Margen", "Facturación"]}>
          {topClientes.length === 0 && <FilaVacia n={4} />}
          {topClientes.map((c) => (
            <tr key={c.cliente}>
              <Td>{c.cliente}</Td>
              <Td right>{c.n}</Td>
              <Td right>{eur(c.margen)}</Td>
              <Td right bold>{eur(c.facturacion)}</Td>
            </tr>
          ))}
        </Tabla>
      </Card>

      <p className="text-[11px] text-ink-muted">
        {filtradas.length} oportunidades en el filtro · {contratadas.length} contratadas ·{" "}
        <Link href="/oportunidades" className="text-sage hover:underline">ver oportunidades</Link>
      </p>
    </div>
  );
}

// ---------- helpers ----------
// Enlace de drill-down a la lista de oportunidades filtrada, según la dimensión.
function drillHref(dimK: keyof OpRow, value: string): string | null {
  if (!value || value === "—") return null;
  if (dimK === "tipoEvento") return `/oportunidades?tipoEvento=${encodeURIComponent(value)}`;
  if (dimK === "serie") return `/oportunidades?serie=${encodeURIComponent(value)}`;
  if (dimK === "tipoOperacion") return `/oportunidades?operacion=${encodeURIComponent(value)}`;
  if (dimK === "ym") return `/oportunidades?mes=${encodeURIComponent(value)}`;
  return null;
}
function uniq(arr: (string | null)[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))) as string[];
}
function agruparObj(rows: OpRow[], key: (r: OpRow) => string): { key: string; rows: OpRow[] }[] {
  const m = new Map<string, OpRow[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return Array.from(m.entries()).map(([key, rows]) => ({ key, rows }));
}

// ---------- subcomponentes ----------
function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-pill border-hair border-sage-tint-deep bg-sage-tint/50 px-3 py-1 text-[11.5px] font-medium text-sage hover:bg-sage-tint">
      {children}
    </button>
  );
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-[0.08em] text-ink-muted">{label}</label>
      {children}
    </div>
  );
}
function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[21px] tabular ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-ink-muted">{sub}</div>}
    </Card>
  );
}
function SecTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">{children}</div>;
}
function Tabla({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.08em] text-ink-secondary">
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
function FilaVacia({ n }: { n: number }) {
  return <tr><td colSpan={n} className="py-4 text-center text-[12px] text-ink-muted">Sin datos en este filtro.</td></tr>;
}
function Vacio() {
  return <p className="py-4 text-center text-[12px] text-ink-muted">Sin datos en este filtro.</p>;
}
