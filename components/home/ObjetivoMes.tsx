"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Target, Pencil, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { guardarObjetivoMensual } from "@/app/actions";
import { eur } from "@/lib/format";

// Objetivo mensual de facturación con barra de progreso (solo socios). El
// "facturado" es lo vendido este mes (eventos contratados con fecha en el mes).
export function ObjetivoMes({
  objetivo,
  facturado,
  mesLabel,
}: {
  objetivo: number;
  facturado: number;
  mesLabel: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState(false);
  const [valor, setValor] = React.useState(objetivo || 0);
  const [busy, setBusy] = React.useState(false);

  async function guardar() {
    setBusy(true);
    try {
      await guardarObjetivoMensual(valor);
      setEditando(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const pct = objetivo > 0 ? Math.min(100, Math.round((facturado / objetivo) * 100)) : 0;
  const falta = Math.max(0, objetivo - facturado);
  const cumplido = objetivo > 0 && facturado >= objetivo;

  // Sin objetivo y sin editar: invita a fijarlo.
  if (!objetivo && !editando) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] text-ink-secondary">
          <Target size={16} className="text-clay" /> Fija un objetivo de facturación mensual para
          seguir el progreso.
        </span>
        <button
          onClick={() => setEditando(true)}
          className="shrink-0 rounded-sm border-med border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-secondary hover:border-clay/40"
        >
          Fijar objetivo
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          <Target size={15} className="text-clay" /> Objetivo del mes · {mesLabel}
        </span>
        {editando ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="100"
              value={valor || ""}
              onChange={(e) => setValor(Number(e.target.value))}
              className="!w-[110px] !py-1 text-right"
              autoFocus
            />
            <button onClick={guardar} disabled={busy} title="Guardar" className="rounded-sm p-1 text-ok hover:bg-ok-tint">
              <Check size={16} />
            </button>
            <button onClick={() => { setEditando(false); setValor(objetivo); }} title="Cancelar" className="rounded-sm p-1 text-ink-muted hover:bg-beige-warm">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditando(true)} className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold text-ink-muted hover:text-clay">
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-display text-[24px] tabular text-sage">{eur(facturado)}</span>
        <span className="text-[13px] tabular text-ink-muted">de {eur(objetivo)}</span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-pill bg-beige-warm">
        <div
          className={`h-full rounded-pill transition-all ${cumplido ? "bg-ok" : "bg-sage"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-muted">
        {cumplido ? (
          <span className="font-semibold text-ok">¡Objetivo cumplido! 🎉 ({pct}%)</span>
        ) : (
          <>
            <b className="text-ink-secondary">{pct}%</b> · faltan <b className="text-clay-600">{eur(falta)}</b> para
            llegar
          </>
        )}
      </p>
    </Card>
  );
}
