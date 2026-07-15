"use client";

import * as React from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { solicitarValidacionPresupuesto } from "@/app/actions";

// Botón para pedir a los socios que validen el presupuesto por email.
export function SolicitarValidacionBtn({ oportunidadId }: { oportunidadId: string }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function pedir() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await solicitarValidacionPresupuesto(oportunidadId);
      if (res.ok) setMsg(`✓ Email enviado a los socios (${res.destinatarios}).`);
      else if (res.skipped) setMsg("El email aún no está configurado (falta la clave de envío o los correos). Avísame para activarlo.");
      else setMsg(`No se pudo enviar: ${res.error ?? "error"}`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={pedir} disabled={busy}>
        <MailCheck size={14} /> {busy ? "Enviando…" : "Pedir validación a los socios"}
      </Button>
      {msg && <span className="text-[12px] text-ink-secondary">{msg}</span>}
    </div>
  );
}
