"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarLineas } from "@/app/actions";
import { calcularTotales } from "@/lib/calc";
import { eur, num } from "@/lib/format";
import type { PresupuestoLinea } from "@/lib/types";

type Fila = { concepto: string; cantidad: number; precio_unitario: number };

export function PresupuestoEditor({
  oportunidadId,
  lineasIniciales,
  ivaPct,
  retPct,
  esEmpresa,
}: {
  oportunidadId: string;
  lineasIniciales: PresupuestoLinea[];
  ivaPct: number;
  retPct: number;
  esEmpresa: boolean;
}) {
  const router = useRouter();
  const [filas, setFilas] = React.useState<Fila[]>(
    lineasIniciales.length
      ? lineasIniciales.map((l) => ({
          concepto: l.concepto,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
        }))
      : [{ concepto: "", cantidad: 1, precio_unitario: 0 }],
  );
  const [iva, setIva] = React.useState(ivaPct);
  const [ret, setRet] = React.useState(retPct);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const totales = calcularTotales(filas, iva, ret);

  function setFila(i: number, patch: Partial<Fila>) {
    setFilas((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addFila() {
    setFilas((f) => [...f, { concepto: "", cantidad: 1, precio_unitario: 0 }]);
  }
  function delFila(i: number) {
    setFilas((f) => (f.length === 1 ? f : f.filter((_, idx) => idx !== i)));
  }

  async function guardar() {
    setSaving(true);
    setMsg(null);
    try {
      await guardarLineas(oportunidadId, filas, iva, ret);
      setMsg("Presupuesto guardado.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Líneas */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border py-2 text-left font-semibold">Concepto</th>
              <th className="w-[70px] border-b border-border py-2 text-right font-semibold">Cant.</th>
              <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Precio €</th>
              <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Subtotal</th>
              <th className="w-[36px] border-b border-border py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td className="border-b border-[#f0eae1] py-1.5 pr-2">
                  <Input
                    value={f.concepto}
                    onChange={(e) => setFila(i, { concepto: e.target.value })}
                    placeholder="Descripción del concepto"
                    className="py-2 text-[13px]"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    value={f.cantidad}
                    onChange={(e) => setFila(i, { cantidad: Number(e.target.value) })}
                    className="py-2 text-right text-[13px] tabular"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={f.precio_unitario}
                    onChange={(e) => setFila(i, { precio_unitario: Number(e.target.value) })}
                    className="py-2 text-right text-[13px] tabular"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 text-right text-[13px] tabular font-semibold">
                  {eur(f.cantidad * f.precio_unitario)}
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 text-center">
                  <button
                    onClick={() => delFila(i)}
                    className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
                    aria-label="Eliminar línea"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={addFila}>
        <Plus size={14} /> Añadir línea
      </Button>

      {/* IVA / Retención + Totales */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              IVA %
            </label>
            <Input
              type="number"
              step="0.01"
              value={iva}
              onChange={(e) => setIva(Number(e.target.value))}
              className="w-[90px] py-2 text-right text-[13px] tabular"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              Retención %
            </label>
            <Input
              type="number"
              step="0.01"
              value={ret}
              onChange={(e) => setRet(Number(e.target.value))}
              className="w-[90px] py-2 text-right text-[13px] tabular"
            />
            <p className="mt-1 text-[10.5px] text-ink-muted">
              {esEmpresa ? "Empresa → −15% sugerido" : "Particular → sin retención"}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[280px]">
          <div className="flex justify-between border-t border-border py-2 text-[13px]">
            <span className="text-ink-secondary">Base imponible</span>
            <span className="tabular font-semibold">{eur(totales.base)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13px]">
            <span className="text-ink-secondary">IVA ({num(iva, 0)}%)</span>
            <span className="tabular">{eur(totales.iva)}</span>
          </div>
          {ret > 0 && (
            <div className="flex justify-between py-1 text-[13px]">
              <span className="text-ink-secondary">Retención (−{num(ret, 0)}%)</span>
              <span className="tabular text-error">−{eur(totales.retencion)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-ink pt-2 font-display text-[17px] font-bold">
            <span>Total</span>
            <span className="tabular">{eur(totales.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={guardar} disabled={saving}>
          {saving ? "Guardando…" : "Guardar presupuesto"}
        </Button>
        {msg && <span className="text-caption text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}
