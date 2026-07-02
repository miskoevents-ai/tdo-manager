"use client";

import * as React from "react";
import { Info, X } from "lucide-react";

/**
 * Nota informativa breve en la cabecera de cada sección: explica para qué
 * sirve la pantalla. Se puede ocultar con la X (se recuerda por sección en
 * este dispositivo, con localStorage).
 */
export function InfoNote({ id, children }: { id: string; children: React.ReactNode }) {
  const key = `tdo_info_oculto_${id}`;
  const [oculto, setOculto] = React.useState(false);
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    try {
      setOculto(localStorage.getItem(key) === "1");
    } catch {
      /* ignore */
    }
    setCargado(true);
  }, [key]);

  if (cargado && oculto) return null;

  function ocultar() {
    setOculto(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 px-3 py-2 text-[12px] leading-relaxed text-ink-secondary">
      <Info size={15} className="mt-0.5 shrink-0 text-sage" />
      <p className="min-w-0 flex-1">{children}</p>
      <button
        type="button"
        onClick={ocultar}
        title="Ocultar esta nota"
        className="shrink-0 rounded-sm p-0.5 text-ink-muted hover:bg-white/60 hover:text-sage"
      >
        <X size={14} />
      </button>
    </div>
  );
}
