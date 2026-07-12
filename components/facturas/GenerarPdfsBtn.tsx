"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileStack } from "lucide-react";
import { generarPdfsFacturasFaltantes } from "@/app/actions";

// Genera el PDF de las facturas que aún no lo tienen (respeta las subidas a
// mano). Útil para poner al día el histórico en un clic.
export function GenerarPdfsBtn() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await generarPdfsFacturasFaltantes();
      router.refresh();
      alert(
        r.generadas === 0 && r.errores === 0
          ? "Todas las facturas ya tienen su PDF."
          : `PDF generados: ${r.generadas}${r.errores ? ` · con ${r.errores} error(es)` : ""}.`,
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      title="Generar el PDF de las facturas que aún no lo tienen"
      className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
    >
      <FileStack size={15} /> {busy ? "Generando…" : "Generar PDFs"}
    </button>
  );
}
