"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validarPresupuesto } from "@/app/actions";

// Botón «Presupuesto validado»: el cliente ha aceptado. Confirma la oportunidad
// y reserva automáticamente el material del presupuesto (líneas de catálogo).
// La factura se sigue emitiendo al final; los costes se añaden luego en Costes.
export function PresupuestoValidadoBtn({
  oportunidadId,
  estado,
}: {
  oportunidadId: string;
  estado: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);

  const yaConfirmada = ["confirmada", "realizada", "facturada"].includes(estado);

  async function validar() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await validarPresupuesto(oportunidadId);
      const partes: string[] = [];
      if (res.estadoCambiado) partes.push("oportunidad confirmada");
      if (res.reservasCreadas > 0)
        partes.push(`${res.reservasCreadas} artículo(s) de material reservado(s)`);
      if (res.reservasOmitidas > 0)
        partes.push(`${res.reservasOmitidas} ya estaba(n) reservado(s)`);
      setMsg(res.aviso ?? (partes.length ? `✓ ${partes.join(" · ")}.` : "✓ Todo listo."));
      setConfirmando(false);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!confirmando ? (
        <Button
          variant={yaConfirmada ? "outline" : "primary"}
          size="sm"
          onClick={() => setConfirmando(true)}
          disabled={busy}
        >
          <BadgeCheck size={14} />{" "}
          {yaConfirmada ? "Reservar material del presupuesto" : "Presupuesto validado"}
        </Button>
      ) : (
        <>
          <span className="text-[12.5px] text-ink-secondary">
            {yaConfirmada
              ? "¿Reservar el material del presupuesto para las fechas del evento?"
              : "El cliente acepta: se confirma la oportunidad y se reserva el material. ¿Seguimos?"}
          </span>
          <Button size="sm" onClick={validar} disabled={busy}>
            {busy ? "Validando…" : "Sí, validar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmando(false)} disabled={busy}>
            Cancelar
          </Button>
        </>
      )}
      {msg && <span className="text-[12px] text-ink-secondary">{msg}</span>}
    </div>
  );
}
