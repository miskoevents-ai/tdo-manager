"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarGastoFijo, borrarGastoFijo } from "@/app/actions";
import type { GastoFijo } from "@/lib/types";

export function GastoFijoDialog({ gasto }: { gasto?: GastoFijo }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(gasto);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarGastoFijo(new FormData(e.currentTarget));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!gasto) return;
    setSaving(true);
    try {
      await borrarGastoFijo(gasto.id);
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editar ? (
          <button className="rounded-sm p-1.5 text-ink-muted hover:bg-beige-warm hover:text-sage">
            <Pencil size={15} />
          </button>
        ) : (
          <Button size="sm">
            <Plus size={15} /> Nuevo gasto fijo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar gasto fijo" : "Nuevo gasto fijo"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {gasto && <input type="hidden" name="id" value={gasto.id} />}
          <Field label="Concepto *">
            <Input name="concepto" defaultValue={gasto?.concepto ?? ""} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Importe mensual €">
              <Input
                type="number"
                step="0.01"
                min="0"
                name="importe_mensual"
                defaultValue={gasto?.importe_mensual ?? ""}
              />
            </Field>
            <Field label="Periodicidad">
              <Select name="periodicidad" defaultValue={gasto?.periodicidad ?? "mensual"}>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </Select>
            </Field>
          </div>
          <Field label="Quién lo paga">
            <Input name="quien_lo_paga" defaultValue={gasto?.quien_lo_paga ?? ""} placeholder="Jero, Sarmi…" />
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={gasto?.activo ?? true}
              className="h-4 w-4 accent-sage"
            />
            Activo (se incluye al generar el mes)
          </label>
          <Field label="Notas">
            <Textarea name="notas" defaultValue={gasto?.notas ?? ""} />
          </Field>

          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex items-center justify-between pt-1">
            {editar ? (
              <Button type="button" variant="ghost" size="sm" onClick={eliminar} className="text-error">
                <Trash2 size={14} /> Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">Cancelar</Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
