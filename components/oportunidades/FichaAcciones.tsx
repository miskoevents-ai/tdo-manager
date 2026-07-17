"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw, Mail, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitirFactura, toggleFianzaDevuelta, cambiarEstado, marcarPresupuestoEnviado, validarOportunidad, borrarOportunidad } from "@/app/actions";
import { ESTADO_META, ESTADO_COLOR, ESTADOS_MANUALES } from "@/lib/estados";
import { eur } from "@/lib/format";
import type { OportunidadEstado, OportunidadSerie } from "@/lib/types";

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
  // "Facturada" no es elegible a mano, pero si ya lo está hay que mostrarlo.
  const opciones: OportunidadEstado[] = ESTADOS_MANUALES.includes(estado)
    ? ESTADOS_MANUALES
    : [estado, ...ESTADOS_MANUALES];
  return (
    <select
      value={estado}
      disabled={busy}
      onChange={async (e) => {
        const nuevo = e.target.value;
        if (
          (nuevo === "perdida" || nuevo === "descartada") &&
          !window.confirm(`¿Marcar como "${ESTADO_META[nuevo as OportunidadEstado].label}"? Saldrá del pipeline activo.`)
        ) {
          return;
        }
        setBusy(true);
        try {
          await cambiarEstado(oportunidadId, nuevo);
          router.refresh();
        } catch (err) {
          window.alert((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="cursor-pointer rounded-pill border-med px-3 py-1 text-[12px] font-semibold focus:outline-none disabled:opacity-60"
      style={{ color, background: `${color}1A`, borderColor: `${color}55` }}
    >
      {opciones.map((e) => (
        <option key={e} value={e} disabled={e === "facturada"}>
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
  totalNum,
  serie,
  pctFactura,
}: {
  oportunidadId: string;
  numero: string;
  titulo: string;
  clienteEmail: string | null;
  clienteNombre: string | null;
  total: string;
  totalNum: number;
  serie: OportunidadSerie;
  pctFactura: number | null;
}) {
  const router = useRouter();
  const asunto = `Presupuesto Nº ${numero} · Tu Decoración Original`;
  // Reparto de cobro para alquileres/encargos: si una parte va con factura y
  // otra en efectivo ("amigos"), se detalla en el email (nunca en el PDF).
  const pct = typeof pctFactura === "number" ? Math.max(0, Math.min(100, pctFactura)) : null;
  let reparto: string | null = null;
  if (serie === "alquiler_encargo" && pct !== null && pct < 100) {
    if (pct <= 0) {
      reparto = "El importe se abonará íntegramente en efectivo.";
    } else {
      const factura = Math.round(totalNum * pct) / 100;
      const efectivo = Math.round((totalNum - factura) * 100) / 100;
      reparto = `Del total, ${eur(factura)} se abonarán con factura y ${eur(efectivo)} en efectivo.`;
    }
  }
  const cuerpo = [
    `Hola ${clienteNombre ?? ""},`.replace(" ,", ","),
    "",
    `Muchas gracias por contar con Tu Decoración Original. Te adjuntamos el presupuesto Nº ${numero} (${titulo}) por un total de ${total}.`,
    ...(reparto ? ["", reparto] : []),
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

// Valida la oportunidad: la da por cerrada y genera la factura (normal) en un
// clic. Estado destacado para cerrar el ciclo del evento.
export function ValidarOportunidadBtn({
  oportunidadId,
  yaFacturada,
}: {
  oportunidadId: string;
  yaFacturada: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="sm"
      disabled={loading}
      onClick={async () => {
        if (
          !window.confirm(
            yaFacturada
              ? "¿Cerrar la oportunidad? Los costes quedarán congelados."
              : "¿Validar la oportunidad? Se generará la factura y quedará cerrada con los costes congelados.",
          )
        )
          return;
        setLoading(true);
        try {
          const { facturaId, aviso } = await validarOportunidad(oportunidadId);
          if (aviso) window.alert(aviso);
          if (facturaId) router.push(`/facturas/${facturaId}`);
          else router.refresh();
        } catch (e) {
          window.alert((e as Error).message);
          setLoading(false);
        }
      }}
    >
      <CheckCircle2 size={14} /> {loading ? "Validando…" : "Validar y facturar"}
    </Button>
  );
}

// Elimina la oportunidad (con doble confirmación). Para leads que no cuajaron
// es mejor marcarlas como Rechazada; esto es para pruebas o entradas erróneas.
export function BorrarOportunidadBtn({
  oportunidadId,
  titulo,
}: {
  oportunidadId: string;
  titulo: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={async () => {
        if (
          !window.confirm(
            `¿Eliminar definitivamente «${titulo}»?\n\n` +
              `Se borrará la oportunidad con su presupuesto, costes, reservas y movimientos previstos. ` +
              `No se puede deshacer.\n\n` +
              `Si es un cliente real que no cuajó, mejor márcala como Rechazada en vez de borrarla.`,
          )
        )
          return;
        setLoading(true);
        try {
          await borrarOportunidad(oportunidadId);
          router.push("/oportunidades");
        } catch (e) {
          window.alert((e as Error).message);
          setLoading(false);
        }
      }}
      className="text-error hover:bg-error-tint"
    >
      <Trash2 size={14} /> {loading ? "Eliminando…" : "Eliminar"}
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
