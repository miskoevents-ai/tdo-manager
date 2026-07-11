"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { marcarCobradoOportunidad } from "@/app/actions";
import { PersonaCajaModal } from "@/components/ui/PersonaCajaModal";
import { eur, fecha } from "@/lib/format";

export function CobroRow({
  id,
  titulo,
  cliente,
  fechaEvento,
  pendiente,
  responsables = [],
}: {
  id: string;
  titulo: string;
  cliente: string | null;
  fechaEvento: string | null;
  pendiente: number;
  responsables?: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [preguntando, setPreguntando] = React.useState(false);

  async function marcar(cobradoPor: string | null) {
    setBusy(true);
    try {
      await marcarCobradoOportunidad(id, cobradoPor);
      router.refresh();
    } finally {
      setBusy(false);
      setPreguntando(false);
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
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (responsables.length > 0) setPreguntando(true);
          else marcar(null);
        }}
        disabled={busy}
        title="Marcar como cobrado"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-med border-ok text-ok transition-colors hover:bg-ok hover:text-cream disabled:opacity-50"
      >
        <Check size={15} />
      </button>
      {preguntando && (
        <PersonaCajaModal
          titulo="Marcar como cobrado"
          descripcion={`${titulo} · ${eur(pendiente)}`}
          responsables={responsables}
          busy={busy}
          confirmLabel="Cobrado"
          onConfirm={({ persona }) => marcar(persona)}
          onClose={() => setPreguntando(false)}
        />
      )}
    </div>
  );
}
