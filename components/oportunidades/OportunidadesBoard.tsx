"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Kanban, type KanbanCard } from "@/components/oportunidades/Kanban";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";

const HOY = "2026-07-01";
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLabel = (ym: string) => `${MESES_CORTO[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export function OportunidadesBoard({ cards }: { cards: KanbanCard[] }) {
  // Filtros iniciales desde la URL (drill-down desde el cuadro de mando).
  const sp = useSearchParams();
  const [q, setQ] = React.useState("");
  const [tipoEvento, setTipoEvento] = React.useState(sp.get("tipoEvento") ?? "");
  const [cobro, setCobro] = React.useState(sp.get("cobro") ?? ""); // "" | pendiente | cobrado
  const [fianza, setFianza] = React.useState(sp.get("fianza") ?? ""); // "" | si
  const [serie, setSerie] = React.useState(sp.get("serie") ?? "");
  const [operacion, setOperacion] = React.useState(sp.get("operacion") ?? "");
  const [temporal, setTemporal] = React.useState(sp.get("temporal") ?? ""); // "" | proximos | mes | pasados
  const [mes, setMes] = React.useState(sp.get("mes") ?? ""); // YYYY-MM (drill-down)

  const filtra = (c: KanbanCard) => {
    if (tipoEvento && c.tipo_evento !== tipoEvento) return false;
    if (cobro === "pendiente" && c.pendiente <= 0.01) return false;
    if (cobro === "cobrado" && c.pendiente > 0.01) return false;
    if (fianza === "si" && !c.fianzaPendiente) return false;
    if (serie && c.serie !== serie) return false;
    if (operacion && c.tipo_operacion !== operacion) return false;
    if (mes && (c.fecha_evento ?? "").slice(0, 7) !== mes) return false;
    if (temporal) {
      const f = c.fecha_evento ?? "";
      if (temporal === "proximos" && !(f >= HOY)) return false;
      if (temporal === "pasados" && !(f && f < HOY)) return false;
      if (temporal === "mes" && f.slice(0, 7) !== HOY.slice(0, 7)) return false;
    }
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      if (!c.titulo.toLowerCase().includes(t) && !(c.cliente ?? "").toLowerCase().includes(t))
        return false;
    }
    return true;
  };

  const filtradas = cards.filter(filtra);
  const activas = filtradas.filter((c) => !["perdida", "descartada"].includes(c.estado));
  const cerradas = filtradas.filter((c) => ["perdida", "descartada"].includes(c.estado));

  const tiposPresentes = Array.from(new Set(cards.map((c) => c.tipo_evento)));
  const selectCls =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[12.5px] text-ink-secondary focus:border-sage-300 focus:outline-none";
  const hayFiltro = q || tipoEvento || cobro || fianza || serie || operacion || temporal || mes;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar título o cliente…"
          className="min-w-[180px] flex-1 rounded-sm border-med border-border bg-white px-3 py-2 text-[12.5px] focus:border-sage-300 focus:outline-none"
        />
        <select value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)} className={selectCls}>
          <option value="">Tipo de evento</option>
          {tiposPresentes.map((t) => (
            <option key={t} value={t}>{TIPO_EVENTO_LABEL[t] ?? t}</option>
          ))}
        </select>
        <select value={cobro} onChange={(e) => setCobro(e.target.value)} className={selectCls}>
          <option value="">Cobro</option>
          <option value="pendiente">Pendientes de cobro</option>
          <option value="cobrado">Cobrados</option>
        </select>
        <select value={fianza} onChange={(e) => setFianza(e.target.value)} className={selectCls}>
          <option value="">Fianza</option>
          <option value="si">Con fianza por devolver</option>
        </select>
        <select value={serie} onChange={(e) => setSerie(e.target.value)} className={selectCls}>
          <option value="">Serie</option>
          <option value="evento">Evento</option>
          <option value="alquiler_encargo">Alquiler / encargo</option>
        </select>
        <select value={operacion} onChange={(e) => setOperacion(e.target.value)} className={selectCls}>
          <option value="">Operación</option>
          <option value="normal">Normal</option>
          <option value="amigos_prestamo">Amigos / préstamo</option>
        </select>
        <select value={temporal} onChange={(e) => setTemporal(e.target.value)} className={selectCls}>
          <option value="">Cuándo</option>
          <option value="proximos">Próximos</option>
          <option value="mes">Este mes</option>
          <option value="pasados">Pasados</option>
        </select>
        {mes && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-hair border-sage-tint-deep bg-sage-tint/60 px-3 py-1.5 text-[12px] font-medium text-sage">
            Mes: {mesLabel(mes)}
            <button onClick={() => setMes("")} aria-label="Quitar filtro de mes" className="text-sage hover:text-sage-600">×</button>
          </span>
        )}
        {hayFiltro && (
          <button
            onClick={() => {
              setQ(""); setTipoEvento(""); setCobro(""); setFianza(""); setSerie(""); setOperacion(""); setTemporal(""); setMes("");
            }}
            className="rounded-sm border-med border-border-strong px-3 py-2 text-[12px] text-ink-secondary hover:bg-beige-warm"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="text-[12px] text-ink-muted">
        {activas.length} activas{hayFiltro ? " (filtradas)" : ""}
      </div>

      <Kanban cards={activas} />

      {cerradas.length > 0 && (
        <details className="rounded-lg border-hair border-error/40 bg-error-tint/30 p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-error">
            <span className="h-2 w-2 rounded-full bg-error" />
            Rechazadas / perdidas ({cerradas.length})
          </summary>
          <div className="mt-3 space-y-1 text-[13px]">
            {cerradas.map((c) => (
              <a key={c.id} href={`/oportunidades/${c.id}`} className="flex items-center justify-between border-t border-error/20 py-2 hover:text-error">
                <span className="line-through decoration-error/40">{c.titulo}</span>
                <span className="text-ink-muted">{c.cliente ?? "—"}</span>
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
