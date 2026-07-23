"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Kanban, type KanbanCard } from "@/components/oportunidades/Kanban";
import { TIPO_EVENTO_LABEL, CANAL_LABEL } from "@/lib/estados";
import { hoyMadrid, eur } from "@/lib/format";

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
  const [canal, setCanal] = React.useState(sp.get("canal") ?? ""); // drill-down por canal
  const [recurrencia, setRecurrencia] = React.useState(sp.get("recurrencia") ?? ""); // "" | nuevos | recurrentes
  const [soloContratadas, setSoloContratadas] = React.useState(sp.get("contratadas") === "1");
  const [soloPipeline, setSoloPipeline] = React.useState(sp.get("pipeline") === "1");
  const [orden, setOrden] = React.useState("prox"); // prox | reciente | importe
  const HOY = React.useMemo(() => hoyMadrid(), []);

  const filtra = (c: KanbanCard) => {
    if (tipoEvento && c.tipo_evento !== tipoEvento) return false;
    if (cobro === "pendiente" && c.pendiente <= 0.01) return false;
    if (cobro === "cobrado" && c.pendiente > 0.01) return false;
    if (fianza === "si" && !c.fianzaPendiente) return false;
    if (serie && c.serie !== serie) return false;
    if (operacion && c.tipo_operacion !== operacion) return false;
    if (mes && (c.fecha_evento ?? "").slice(0, 7) !== mes) return false;
    if (canal && c.canal !== canal) return false;
    if (recurrencia === "nuevos" && c.clienteRecurrente !== false) return false;
    if (recurrencia === "recurrentes" && c.clienteRecurrente !== true) return false;
    if (soloContratadas && !["confirmada", "en_produccion", "realizada", "facturada"].includes(c.estado)) return false;
    if (soloPipeline && !["nueva", "contestada", "en_conversacion", "presupuesto_enviado"].includes(c.estado)) return false;
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

  // Orden dentro de cada columna. "Próximo evento" es el más útil para el día
  // a día (lo que viene antes, arriba); también por entrada reciente o importe.
  const ordena = (a: KanbanCard, b: KanbanCard) => {
    if (orden === "importe") return (b.total || 0) - (a.total || 0);
    if (orden === "reciente") return (b.fecha_entrada ?? "").localeCompare(a.fecha_entrada ?? "");
    // prox: por fecha de evento ascendente, sin fecha al final
    const fa = a.fecha_evento || "9999-12-31";
    const fb = b.fecha_evento || "9999-12-31";
    return fa.localeCompare(fb);
  };

  // Corte para archivar facturadas: 15 días desde la emisión de su factura.
  // Así el Kanban no se llena de facturadas viejas y se mantiene el foco.
  const corteFacturadas = React.useMemo(() => {
    const d = new Date(`${HOY}T00:00:00`);
    d.setDate(d.getDate() - 15);
    return d.toISOString().slice(0, 10);
  }, [HOY]);
  const esFacturadaArchivada = (c: KanbanCard) =>
    c.estado === "facturada" && !!c.facturadaFecha && c.facturadaFecha < corteFacturadas;

  const filtradas = cards.filter(filtra).sort(ordena);
  const activas = filtradas.filter(
    (c) => !["perdida", "descartada"].includes(c.estado) && !esFacturadaArchivada(c),
  );
  const facturadasArchivadas = filtradas.filter(esFacturadaArchivada);
  const perdidas = filtradas.filter((c) => c.estado === "perdida");
  const descartadas = filtradas.filter((c) => c.estado === "descartada");

  const tiposPresentes = Array.from(new Set(cards.map((c) => c.tipo_evento)));
  const selectCls =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[12.5px] text-ink-secondary focus:border-sage-300 focus:outline-none";
  const hayFiltro = q || tipoEvento || cobro || fianza || serie || operacion || temporal || mes || canal || recurrencia || soloContratadas || soloPipeline;

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
        <select value={recurrencia} onChange={(e) => setRecurrencia(e.target.value)} className={selectCls}>
          <option value="">Cliente</option>
          <option value="nuevos">Nuevos</option>
          <option value="recurrentes">Recurrentes</option>
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value)} className={selectCls} title="Orden de las tarjetas dentro de cada columna">
          <option value="prox">Orden: evento próximo</option>
          <option value="reciente">Orden: entrada reciente</option>
          <option value="importe">Orden: mayor importe</option>
        </select>
        {mes && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-hair border-sage-tint-deep bg-sage-tint/60 px-3 py-1.5 text-[12px] font-medium text-sage">
            Mes: {mesLabel(mes)}
            <button onClick={() => setMes("")} aria-label="Quitar filtro de mes" className="text-sage hover:text-sage-600">×</button>
          </span>
        )}
        {canal && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-hair border-sage-tint-deep bg-sage-tint/60 px-3 py-1.5 text-[12px] font-medium text-sage">
            Canal: {CANAL_LABEL[canal] ?? canal}
            <button onClick={() => setCanal("")} aria-label="Quitar filtro de canal" className="text-sage hover:text-sage-600">×</button>
          </span>
        )}
        {soloContratadas && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-hair border-sage-tint-deep bg-sage-tint/60 px-3 py-1.5 text-[12px] font-medium text-sage">
            Solo contratadas
            <button onClick={() => setSoloContratadas(false)} aria-label="Quitar filtro" className="text-sage hover:text-sage-600">×</button>
          </span>
        )}
        {soloPipeline && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border-hair border-sage-tint-deep bg-sage-tint/60 px-3 py-1.5 text-[12px] font-medium text-sage">
            En pipeline
            <button onClick={() => setSoloPipeline(false)} aria-label="Quitar filtro" className="text-sage hover:text-sage-600">×</button>
          </span>
        )}
        {hayFiltro && (
          <button
            onClick={() => {
              setQ(""); setTipoEvento(""); setCobro(""); setFianza(""); setSerie(""); setOperacion(""); setTemporal(""); setMes(""); setCanal(""); setRecurrencia(""); setSoloContratadas(false); setSoloPipeline(false);
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

      {facturadasArchivadas.length > 0 && (
        <GrupoFacturadas items={facturadasArchivadas} />
      )}
      {perdidas.length > 0 && (
        <GrupoCerrado titulo="Perdidas" items={perdidas} tone="error" />
      )}
      {descartadas.length > 0 && (
        <GrupoCerrado titulo="Descartadas" items={descartadas} tone="neutral" />
      )}
    </div>
  );
}

// Sección plegable para facturadas ya archivadas (facturadas hace más de 15
// días). Se sacan del Kanban para no perder foco, pero siguen accesibles.
function GrupoFacturadas({ items }: { items: KanbanCard[] }) {
  const total = items.reduce((s, it) => s + (it.total || 0), 0);
  return (
    <details className="rounded-lg border-hair border-ok/30 bg-ok-tint/25 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ok">
        <span className="h-2 w-2 rounded-full bg-ok" />
        Facturadas · archivadas ({items.length})
        <span className="ml-1 font-normal normal-case tracking-normal text-ink-muted">
          hace más de 15 días · {eur(total)}
        </span>
      </summary>
      <div className="mt-3 space-y-1 text-[13px]">
        {items.map((it) => (
          <a
            key={it.id}
            href={`/oportunidades/${it.id}`}
            className="flex items-center justify-between gap-3 border-t border-ok/15 py-2 hover:text-ok"
          >
            <span className="truncate">{it.titulo}</span>
            <span className="flex shrink-0 items-center gap-3 text-ink-muted">
              <span>{it.cliente ?? "—"}</span>
              {it.facturadaFecha && <span className="tabular text-[11px]">{fechaCorta(it.facturadaFecha)}</span>}
              <span className="tabular font-medium text-ink-secondary">{eur(it.total || 0)}</span>
            </span>
          </a>
        ))}
      </div>
    </details>
  );
}

const fechaCorta = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(2, 4)}`;

// Sección plegable para oportunidades cerradas (perdidas o descartadas).
function GrupoCerrado({
  titulo,
  items,
  tone,
}: {
  titulo: string;
  items: KanbanCard[];
  tone: "error" | "neutral";
}) {
  const c =
    tone === "error"
      ? { box: "border-error/40 bg-error-tint/30", head: "text-error", dot: "bg-error", row: "border-error/20 hover:text-error", line: "decoration-error/40" }
      : { box: "border-border bg-beige-warm/40", head: "text-ink-secondary", dot: "bg-ink-muted", row: "border-border hover:text-ink", line: "decoration-ink-muted/50" };
  return (
    <details className={`rounded-lg border-hair p-4 ${c.box}`}>
      <summary className={`flex cursor-pointer items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] ${c.head}`}>
        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
        {titulo} ({items.length})
      </summary>
      <div className="mt-3 space-y-1 text-[13px]">
        {items.map((it) => (
          <a key={it.id} href={`/oportunidades/${it.id}`} className={`flex items-center justify-between border-t py-2 ${c.row}`}>
            <span className={`line-through ${c.line}`}>{it.titulo}</span>
            <span className="text-ink-muted">{it.cliente ?? "—"}</span>
          </a>
        ))}
      </div>
    </details>
  );
}
