"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, RotateCcw, AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input, Field } from "@/components/ui/input";
import {
  toggleFianzaDevuelta,
  marcarFianzaCobrada,
  retenerFianzaPorDanos,
  quitarRetencionFianza,
} from "@/app/actions";
import { eur } from "@/lib/format";

const fES = (iso: string) => iso.split("-").reverse().join("/");

// Panel de la fianza en la pestaña de Cobros: estado (pendiente de cobro / en
// depósito / devuelta / retenida por daños) y las acciones de cada momento.
export function FianzaPanel({
  oportunidadId,
  fianza,
  cobrada,
  devuelta,
  fechaDevolucion,
  retenidaImporte,
  retenidaMotivo,
}: {
  oportunidadId: string;
  fianza: number;
  cobrada: boolean;
  devuelta: boolean;
  fechaDevolucion: string | null;
  retenidaImporte: number | null;
  retenidaMotivo: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [retForm, setRetForm] = React.useState(false);
  const [impRet, setImpRet] = React.useState(fianza);
  const [motivo, setMotivo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const retenida = (retenidaImporte ?? 0) > 0;
  const devueltoResto = retenida ? Math.max(0, fianza - (retenidaImporte ?? 0)) : 0;

  const estado: { label: string; tone: BadgeTone; detalle: string } = retenida
    ? {
        label: devueltoResto > 0 ? "Retenida (parcial)" : "Retenida por daños",
        tone: "error",
        detalle:
          `${eur(retenidaImporte ?? 0)} retenidos` +
          (devueltoResto > 0 ? ` · ${eur(devueltoResto)} devueltos` : "") +
          (retenidaMotivo ? ` · ${retenidaMotivo}` : ""),
      }
    : devuelta
      ? { label: "Devuelta", tone: "neutral", detalle: fechaDevolucion ? `Devuelta el ${fES(fechaDevolucion)}` : "Devuelta al cliente" }
      : !cobrada
        ? { label: "Pendiente de cobro", tone: "warn", detalle: "Aún no se ha recibido del cliente" }
        : { label: "En depósito", tone: "ok", detalle: "La tenemos hasta después del evento" };

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function retener() {
    if (!(impRet > 0)) {
      setError("Indica el importe retenido (> 0).");
      return;
    }
    await run(() => retenerFianzaPorDanos(oportunidadId, impRet, motivo || null));
    setRetForm(false);
  }

  return (
    <div className="mb-4 rounded-md border-hair border-sage-tint-deep bg-sage-tint/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-sage" />
          <span className="text-[13px] font-semibold">Fianza · {eur(fianza)}</span>
          <Badge tone={estado.tone}>{estado.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {/* Cobrada/no cobrada: solo mientras la fianza esté viva (ni devuelta ni retenida). */}
          {!devuelta && !retenida && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => run(() => marcarFianzaCobrada(oportunidadId, !cobrada))}
            >
              {cobrada ? "Marcar no cobrada" : "Marcar cobrada"}
            </Button>
          )}
          {cobrada && !devuelta && !retenida && (
            <>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => toggleFianzaDevuelta(oportunidadId, true))}>
                <RotateCcw size={14} /> Devolver
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setRetForm((v) => !v)} className="text-error">
                <AlertTriangle size={14} /> Retener por daños
              </Button>
            </>
          )}
          {devuelta && !retenida && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => toggleFianzaDevuelta(oportunidadId, false))}>
              <Undo2 size={14} /> Marcar no devuelta
            </Button>
          )}
          {retenida && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!window.confirm("¿Quitar la retención por daños?\n\nSe limpian los datos de la oportunidad, pero el ingreso ya registrado en Tesorería NO se borra: revísalo a mano si hace falta.")) return;
                run(() => quitarRetencionFianza(oportunidadId));
              }}
            >
              <Undo2 size={14} /> Quitar retención
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-muted">{estado.detalle}</p>

      {retForm && (
        <div className="mt-3 space-y-2 rounded-sm border-hair border-error-tint bg-error-tint/40 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Importe retenido €">
              <Input type="number" step="0.01" value={impRet || ""} onChange={(e) => setImpRet(Number(e.target.value))} autoFocus />
            </Field>
            <Field label="Motivo (opcional)">
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Copa rota, mantel manchado…" />
            </Field>
          </div>
          <p className="text-[11px] text-ink-muted">
            El importe retenido se registra como ingreso en Tesorería. El resto ({eur(Math.max(0, fianza - (impRet || 0)))}) se
            considera devuelto al cliente.
          </p>
          <div className="flex justify-end gap-1">
            <Button size="sm" onClick={retener} disabled={busy || !(impRet > 0)}>
              {busy ? "Guardando…" : "Retener por daños"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRetForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-caption text-error">{error}</p>}
    </div>
  );
}
