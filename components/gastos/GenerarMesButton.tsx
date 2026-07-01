"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generarGastosDelMes } from "@/app/actions";

export function GenerarMesButton({ mesActual }: { mesActual: string }) {
  const router = useRouter();
  const [mes, setMes] = React.useState(mesActual);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function generar() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await generarGastosDelMes(mes);
      setMsg(
        r.creados === 0
          ? `Ya estaban generados (${r.existentes} movimientos existentes).`
          : `Creados ${r.creados} movimientos en Tesorería${r.existentes ? ` (${r.existentes} ya existían)` : ""}.`,
      );
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="month"
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        className="rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
      />
      <Button size="sm" variant="secondary" onClick={generar} disabled={busy}>
        <CalendarPlus size={15} /> {busy ? "Generando…" : "Generar gastos del mes"}
      </Button>
      {msg && <span className="text-caption text-ink-muted">{msg}</span>}
    </div>
  );
}
