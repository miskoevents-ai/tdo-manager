"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guardarAvisosEmails } from "@/app/actions";

// Correos a los que llegan los avisos por email (validar presupuesto, unirse a
// reunión). Editable por admins; se guarda en ajustes (no en el código).
export function AvisosEmailsForm({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [valor, setValor] = React.useState(inicial);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function guardar() {
    setBusy(true);
    setMsg(null);
    try {
      await guardarAvisosEmails(valor);
      setMsg("Guardado ✓");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border-hair border-border bg-white p-5">
      <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Mail size={15} className="text-sage" /> Correos de avisos
      </div>
      <p className="mb-3 text-[12px] text-ink-muted">
        A quién le llegan los emails de la herramienta (validar presupuesto, unirse a reunión).
        Escribe los correos separados por comas.
      </p>
      <textarea
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="jero@gmail.com, cris@gmail.com, alvaro@gmail.com"
        rows={2}
        className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {msg && <span className="text-[12px] text-ink-secondary">{msg}</span>}
        <Button size="sm" onClick={guardar} disabled={busy}>
          {busy ? "Guardando…" : "Guardar correos"}
        </Button>
      </div>
    </div>
  );
}
