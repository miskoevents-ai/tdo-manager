"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { descargarFacturaPdf } from "@/app/actions";

// Descarga el PDF de la factura de un clic (generado en el servidor con el
// diseño actual). No usa la impresión del navegador: sale siempre igual.
export function DescargarFacturaPdfBtn({ facturaId }: { facturaId: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function descargar() {
    setBusy(true);
    setError(null);
    try {
      const res = await descargarFacturaPdf(facturaId);
      if (res.error || !res.base64) {
        setError(res.error ?? "No se pudo generar el PDF.");
        return;
      }
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename ?? "factura.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={descargar}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-sm border-med border-sage bg-sage px-4 py-2 text-[13px] font-semibold text-cream hover:bg-sage-600 disabled:opacity-60"
      >
        <Download size={15} /> {busy ? "Generando…" : "Descargar PDF"}
      </button>
      {error && <span className="max-w-[280px] text-right text-[11px] text-error">{error}</span>}
    </span>
  );
}
