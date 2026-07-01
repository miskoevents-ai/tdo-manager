"use client";

import * as React from "react";
import { MessageCircle, Mail, Copy, Check, Send } from "lucide-react";
import { enlacesMensaje, type TipoMensaje } from "@/lib/mensajes";

const ETIQUETA: Record<TipoMensaje, string> = {
  cobro: "Recordar cobro",
  fianza: "Avisar fianza",
  presupuesto: "Seguir presupuesto",
};

export function RecordatorioBtn({
  tipo,
  nombre,
  titulo,
  importe,
  telefono,
  email,
  compact = false,
}: {
  tipo: TipoMensaje;
  nombre?: string | null;
  titulo?: string | null;
  importe?: number | null;
  telefono?: string | null;
  email?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { texto, wa, mailto } = enlacesMensaje(tipo, { nombre, titulo, importe, telefono, email });

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-sm border-med border-border-strong bg-white px-2 py-1 text-[11px] font-semibold text-sage hover:bg-sage-tint"
            : "inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong bg-white px-3 py-1.5 text-[12px] font-semibold text-sage hover:bg-sage-tint"
        }
      >
        <Send size={compact ? 12 : 13} /> {ETIQUETA[tipo]}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-[280px] rounded-md border-hair border-border bg-white p-3 shadow-lg">
          <p className="mb-2 whitespace-pre-wrap rounded-sm bg-beige-light p-2 text-[11.5px] leading-relaxed text-ink-secondary">
            {texto}
          </p>
          <div className="flex flex-wrap gap-2">
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm bg-[#25D366] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            ) : (
              <span className="text-[11px] text-ink-muted">Sin teléfono</span>
            )}
            {mailto && (
              <a
                href={mailto}
                className="inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-3 py-1.5 text-[12px] font-semibold text-ink-secondary hover:bg-beige-warm"
              >
                <Mail size={13} /> Email
              </a>
            )}
            <button
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-3 py-1.5 text-[12px] font-semibold text-ink-secondary hover:bg-beige-warm"
            >
              {copiado ? <Check size={13} className="text-ok" /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
