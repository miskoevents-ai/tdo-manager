"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { marcarCobradoOportunidad } from "@/app/actions";
import { eur, fecha } from "@/lib/format";

export function CobroRow({
  id,
  titulo,
  cliente,
  fechaEvento,
  pendiente,
}: {
  id: string;
  titulo: string;
  cliente: string | null;
  fechaEvento: string | null;
  pendiente: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function marcar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await marcarCobradoOportunidad(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-border py-[10px] text-[13px] first:border-t-0">
      <Link href={`/oportunidades/${id}`} className="flex flex-1 items-center justify-between hover:text-clay">
        <div className="flex flex-col gap-0.5">
          <span>{titulo}</span>
          <small className="text-[11.5px] text-ink-muted">
            {cliente ?? "—"} · {fecha(fechaEvento)}
          </small>
        </div>
        <span className="tabular font-semibold text-error">{eur(pendiente)}</span>
      </Link>
      <button
        onClick={marcar}
        disabled={busy}
        title="Marcar como cobrado"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-med border-ok text-ok transition-colors hover:bg-ok hover:text-cream disabled:opacity-50"
      >
        <Check size={15} />
      </button>
    </div>
  );
}
