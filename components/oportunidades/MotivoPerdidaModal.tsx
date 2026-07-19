"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { MOTIVOS_PERDIDA } from "@/lib/estados";

// Pregunta el motivo al marcar una oportunidad como Perdida o Rechazada.
// Devuelve el motivo elegido (o null si se salta) al confirmar.
export function MotivoPerdidaModal({
  estadoLabel,
  busy = false,
  onConfirm,
  onClose,
}: {
  estadoLabel: string;
  busy?: boolean;
  onConfirm: (motivo: string | null) => void;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border-hair border-border bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold text-ink">Marcar como «{estadoLabel}»</h3>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          ¿Por qué no salió? Ayuda a entender qué ajustar (sale en el Cuadro de mando).
        </p>
        <div className="mt-3 grid gap-1.5">
          {MOTIVOS_PERDIDA.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMotivo(m.value)}
              className={`rounded-sm border-med px-3 py-2 text-left text-[13px] transition-colors ${
                motivo === m.value
                  ? "border-clay bg-clay-tint/50 text-clay-600 font-semibold"
                  : "border-border bg-white text-ink-secondary hover:border-clay/40"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy || !motivo}
            onClick={() => onConfirm(motivo || null)}
          >
            {busy ? "Guardando…" : `Marcar ${estadoLabel.toLowerCase()}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
