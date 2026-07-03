"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirFactura, toggleFianzaDevuelta, cambiarEstado } from "@/app/actions";
import { ESTADO_META, ESTADO_COLOR } from "@/lib/estados";
import type { OportunidadEstado } from "@/lib/types";

// Desplegable de estado en la cabecera de la ficha, con el color del kanban.
export function EstadoSelect({
  oportunidadId,
  estado,
}: {
  oportunidadId: string;
  estado: OportunidadEstado;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const color = ESTADO_COLOR[estado];
  return (
    <select
      value={estado}
      disabled={busy}
      onChange={async (e) => {
        setBusy(true);
        try {
          await cambiarEstado(oportunidadId, e.target.value);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="cursor-pointer rounded-pill border-med px-3 py-1 text-[12px] font-semibold focus:outline-none disabled:opacity-60"
      style={{ color, background: `${color}1A`, borderColor: `${color}55` }}
    >
      {(Object.keys(ESTADO_META) as OportunidadEstado[]).map((e) => (
        <option key={e} value={e}>
          {ESTADO_META[e].label}
        </option>
      ))}
    </select>
  );
}

export function EmitirFacturaBtn({ oportunidadId }: { oportunidadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await emitirFactura(oportunidadId);
          router.push("/facturas");
        } finally {
          setLoading(false);
        }
      }}
    >
      <FileText size={14} /> {loading ? "Emitiendo…" : "Emitir factura"}
    </Button>
  );
}

export function FianzaBtn({
  oportunidadId,
  devuelta,
}: {
  oportunidadId: string;
  devuelta: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await toggleFianzaDevuelta(oportunidadId, !devuelta);
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      <RotateCcw size={14} /> {devuelta ? "Marcar no devuelta" : "Marcar fianza devuelta"}
    </Button>
  );
}
