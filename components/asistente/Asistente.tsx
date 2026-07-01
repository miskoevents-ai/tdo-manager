"use client";

import * as React from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Qué eventos tengo próximamente?",
  "Resúmeme la contabilidad de este mes",
  "Prepárame un presupuesto para una boda de 80 invitados",
  "¿Cuánto tengo pendiente de cobro?",
];

// Fecha de hoy en formato ISO, calculada en el cliente (evita depender del servidor).
function hoyISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function Asistente() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function enviar(texto: string) {
    const t = texto.trim();
    if (!t || busy) return;
    setError(null);
    const nuevos: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(nuevos);
    setInput("");
    setBusy(true);
    try {
      const resp = await fetch("/api/asistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nuevos, hoy: hoyISO() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error ?? "No se pudo obtener respuesta.");
      } else {
        setMessages([...nuevos, { role: "assistant", content: data.text }]);
      }
    } catch (e) {
      setError(`Error de red: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Asistente"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-cream shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[calc(100vw-40px)] max-w-[400px] flex-col overflow-hidden rounded-xl border-hair border-border bg-white shadow-2xl">
          {/* Cabecera */}
          <div className="flex items-center gap-2 border-b border-border bg-sage px-4 py-3 text-cream">
            <Sparkles size={16} />
            <div className="flex-1">
              <div className="font-display text-[15px] leading-tight">Asistente TDO</div>
              <div className="text-[10.5px] text-cream/70">Pregúntame por tus datos o pídeme un presupuesto</div>
            </div>
          </div>

          {/* Conversación */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !busy && (
              <div className="space-y-2">
                <p className="text-[12.5px] text-ink-muted">Hola 👋 Puedo ayudarte con:</p>
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="block w-full rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 px-3 py-2 text-left text-[12.5px] text-sage hover:bg-sage-tint"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-clay px-3 py-2 text-[13px] text-cream"
                      : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-beige-warm px-3 py-2 text-[13px] text-ink"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                <Loader2 size={14} className="animate-spin" /> Pensando…
              </div>
            )}
            {error && (
              <div className="rounded-md border-hair border-error/30 bg-error-tint px-3 py-2 text-[12px] text-error">
                {error}
              </div>
            )}
          </div>

          {/* Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(input);
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(input);
                }
              }}
              rows={1}
              placeholder="Escribe tu pregunta…"
              className="max-h-24 flex-1 resize-none rounded-md border-med border-border px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sage text-cream disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
