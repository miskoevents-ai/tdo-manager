"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GastoFijoDialog } from "@/components/gastos/GastoFijoDialog";
import { eur } from "@/lib/format";
import { CATEGORIA_GASTO_MAP } from "@/lib/categorias-gastos";
import type { GastoFijo } from "@/lib/types";

const PERIOD_LABEL: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

const MESES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function mesCorto(iso: string) {
  const [y, m] = iso.split("-");
  return `${MESES3[Number(m) - 1] ?? m} ${y}`;
}
function vigencia(g: GastoFijo): string | null {
  if (g.desde && g.hasta) return `${mesCorto(g.desde)} → ${mesCorto(g.hasta)}`;
  if (g.desde) return `desde ${mesCorto(g.desde)}`;
  if (g.hasta) return `hasta ${mesCorto(g.hasta)}`;
  return null;
}

// Importe normalizado a €/mes según periodicidad (mismo criterio que el bote).
function alMes(g: GastoFijo): number {
  const imp = Number(g.importe_mensual);
  return g.periodicidad === "anual" ? imp / 12 : g.periodicidad === "trimestral" ? imp / 3 : imp;
}

const selectCls =
  "rounded-sm border-hair border-border bg-white px-2.5 py-2 text-[12.5px] text-ink-secondary focus:outline-none focus:ring-1 focus:ring-sage";

// Lista de gastos fijos con filtros en cliente: texto, categoría, quién paga y
// estado. El contador enseña el total €/mes normalizado de lo filtrado.
export function GastosFijosLista({
  gastos,
  responsables,
  equipo,
  proveedores,
}: {
  gastos: GastoFijo[];
  responsables: string[];
  equipo: { id: string; nombre: string }[];
  proveedores: { id: string; nombre: string }[];
}) {
  const [texto, setTexto] = React.useState("");
  const [categoria, setCategoria] = React.useState("todas");
  const [paga, setPaga] = React.useState("todos");
  const [estado, setEstado] = React.useState("todos");

  const categorias = Array.from(new Set(gastos.map((g) => g.categoria).filter(Boolean))) as string[];
  const pagadores = Array.from(new Set(gastos.map((g) => g.quien_lo_paga ?? "TDO")));

  const q = texto.trim().toLowerCase();
  const filtrados = gastos.filter((g) => {
    if (q && !`${g.concepto} ${g.notas ?? ""} ${g.equipo?.nombre ?? ""} ${g.proveedor?.nombre ?? ""}`.toLowerCase().includes(q)) return false;
    if (categoria !== "todas" && g.categoria !== categoria) return false;
    if (paga !== "todos" && (g.quien_lo_paga ?? "TDO") !== paga) return false;
    if (estado === "activos" && !g.activo) return false;
    if (estado === "inactivos" && g.activo) return false;
    return true;
  });
  const totalFiltrado = filtrados.filter((g) => g.activo).reduce((s, g) => s + alMes(g), 0);
  const hayFiltro = Boolean(q) || categoria !== "todas" || paga !== "todos" || estado !== "todos";

  return (
    <div className="space-y-3">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[180px] flex-1 sm:max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar concepto…"
            className="w-full rounded-sm border-hair border-border bg-white py-2 pl-8 pr-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-sage"
          />
        </label>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={selectCls}>
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_GASTO_MAP[c] ? `${CATEGORIA_GASTO_MAP[c].emoji} ${CATEGORIA_GASTO_MAP[c].label.split(" (")[0]}` : c}
            </option>
          ))}
        </select>
        <select value={paga} onChange={(e) => setPaga(e.target.value)} className={selectCls}>
          <option value="todos">Paga: todos</option>
          {pagadores.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
          <option value="todos">Activos e inactivos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
        <span className="ml-auto text-[12px] text-ink-muted">
          {filtrados.length} gasto{filtrados.length === 1 ? "" : "s"}
          {hayFiltro ? " (filtrados)" : ""} · <b className="tabular text-ink-secondary">{eur(totalFiltrado)}</b>/mes en activos
        </span>
      </div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Concepto", "Categoría", "Importe", "Periodicidad", "Paga", "Estado", ""].map((h) => (
                <th key={h} className="bg-beige-warm px-[15px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((g) => (
              <tr key={g.id} className="hover:bg-beige-light">
                <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                  {g.concepto}
                  {(g.equipo?.nombre || g.proveedor?.nombre) && (
                    <span className="ml-2 text-[11px] text-sage">→ {g.equipo?.nombre ?? g.proveedor?.nombre}</span>
                  )}
                  {g.notas && <span className="ml-2 text-[11px] text-ink-muted">{g.notas}</span>}
                  {vigencia(g) && (
                    <span className="ml-2 rounded-sm bg-beige-warm px-1.5 py-0.5 text-[10px] font-normal text-ink-muted">{vigencia(g)}</span>
                  )}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">
                  {g.categoria && CATEGORIA_GASTO_MAP[g.categoria]
                    ? `${CATEGORIA_GASTO_MAP[g.categoria].emoji} ${CATEGORIA_GASTO_MAP[g.categoria].label.split(" (")[0]}`
                    : "—"}
                </td>
                <td className="border-t border-border px-[15px] py-3 text-[13px] tabular">{eur(Number(g.importe_mensual))}</td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">{PERIOD_LABEL[g.periodicidad] ?? g.periodicidad}</td>
                <td className="border-t border-border px-[15px] py-3 text-[12px] text-ink-secondary">
                  {g.quien_lo_paga ?? "TDO"}
                  {g.caja === "amigos" && <span className="ml-1.5 text-[10px] font-semibold text-clay">🤝 amigos</span>}
                </td>
                <td className="border-t border-border px-[15px] py-3">
                  <Badge tone={g.activo ? "ok" : "neutral"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
                </td>
                <td className="border-t border-border px-[15px] py-3 text-right"><GastoFijoDialog gasto={g} responsables={responsables} equipo={equipo} proveedores={proveedores} /></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="border-t border-border px-[15px] py-8 text-center text-[12.5px] text-ink-muted">
                  Ningún gasto coincide con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="space-y-2 md:hidden">
        {filtrados.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[14px] font-semibold">{g.concepto}</div>
                <div className="mt-0.5 text-[12px] text-ink-muted">
                  {PERIOD_LABEL[g.periodicidad] ?? g.periodicidad}
                  {g.quien_lo_paga ? ` · ${g.quien_lo_paga}` : ""}
                </div>
              </div>
              <GastoFijoDialog gasto={g} responsables={responsables} equipo={equipo} proveedores={proveedores} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="tabular text-[15px] font-semibold text-sage">{eur(Number(g.importe_mensual))}</span>
              <Badge tone={g.activo ? "ok" : "neutral"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
            </div>
          </Card>
        ))}
        {filtrados.length === 0 && (
          <Card className="p-6 text-center text-[12.5px] text-ink-muted">Ningún gasto coincide con el filtro.</Card>
        )}
      </div>
    </div>
  );
}
