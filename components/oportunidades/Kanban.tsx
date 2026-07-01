"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cambiarEstado } from "@/app/actions";
import { KANBAN_COLS, ESTADO_META, TIPO_EVENTO_LABEL } from "@/lib/estados";
import { eur, fecha } from "@/lib/format";
import type { OportunidadEstado } from "@/lib/types";

export type KanbanCard = {
  id: string;
  numero: string;
  titulo: string;
  estado: OportunidadEstado;
  cliente: string | null;
  fecha_evento: string | null;
  tipo_evento: string;
  total: number;
  pendiente: number;
  // usados por los filtros del tablero
  serie?: string;
  tipo_operacion?: string;
  fianzaPendiente?: boolean;
};

// Acento de color por estado (cabecera de columna + borde izquierdo de tarjeta).
const ACCENT: Record<OportunidadEstado, { dot: string; border: string; head: string }> = {
  nueva: { dot: "bg-ink-muted", border: "border-l-border-strong", head: "text-ink-secondary" },
  contestada: { dot: "bg-sage-300", border: "border-l-sage-300", head: "text-sage" },
  en_conversacion: { dot: "bg-sage-300", border: "border-l-sage-300", head: "text-sage" },
  presupuesto_enviado: { dot: "bg-clay", border: "border-l-clay", head: "text-clay-600" },
  confirmada: { dot: "bg-ok", border: "border-l-ok", head: "text-ok" },
  realizada: { dot: "bg-ok", border: "border-l-ok", head: "text-ok" },
  facturada: { dot: "bg-sage", border: "border-l-sage", head: "text-sage" },
  perdida: { dot: "bg-error", border: "border-l-error", head: "text-error" },
  descartada: { dot: "bg-ink-muted", border: "border-l-border-strong", head: "text-ink-muted" },
};

export function Kanban({ cards }: { cards: KanbanCard[] }) {
  const router = useRouter();
  const [moving, setMoving] = React.useState<string | null>(null);

  async function mover(id: string, estado: string) {
    setMoving(id);
    try {
      await cambiarEstado(id, estado);
      router.refresh();
    } finally {
      setMoving(null);
    }
  }

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLS.map((col) => {
        const items = cards.filter((c) => c.estado === col);
        const meta = ESTADO_META[col];
        const acc = ACCENT[col];

        // Columnas vacías: colapsadas en una tira estrecha para no comerse la pantalla.
        if (items.length === 0) {
          return (
            <div
              key={col}
              className="flex w-[44px] shrink-0 flex-col items-center rounded-[14px] bg-beige-warm/40 py-3"
            >
              <span className={`mb-2 h-2 w-2 rounded-full ${acc.dot}`} />
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted [writing-mode:vertical-rl]`}
              >
                {meta.label} · 0
              </span>
            </div>
          );
        }

        return (
          <div
            key={col}
            className="flex w-[250px] shrink-0 flex-col rounded-[14px] bg-beige-warm/70 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${acc.dot}`} />
                <span
                  className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${acc.head}`}
                >
                  {meta.label}
                </span>
              </div>
              <span className="rounded-pill bg-white/70 px-2 text-[11px] font-semibold text-ink-muted">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`cursor-pointer rounded-[10px] border-hair border-l-[3px] border-border bg-white p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md ${acc.border}`}
                  onClick={() => router.push(`/oportunidades/${c.id}`)}
                >
                  <b className="mb-0.5 block text-[12.5px] leading-snug">{c.titulo}</b>
                  <small className="block truncate text-[11px] text-ink-muted">
                    {c.cliente ?? "Sin cliente"}
                  </small>
                  <div className="mt-1.5 text-[10px] text-ink-muted">
                    {TIPO_EVENTO_LABEL[c.tipo_evento] ?? c.tipo_evento} · {fecha(c.fecha_evento)}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="tabular text-[12.5px] font-semibold text-sage">
                      {eur(c.total)}
                    </span>
                    {c.pendiente > 0.01 ? (
                      <Badge tone="warn">Pdte</Badge>
                    ) : (
                      <Badge tone="ok">Cobrado</Badge>
                    )}
                  </div>
                  <select
                    value={c.estado}
                    disabled={moving === c.id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => mover(c.id, e.target.value)}
                    className="mt-2 w-full rounded-sm border-hair border-border bg-beige-light px-2 py-1 text-[10.5px] text-ink-secondary"
                  >
                    {KANBAN_COLS.map((s) => (
                      <option key={s} value={s}>
                        {ESTADO_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
