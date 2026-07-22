"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cambiarEstado } from "@/app/actions";
import { KANBAN_COLS, ESTADO_META, ESTADO_COLOR, TIPO_EVENTO_LABEL } from "@/lib/estados";
import { MotivoPerdidaModal } from "@/components/oportunidades/MotivoPerdidaModal";
import { eur, fecha } from "@/lib/format";
import type { OportunidadEstado } from "@/lib/types";

export type KanbanCard = {
  id: string;
  numero: string;
  titulo: string;
  estado: OportunidadEstado;
  cliente: string | null;
  fecha_evento: string | null;
  fecha_entrada?: string | null;
  tipo_evento: string;
  total: number;
  nModalidades?: number; // nº de opciones excluyentes; >1 → "desde" + badge
  pendiente: number;
  probabilidad?: number; // % de cierre efectivo
  // usados por los filtros del tablero
  serie?: string;
  tipo_operacion?: string;
  canal?: string | null;
  fianzaPendiente?: boolean;
  clienteRecurrente?: boolean;
};

const COLOR = ESTADO_COLOR;

const dotStyle = (e: OportunidadEstado) => ({ background: COLOR[e] });
const chipStyle = (e: OportunidadEstado) => ({
  color: COLOR[e],
  background: `${COLOR[e]}1A`,
  borderColor: `${COLOR[e]}55`,
});

