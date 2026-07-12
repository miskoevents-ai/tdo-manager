"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileStack } from "lucide-react";
import { regenerarPdfsFacturas } from "@/app/actions";

// Regenera el PDF de todas las facturas con el diseño actual. Útil al cambiar
// la plantilla: en un clic quedan todas con el mismo aspecto.
export function GenerarPdfsBtn() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    if (!confirm("¿Regenerar el PDF de todas las facturas con el diseño actual? Reemplaza también las que hubieras subido a mano.")) return;
    setBusy(true);
    try {
      const r = await regenerarPdfsFacturas(false);
      router.refresh();
      alert(
        r.generadas === 0 && r.errores === 0
          ? "No hay facturas que regenerar."
          : `PDF regenerados: ${r.generadas}${r.errores ? ` · con ${r.errores} error(es)` : ""}.`,
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
      title="Regenerar el PDF de todas las facturas con el diseño actual"
      className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
    >
      <FileStack size={15} /> {busy ? "Regenerando…" : "Regenerar PDFs"}
    </button>
  );
}
