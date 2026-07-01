"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarProveedor, borrarProveedor } from "@/app/actions";
import type { Proveedor } from "@/lib/types";

const TIPOS = [
  "floristeria", "imprenta", "transporte", "alquiler_subcontrata",
  "catering", "mobiliario", "iluminacion_av", "otros",
];
const TIPO_LABEL: Record<string, string> = {
  floristeria: "Floristería",
  imprenta: "Imprenta",
  transporte: "Transporte",
  alquiler_subcontrata: "Alquiler / subcontrata",
  catering: "Catering",
  mobiliario: "Mobiliario",
  iluminacion_av: "Iluminación / AV",
  otros: "Otros",
};

export { TIPO_LABEL as TIPO_SERVICIO_LABEL };

export function ProveedorDialog({ proveedor }: { proveedor?: Proveedor }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(proveedor);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarProveedor(new FormData(e.currentTarget));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!proveedor) return;
    setSaving(true);
    try {
      await borrarProveedor(proveedor.id);
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
            <Plus size={15} /> Nuevo proveedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar proveedor" : "Nuevo proveedor"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {proveedor && <input type="hidden" name="id" value={proveedor.id} />}
          <Field label="Nombre *">
            <Input name="nombre" defaultValue={proveedor?.nombre ?? ""} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de servicio">
              <Select name="tipo_servicio" defaultValue={proveedor?.tipo_servicio ?? ""}>
                <option value="">—</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Localidad">
              <Input name="localidad" defaultValue={proveedor?.localidad ?? ""} />
            </Field>
          </div>
          <Field label="Contacto">
            <Input name="contacto" defaultValue={proveedor?.contacto ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input name="email" type="email" defaultValue={proveedor?.email ?? ""} />
            </Field>
            <Field label="Teléfono">
              <Input name="telefono" defaultValue={proveedor?.telefono ?? ""} />
            </Field>
          </div>
          <Field label="Notas">
            <Textarea name="notas" defaultValue={proveedor?.notas ?? ""} />
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
