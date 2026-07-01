"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarCliente } from "@/app/actions";
import type { Cliente } from "@/lib/types";
import { CLIENTE_TIPO_LABEL } from "@/lib/estados";

export function ClienteDialog({ cliente }: { cliente?: Cliente }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(cliente);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarCliente(new FormData(e.currentTarget));
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
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
            <Plus size={15} /> Nuevo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar cliente" : "Nuevo cliente"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {cliente && <input type="hidden" name="id" value={cliente.id} />}
          <Field label="Nombre *">
            <Input name="nombre" defaultValue={cliente?.nombre} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="tipo" defaultValue={cliente?.tipo ?? "particular"}>
                {Object.entries(CLIENTE_TIPO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Estado">
              <Select name="estado" defaultValue={cliente?.estado ?? "lead"}>
                <option value="lead">Lead</option>
                <option value="cliente">Cliente</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIF / CIF">
              <Input name="nif_cif" defaultValue={cliente?.nif_cif ?? ""} />
            </Field>
            <Field label="Localidad">
              <Input name="localidad" defaultValue={cliente?.localidad ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input name="email" type="email" defaultValue={cliente?.email ?? ""} />
            </Field>
            <Field label="Teléfono">
              <Input name="telefono" defaultValue={cliente?.telefono ?? ""} />
            </Field>
          </div>
          <Field label="Origen">
            <Select name="origen" defaultValue={cliente?.origen ?? "cliente_nuevo"}>
              <option value="cliente_nuevo">Cliente nuevo</option>
              <option value="cliente_previo">Cliente previo (Etapa Cristina)</option>
              <option value="amigo_jero">Amigo</option>
              <option value="por_confirmar">Por confirmar</option>
            </Select>
          </Field>
          <Field label="Notas">
            <Textarea name="notas" defaultValue={cliente?.notas ?? ""} />
          </Field>

          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancelar</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
