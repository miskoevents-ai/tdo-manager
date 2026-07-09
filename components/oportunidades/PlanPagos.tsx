"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { crearCobroPrevisto, borrarMovimiento } from "@/app/actions";

// Plan de pagos: añade cobros previstos con fecha e importe, eligiendo la vía
// (con factura → contabilidad oficial · efectivo → vista amigos, sin IVA).
// Cada cobro previsto aparece en Tesorería y en el Calendario.
export function PlanPagos({ oportunidadId }: { oportunidadId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fecha, setFecha] = React.useState("");
  const [importe, setImporte] = React.useState(0);
  const [via, setVia] = React.useState("factura");
  const [concepto, setConcepto] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await crearCobroPrevisto({ oportunidadId, fecha, importe, via, concepto: concepto || null });
      setFecha("");
      setImporte(0);
      setConcepto("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus size={14} /> Añadir cobro al plan de pagos
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Fecha del cobro">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} autoFocus />
        </Field>
        <Field label="Importe €">
          <Input type="number" step="0.01" value={importe || ""} onChange={(e) => setImporte(Number(e.target.value))} />
        </Field>
        <Field label="Vía">
          <Select value={via} onChange={(e) => setVia(e.target.value)}>
            <option value="factura">Con factura (IVA)</option>
            <option value="efectivo">Efectivo (sin IVA)</option>
          </Select>
        </Field>
        <Field label="Concepto (opcional)">
          <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Reserva 30%…" />
        </Field>
      </div>
      <p className="text-[11px] text-ink-muted">
        Con factura → contabilidad oficial · Efectivo → contabilidad de amigos (sin IVA). Todos salen
        en el Calendario como &quot;Cobro previsto&quot;.
      </p>
      {error && <p className="text-caption text-error">{error}</p>}
      <div className="flex justify-end gap-1">
        <Button size="sm" onClick={add} disabled={busy || !fecha || !(importe > 0)}>
          {busy ? "Guardando…" : "Añadir al plan"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
      </div>
    </div>
  );
}

// Papelera para quitar un cobro previsto del plan (solo previstos).
export function BorrarPrevistoBtn({ id, oportunidadId }: { id: string; oportunidadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      title="Quitar del plan de pagos"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await borrarMovimiento(id);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
    >
      <Trash2 size={13} />
    </button>
  );
}
