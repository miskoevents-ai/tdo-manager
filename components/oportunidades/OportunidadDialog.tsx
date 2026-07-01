"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarOportunidad } from "@/app/actions";
import type { Cliente, Lugar, Oportunidad } from "@/lib/types";
import { TIPO_EVENTO_LABEL, ESTADOS_TODOS, ESTADO_META } from "@/lib/estados";

export function OportunidadDialog({
  clientes,
  lugares,
  oportunidad,
}: {
  clientes: Cliente[];
  lugares: Lugar[];
  oportunidad?: Oportunidad;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(oportunidad);

  // Retención sugerida según el cliente seleccionado (empresa → 15%).
  const [clienteId, setClienteId] = React.useState(oportunidad?.cliente_id ?? "");
  const clienteSel = clientes.find((c) => c.id === clienteId);
  const retSugerida = clienteSel?.tipo === "empresa" ? 15 : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await guardarOportunidad(new FormData(e.currentTarget));
      setOpen(false);
      if (!editar && id) router.push(`/oportunidades/${id}`);
      else router.refresh();
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
          <Button variant="outline" size="sm">
            <Pencil size={14} /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus size={15} /> Nueva oportunidad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar oportunidad" : "Nueva oportunidad"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {oportunidad && <input type="hidden" name="id" value={oportunidad.id} />}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Número *">
              <Input name="numero" defaultValue={oportunidad?.numero} required placeholder="26014" />
            </Field>
            <Field label="Título *" className="col-span-2">
              <Input name="titulo" defaultValue={oportunidad?.titulo} required />
            </Field>
          </div>

          <Field label="Cliente">
            <Select
              name="cliente_id"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de evento">
              <Select name="tipo_evento" defaultValue={oportunidad?.tipo_evento ?? "boda"}>
                {Object.entries(TIPO_EVENTO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Serie">
              <Select name="serie" defaultValue={oportunidad?.serie ?? "evento"}>
                <option value="evento">Evento</option>
                <option value="alquiler_encargo">Alquiler / encargo</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              <Select name="estado" defaultValue={oportunidad?.estado ?? "nueva"}>
                {ESTADOS_TODOS.map((s) => (
                  <option key={s} value={s}>{ESTADO_META[s].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Operación">
              <Select name="tipo_operacion" defaultValue={oportunidad?.tipo_operacion ?? "normal"}>
                <option value="normal">Normal (con factura)</option>
                <option value="amigos_prestamo">Amigos / préstamo</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lugar">
              <Select name="lugar_id" defaultValue={oportunidad?.lugar_id ?? ""}>
                <option value="">— Sin lugar —</option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha del evento">
              <Input type="date" name="fecha_evento" defaultValue={oportunidad?.fecha_evento ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Field label="Invitados">
              <Input type="number" name="n_invitados" defaultValue={oportunidad?.n_invitados ?? ""} />
            </Field>
            <Field label="IVA %">
              <Input type="number" step="0.01" name="iva_pct" defaultValue={oportunidad?.iva_pct ?? 21} />
            </Field>
            <Field label="Retención %">
              <Input
                type="number"
                step="0.01"
                name="retencion_pct"
                key={retSugerida + (oportunidad?.id ?? "")}
                defaultValue={oportunidad?.retencion_pct ?? retSugerida}
              />
            </Field>
            <Field label="Fianza €">
              <Input type="number" step="0.01" name="fianza" defaultValue={oportunidad?.fianza ?? ""} />
            </Field>
          </div>

          <Field label="Responsable">
            <Input name="responsable" defaultValue={oportunidad?.responsable ?? ""} />
          </Field>
          <Field label="Notas">
            <Textarea name="notas" defaultValue={oportunidad?.notas ?? ""} />
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
