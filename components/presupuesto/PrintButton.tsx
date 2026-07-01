"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-sm bg-sage px-4 py-2 text-[13px] font-semibold text-cream hover:bg-sage-600"
    >
      <Printer size={15} /> Imprimir / Guardar PDF
    </button>
  );
}
