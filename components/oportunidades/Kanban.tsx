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
        return (
          <div key={col} className="w-[240px] shrink-0 rounded-[14px] bg-beige-warm p-[11px]">
            <div className="mb-[11px] flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">
              <span>{meta.label}</span>
              <span className="text-ink-muted">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="cursor-pointer rounded-[10px] border-hair border-border bg-white p-[11px] shadow-sm transition-colors hover:border-clay"
                  onClick={() => router.push(`/oportunidades/${c.id}`)}
                >
                  <b className="mb-0.5 block text-[12.5px]">{c.titulo}</b>
                  <small className="block text-[11px] text-ink-muted">
                    {c.cliente ?? "Sin cliente"}
                  </small>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-ink-muted">
                      {TIPO_EVENTO_LABEL[c.tipo_evento] ?? c.tipo_evento} · {fecha(c.fecha_evento)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="tabular text-[12px] font-semibold text-sage">
                      {eur(c.total)}
                    </span>
                    {c.pendiente > 0.01 && <Badge tone="warn">Pdte</Badge>}
                  </div>
                  {/* Mover de estado */}
                  <select
                    value={c.estado}
                    disabled={moving === c.id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => mover(c.id, e.target.value)}
                    className="mt-2 w-full rounded-sm border-hair border-border bg-beige-light px-2 py-1 text-[10.5px] text-ink-secondary"
                  >
                    {KANBAN_COLS.map((s) => (
                      <option key={s} value={s}>{ESTADO_META[s].label}</option>
                    ))}
                  </select>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-2 text-center text-[11px] text-ink-muted">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
