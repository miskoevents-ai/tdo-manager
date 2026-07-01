"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Field } from "@/components/ui/input";
import { guardarComisionConfig, borrarComisionConfig } from "@/app/actions";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";
import type { ComisionConfig, Equipo } from "@/lib/types";

export function ComisionConfigDialog({
  equipo,
  config,
}: {
  equipo: Pick<Equipo, "id" | "nombre">[];
  config?: ComisionConfig;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(config);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarComisionConfig(new FormData(e.currentTarget));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!config) return;
    setSaving(true);
    try {
      await borrarComisionConfig(config.id);
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
            <Plus size={15} /> Nueva regla de %
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar regla de comisión" : "Nueva regla de comisión"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {config && <input type="hidden" name="id" value={config.id} />}
          <Field label="Persona *">
            <Select name="equipo_id" defaultValue={config?.equipo_id ?? ""} required>
              <option value="">— Elegir —</option>
              {equipo.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de evento">
              <Select name="tipo_evento" defaultValue={config?.tipo_evento ?? ""}>
                <option value="">Todos</option>
                {Object.entries(TIPO_EVENTO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="% comisión">
              <Input type="number" step="0.01" min="0" name="porcentaje" defaultValue={config?.porcentaje ?? ""} required />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="activo" defaultChecked={config?.activo ?? true} className="h-4 w-4 accent-sage" />
            Activa
          </label>

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
