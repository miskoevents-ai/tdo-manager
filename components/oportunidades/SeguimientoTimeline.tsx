"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { crearSeguimiento, borrarSeguimiento } from "@/app/actions";
import type { Seguimiento } from "@/lib/types";

const fES = (iso: string) => iso.split("T")[0].split("-").reverse().join("/");

// Bitácora de seguimiento de la oportunidad: notas cronológicas del estado del
// contacto, con un "recordarme el" opcional que dispara aviso.
export function SeguimientoTimeline({
  oportunidadId,
  seguimientos,
  hoy,
}: {
  oportunidadId: string;
  seguimientos: Seguimiento[];
  hoy: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = React.useState("");
  const [recordar, setRecordar] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function anadir() {
    if (!texto.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await crearSeguimiento({ oportunidadId, texto, recordar: recordar || null });
      setTexto("");
      setRecordar("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Alta de nota */}
      <div className="rounded-md border-hair border-sage-tint-deep bg-sage-tint/30 p-3">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Cómo va? Ej.: «Presu enviado, esperando respuesta» · «Lo están hablando entre ellos» · «Les escribo el martes»"
          rows={2}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[12px] text-ink-secondary">
            <Bell size={13} className="text-clay" /> Recordarme el
            <Input type="date" value={recordar} onChange={(e) => setRecordar(e.target.value)} className="!w-auto !py-1" />
          </label>
          <Button size="sm" onClick={anadir} disabled={busy || !texto.trim()}>
            <Send size={14} /> {busy ? "Guardando…" : "Añadir"}
          </Button>
        </div>
        {error && <p className="mt-2 text-caption text-error">{error}</p>}
      </div>

      {/* Línea de tiempo */}
      {seguimientos.length === 0 ? (
        <p className="py-2 text-small text-ink-muted">
          Aún no hay seguimiento. Apunta aquí cada avance del contacto para no perder el hilo.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-border pl-4">
          {seguimientos.map((s) => {
            const vencido = s.recordar && s.recordar <= hoy;
            return (
              <li key={s.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sage ring-2 ring-white" />
                <div className="rounded-md border-hair border-border bg-white p-2.5 shadow-sm">
                  <p className="whitespace-pre-line text-[13px] text-ink">{s.texto}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
                    <span>{fES(s.created_at)}</span>
                    {s.autor && <span>· {s.autor}</span>}
                    {s.recordar && (
                      <span className={`inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 font-semibold ${vencido ? "bg-warn-tint text-[#7a5a1a]" : "bg-sage-tint text-sage"}`}>
                        <Bell size={10} /> Recordar {fES(s.recordar)}{vencido ? " · pendiente" : ""}
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        if (!window.confirm("¿Eliminar esta nota de seguimiento?")) return;
                        await borrarSeguimiento(s.id, oportunidadId);
                        router.refresh();
                      }}
                      className="ml-auto rounded-sm p-0.5 text-ink-muted hover:text-error"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
