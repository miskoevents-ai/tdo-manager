"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirFactura, toggleFianzaDevuelta, cambiarEstado, marcarPresupuestoEnviado } from "@/app/actions";
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

// Abre el correo (Outlook o el que esté configurado) con el mensaje del
// presupuesto ya redactado para el cliente, y marca "presupuesto enviado".
// El PDF hay que adjuntarlo a mano (los enlaces mailto no admiten adjuntos).
export function EnviarPresupuestoBtn({
  oportunidadId,
  numero,
  titulo,
  clienteEmail,
  clienteNombre,
  total,
}: {
  oportunidadId: string;
  numero: string;
  titulo: string;
  clienteEmail: string | null;
  clienteNombre: string | null;
  total: string;
}) {
  const router = useRouter();
  const asunto = `Presupuesto Nº ${numero} · Tu Decoración Original`;
  const cuerpo = [
    `Hola ${clienteNombre ?? ""},`.replace(" ,", ","),
    "",
    `Muchas gracias por contar con Tu Decoración Original. Te adjuntamos el presupuesto Nº ${numero} (${titulo}) por un total de ${total}.`,
    "",
    "Quedamos a tu disposición para cualquier duda o ajuste.",
    "",
    "Un saludo,",
    "Equipo de Tu Decoración Original",
    "675 758 783 · info@tudecoracionoriginal.es · www.tudecoracionoriginal.es",
  ].join("\n");
  const href = `mailto:${encodeURIComponent(clienteEmail ?? "")}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  return (
    <a
      href={href}
      title="Abre tu correo con el mensaje redactado — recuerda adjuntar el PDF"
      onClick={() => {
        marcarPresupuestoEnviado(oportunidadId).then(() => router.refresh());
      }}
      className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
    >
      <Mail size={15} /> Enviar al cliente
    </a>
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
