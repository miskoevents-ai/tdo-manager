"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarInventario, borrarInventario } from "@/app/actions";
import type { Inventario } from "@/lib/types";

export const ESTADO_INV: Record<string, { label: string; tone: "ok" | "warn" | "error" | "neutral" }> = {
  disponible: { label: "Disponible", tone: "ok" },
  en_uso: { label: "En uso", tone: "warn" },
  mantenimiento: { label: "Mantenimiento", tone: "neutral" },
  baja: { label: "Baja", tone: "error" },
};

export function InventarioDialog({ articulo }: { articulo?: Inventario }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(articulo);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarInventario(new FormData(e.currentTarget));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!articulo) return;
    setSaving(true);
    try {
      await borrarInventario(articulo.id);
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
            <Plus size={15} /> Nuevo artículo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar artículo" : "Nuevo artículo"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {articulo && <input type="hidden" name="id" value={articulo.id} />}
          <Field label="Artículo *">
            <Input name="articulo" defaultValue={articulo?.articulo ?? ""} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <Input name="categoria" defaultValue={articulo?.categoria ?? ""} placeholder="Decorativos / Mobiliario" />
            </Field>
            <Field label="Ubicación">
              <Input name="ubicacion" defaultValue={articulo?.ubicacion ?? ""} placeholder="Local, estantería…" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cantidad total">
              <Input type="number" name="cantidad_total" defaultValue={articulo?.cantidad_total ?? ""} />
            </Field>
            <Field label="Coste unitario €">
              <Input type="number" step="0.01" name="coste_unitario" defaultValue={articulo?.coste_unitario ?? ""} />
            </Field>
            <Field label="Precio alquiler €">
              <Input type="number" step="0.01" name="precio_alquiler" defaultValue={articulo?.precio_alquiler ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fianza sugerida €">
              <Input type="number" step="0.01" name="fianza_sugerida" defaultValue={articulo?.fianza_sugerida ?? ""} />
            </Field>
            <Field label="Estado">
              <Select name="estado" defaultValue={articulo?.estado ?? "disponible"}>
                {Object.entries(ESTADO_INV).map(([v, m]) => (
                  <option key={v} value={v}>{m.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="fianza_especial" defaultChecked={articulo?.fianza_especial ?? false} className="h-4 w-4 accent-sage" />
            Fianza especial (pide una fianza al alquilarlo)
          </label>
          <Field label="Foto (URL)">
            <Input name="foto_url" defaultValue={articulo?.foto_url ?? ""} placeholder="https://…  (la subida de fotos llega en la Fase 4)" />
          </Field>
          <Field label="Notas">
            <Textarea name="notas" defaultValue={articulo?.notas ?? ""} />
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
