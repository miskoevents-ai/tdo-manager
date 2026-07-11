"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, Field } from "@/components/ui/input";

// Mini-modal reutilizable para el momento de cobrar/pagar: pregunta qué
// persona del equipo recibió/puso el dinero (desplegable, sin texto libre)
// y, opcionalmente, de qué caja sale (oficial/amigos).
export function PersonaCajaModal({
  titulo,
  descripcion,
  responsables,
  askPersona = true,
  askCaja = false,
  personaLabel = "¿Quién recibió el dinero?",
  confirmLabel = "Confirmar",
  busy = false,
  onConfirm,
  onClose,
}: {
  titulo: string;
  descripcion?: string;
  responsables: string[];
  askPersona?: boolean;
  askCaja?: boolean;
  personaLabel?: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: (v: { persona: string | null; caja: "oficial" | "amigos" }) => void;
  onClose: () => void;
}) {
  const [persona, setPersona] = React.useState("");
  const [caja, setCaja] = React.useState<"oficial" | "amigos">("oficial");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/35 p-4 pt-[14vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[380px] rounded-lg border-hair border-border bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="font-display text-[16px] leading-tight">{titulo}</div>
          <button onClick={onClose} className="rounded-sm px-2 py-0.5 text-[16px] leading-none text-ink-muted hover:bg-beige-warm">
            ×
          </button>
        </div>
        {descripcion && <p className="mb-3 text-[11.5px] text-ink-muted">{descripcion}</p>}

        {askPersona && (
          <Field label={personaLabel}>
            <Select value={persona} onChange={(e) => setPersona(e.target.value)}>
              <option value="">🏦 TDO (directo a la caja)</option>
              {responsables.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
            {persona && (
              <p className="mt-1 text-[10.5px] text-ink-muted">
                Quedará como dinero en manos de {persona} (deuda con TDO) hasta que lo entregue.
              </p>
            )}
          </Field>
        )}

        {askCaja && (
          <div className="mt-3">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              ¿De qué caja?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCaja("oficial")}
                className={`rounded-md border-med px-3 py-2 text-center text-[12px] font-semibold ${
                  caja === "oficial" ? "border-sage bg-sage-tint text-sage" : "border-border bg-white text-ink-muted"
                }`}
              >
                🏦 Oficial
              </button>
              <button
                type="button"
                onClick={() => setCaja("amigos")}
                className={`rounded-md border-med px-3 py-2 text-center text-[12px] font-semibold ${
                  caja === "amigos" ? "border-clay bg-clay-tint text-clay" : "border-border bg-white text-ink-muted"
                }`}
              >
                🤝 Amigos
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" disabled={busy} onClick={() => onConfirm({ persona: persona || null, caja })}>
            {busy ? "Guardando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
