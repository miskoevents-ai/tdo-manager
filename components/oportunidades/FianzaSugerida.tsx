"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fijarFianza } from "@/app/actions";
import { eur } from "@/lib/format";

// Pauta comercial: cuando el presupuesto lleva material en alquiler, se pide
// una fianza del 50% de ese material. Este aviso aparece si la fianza actual
// está por debajo de la sugerida, con un clic para fijarla.
export function FianzaSugerida({
  oportunidadId,
  baseAlquiler,
  fianzaActual,
  fianzaSugerida,
}: {
  oportunidadId: string;
  baseAlquiler: number;
  fianzaActual: number;
  fianzaSugerida: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function poner() {
    setBusy(true);
    setMsg(null);
    try {
      await fijarFianza(oportunidadId, fianzaSugerida);
      setMsg(`✓ Fianza fijada en ${eur(fianzaSugerida)}.`);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border-med border-[#e7d3a6] bg-warn-tint px-3 py-2 text-[12.5px] text-[#7a5a1a]">
      <ShieldCheck size={15} />
      <span>
        Este presupuesto lleva <b>material en alquiler por {eur(baseAlquiler)}</b>. La pauta es pedir una
        fianza del 50%: <b className="tabular">{eur(fianzaSugerida)}</b>
        {fianzaActual > 0 && <> (ahora mismo hay {eur(fianzaActual)})</>}.
      </span>
      <Button variant="outline" size="sm" onClick={poner} disabled={busy}>
        {busy ? "Poniendo…" : `Poner fianza de ${eur(fianzaSugerida)}`}
      </Button>
      {msg && <span>{msg}</span>}
    </div>
  );
}
