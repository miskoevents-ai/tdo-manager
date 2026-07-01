"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Textarea, Field } from "@/components/ui/input";
import { guardarEquipo, borrarEquipo } from "@/app/actions";
import type { Equipo } from "@/lib/types";

export function EquipoDialog({ persona }: { persona?: Equipo }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(persona);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarEquipo(new FormData(e.currentTarget));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!persona) return;
    setSaving(true);
    try {
      await borrarEquipo(persona.id);
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
            <Plus size={15} /> Nueva persona
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar persona" : "Nueva persona"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {persona && <input type="hidden" name="id" value={persona.id} />}
          <Field label="Nombre *">
            <Input name="nombre" defaultValue={persona?.nombre ?? ""} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rol">
              <Input name="rol" defaultValue={persona?.rol ?? ""} placeholder="Socio, Colaboradora…" />
            </Field>
            <Field label="Teléfono">
              <Input name="telefono" defaultValue={persona?.telefono ?? ""} />
            </Field>
          </div>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={persona?.email ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="% participación (socios)">
              <Input type="number" step="0.01" name="porcentaje" defaultValue={persona?.porcentaje ?? ""} />
            </Field>
            <Field label="€/hora">
              <Input type="number" step="0.01" name="precio_hora" defaultValue={persona?.precio_hora ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="activo" defaultChecked={persona?.activo ?? true} className="h-4 w-4 accent-sage" />
            Activo
          </label>
          <Field label="Notas">
            <Textarea name="notas" defaultValue={persona?.notas ?? ""} />
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
