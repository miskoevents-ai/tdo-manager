"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarOportunidad, crearClienteRapido } from "@/app/actions";
import type { Cliente, Lugar, Oportunidad } from "@/lib/types";
import { TIPO_EVENTO_LABEL, ESTADOS_TODOS, ESTADO_META, CANALES } from "@/lib/estados";

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

  // Lista local de clientes (para poder añadir uno nuevo al vuelo).
  const [clientesList, setClientesList] = React.useState<Cliente[]>(clientes);
  React.useEffect(() => setClientesList(clientes), [clientes]);

  // Retención sugerida según el cliente seleccionado (empresa → 15%).
  const [clienteId, setClienteId] = React.useState(oportunidad?.cliente_id ?? "");
  const clienteSel = clientesList.find((c) => c.id === clienteId);
  const retSugerida = clienteSel?.tipo === "empresa" ? 15 : 0;

  // Alta rápida de cliente
  const [nuevoAbierto, setNuevoAbierto] = React.useState(false);
  const [nuevoNombre, setNuevoNombre] = React.useState("");
  const [nuevoTipo, setNuevoTipo] = React.useState("particular");
  const [creando, setCreando] = React.useState(false);

  async function crearCliente() {
    if (!nuevoNombre.trim()) return;
    setCreando(true);
    setError(null);
    try {
      const c = await crearClienteRapido(nuevoNombre, nuevoTipo);
      const nuevo: Cliente = {
        id: c.id,
        nombre: c.nombre,
        tipo: nuevoTipo as Cliente["tipo"],
        email: null,
        telefono: null,
        nif_cif: null,
        direccion: null,
        localidad: null,
        origen: "cliente_nuevo",
        estado: "lead",
        canal: null,
        notas: null,
        created_at: new Date().toISOString(),
      };
      setClientesList((l) => [nuevo, ...l].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setClienteId(c.id);
      setNuevoAbierto(false);
      setNuevoNombre("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreando(false);
    }
  }

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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                Cliente
              </span>
              <button
                type="button"
                onClick={() => setNuevoAbierto((v) => !v)}
                className="text-[11px] font-semibold text-clay hover:text-clay-600"
              >
                {nuevoAbierto ? "Cancelar" : "+ Nuevo"}
              </button>
            </div>
            {nuevoAbierto ? (
              <div className="space-y-2 rounded-md border-hair border-clay-tint-deep bg-clay-tint/40 p-3">
                <Input
                  autoFocus
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del nuevo cliente"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      crearCliente();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}>
                    <option value="particular">Particular</option>
                    <option value="empresa">Empresa</option>
                    <option value="wedding_planner">Wedding planner</option>
                    <option value="finca_venue">Finca / venue</option>
                  </Select>
                  <Button type="button" size="sm" onClick={crearCliente} disabled={creando}>
                    {creando ? "Creando…" : "Crear (Lead)"}
                  </Button>
                </div>
              </div>
            ) : (
              <Select
                name="cliente_id"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">— Sin cliente —</option>
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            )}
            {/* Asegura que el valor viaja en el submit aunque el mini-form esté abierto */}
            {nuevoAbierto && <input type="hidden" name="cliente_id" value={clienteId} />}
          </div>

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
            <Field label="Fecha de entrada">
              <Input
                type="date"
                name="fecha_entrada"
                defaultValue={oportunidad?.fecha_entrada ?? ""}
              />
            </Field>
            <Field label="Canal">
              <Select name="canal" defaultValue={oportunidad?.canal ?? ""}>
                <option value="">— Sin especificar —</option>
                {CANALES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
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

          <Field label="Fecha devolución de la fianza">
            <Input
              type="date"
              name="fecha_devolucion_fianza"
              defaultValue={oportunidad?.fecha_devolucion_fianza ?? ""}
            />
          </Field>

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