export function Kanban({ cards }: { cards: KanbanCard[] }) {
  const router = useRouter();
  const [moving, setMoving] = React.useState<string | null>(null);
  // Arrastrar y soltar (escritorio): tarjeta en curso y columna resaltada.
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);
  // Cambio a perdida/descartada pendiente de elegir motivo.
  const [pidiendoMotivo, setPidiendoMotivo] = React.useState<{ id: string; estado: OportunidadEstado } | null>(null);

  async function mover(id: string, estado: string, motivo?: string | null) {
    // Perdida/Rechazada preguntan primero el motivo.
    if ((estado === "perdida" || estado === "descartada") && motivo === undefined) {
      setPidiendoMotivo({ id, estado: estado as OportunidadEstado });
      return;
    }
    setMoving(id);
    try {
      await cambiarEstado(id, estado, motivo);
      router.refresh();
    } finally {
      setMoving(null);
      setPidiendoMotivo(null);
    }
  }

  function soltar(col: OportunidadEstado) {
    const id = dragId;
    setOverCol(null);
    setDragId(null);
    if (id) {
      const card = cards.find((c) => c.id === id);
      if (card && card.estado !== col) mover(id, col);
    }
  }

  return (
    <div className="space-y-3">
      {/* Leyenda de colores */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border-hair border-border bg-white px-3 py-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          Estados
        </span>
        {KANBAN_COLS.map((e) => (
          <span key={e} className="flex items-center gap-1.5 text-[11.5px] text-ink-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={dotStyle(e)} />
            {ESTADO_META[e].label}
          </span>
        ))}
      </div>

      {/* En pantallas pequeñas el tablero se desliza en horizontal */}
      <p className="text-[11px] text-ink-muted xl:hidden">
        Desliza el tablero → hay más columnas a la derecha (hasta Facturada).
      </p>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLS.map((col) => {
          const items = cards.filter((c) => c.estado === col);
          const meta = ESTADO_META[col];
          const resaltada = Boolean(overCol === col && dragId);

          // Columnas vacías: tira estrecha; se ensancha al arrastrar encima.
          if (items.length === 0) {
            return (
              <div
                key={col}
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault();
                    setOverCol(col);
                  }
                }}
                onDrop={() => soltar(col)}
                className={`flex shrink-0 flex-col items-center rounded-[14px] py-3 transition-all ${
                  resaltada ? "w-[120px] bg-sage-tint ring-2 ring-sage-300" : "w-[44px] bg-beige-warm/40"
                }`}
              >
                <span className="mb-2 h-2 w-2 rounded-full" style={dotStyle(col)} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted [writing-mode:vertical-rl]">
                  {meta.label} · 0
                </span>
              </div>
            );
          }

          const totalCol = items.reduce((s, c) => s + (c.total || 0), 0);
          return (
            <div
              key={col}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault();
                  setOverCol(col);
                }
              }}
              onDrop={() => soltar(col)}
              className={`flex max-h-[calc(100vh-215px)] w-[250px] shrink-0 flex-col rounded-[14px] p-3 transition-all xl:w-auto xl:min-w-[178px] xl:max-w-[340px] xl:flex-1 xl:shrink ${
                resaltada ? "bg-sage-tint ring-2 ring-sage-300" : "bg-beige-warm/70"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={dotStyle(col)} />
                  <span
                    className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: COLOR[col] }}
                  >
                    {meta.label}
                  </span>
                </div>
                <span className="shrink-0 rounded-pill bg-white/70 px-2 text-[11px] font-semibold text-ink-muted">
                  {items.length}
                </span>
              </div>
              {totalCol > 0 && (
                <div className="mb-2 mt-1 border-b border-border/60 pb-2 text-[11px] tabular text-ink-muted">
                  {eur(totalCol)}
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                {items.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(c.id);
                      // Necesario para que el arrastre se inicie en todos los
                      // navegadores (Firefox no lo activa sin datos).
                      e.dataTransfer.setData("text/plain", c.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    style={{ borderLeftColor: COLOR[c.estado] }}
                    className={`cursor-grab rounded-[10px] border-hair border-l-[3px] border-border bg-white p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:cursor-grabbing ${
                      dragId === c.id ? "opacity-40" : ""
                    }`}
                    onClick={() => router.push(`/oportunidades/${c.id}`)}
                  >
                    <b className="mb-0.5 block text-[12.5px] leading-snug">{c.titulo}</b>
                    <div className="flex items-center gap-1.5">
                      <small className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">
                        {c.cliente ?? "Sin cliente"}
                      </small>
                      {c.clienteRecurrente != null && (
                        <span
                          className={`shrink-0 rounded-pill px-1.5 text-[9px] font-semibold uppercase tracking-[0.05em] ${
                            c.clienteRecurrente ? "bg-sage-tint text-sage" : "bg-clay-tint text-clay-600"
                          }`}
                        >
                          {c.clienteRecurrente ? "Recurrente" : "Nuevo"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[10px] text-ink-muted">
                      {TIPO_EVENTO_LABEL[c.tipo_evento] ?? c.tipo_evento} · {fecha(c.fecha_evento)}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                      <span className="tabular text-[12.5px] font-semibold text-sage">
                        {(c.nModalidades ?? 0) > 1 && (
                          <span className="mr-1 text-[10px] font-normal text-ink-muted">desde</span>
                        )}
                        {eur(c.total)}
                        {(c.nModalidades ?? 0) > 1 && (
                          <span
                            className="ml-1.5 rounded-pill bg-sage-tint px-1.5 text-[9.5px] font-semibold text-sage"
                            title={`${c.nModalidades} opciones a elegir`}
                          >
                            {c.nModalidades} opciones
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* % de cierre: solo cuando aún no es venta segura (100%). */}
                        {c.probabilidad != null && c.probabilidad < 100 && (
                          <span
                            className="shrink-0 rounded-pill bg-beige-warm px-1.5 text-[9.5px] font-semibold tabular text-ink-muted"
                            title="Probabilidad de cierre"
                          >
                            {c.probabilidad}%
                          </span>
                        )}
                        {/* Solo cuando hay importe que cobrar: sin presupuesto (0 €)
                            no tiene sentido "Cobrado" ni "Pdte". */}
                        {c.total > 0.01 &&
                          (c.pendiente > 0.01 ? (
                            <Badge tone="warn">Pdte</Badge>
                          ) : (
                            <Badge tone="ok">Cobrado</Badge>
                          ))}
                      </div>
                    </div>
                    <select
                      value={c.estado}
                      disabled={moving === c.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => mover(c.id, e.target.value)}
                      style={chipStyle(c.estado)}
                      className="mt-2 w-full rounded-sm border-hair px-2 py-1 text-[10.5px] font-semibold"
                    >
                      {KANBAN_COLS.filter((s) => s !== "facturada" || c.estado === "facturada").map((s) => (
                        <option key={s} value={s} disabled={s === "facturada"} style={{ color: "#2B2B2B", background: "#fff" }}>
                          {ESTADO_META[s].label}
                        </option>
                      ))}
                      <optgroup label="Cerrar sin venta">
                        <option value="perdida" style={{ color: "#2B2B2B", background: "#fff" }}>
                          {ESTADO_META.perdida.label}
                        </option>
                        <option value="descartada" style={{ color: "#2B2B2B", background: "#fff" }}>
                          {ESTADO_META.descartada.label}
                        </option>
                      </optgroup>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {pidiendoMotivo && (
        <MotivoPerdidaModal
          estadoLabel={ESTADO_META[pidiendoMotivo.estado].label}
          busy={moving === pidiendoMotivo.id}
          onConfirm={(motivo) => mover(pidiendoMotivo.id, pidiendoMotivo.estado, motivo)}
          onClose={() => setPidiendoMotivo(null)}
        />
      )}
    </div>
  );
}
