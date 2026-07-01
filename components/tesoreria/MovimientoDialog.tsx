"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { guardarMovimiento } from "@/app/actions";
import {
  NATURALEZAS_MOV,
  NATURALEZA_LABEL,
  METODOS,
  ESTADOS_MOV,
  ESTADO_MOV_META,
  computaPorNaturaleza,
} from "@/lib/estados";
import type { Cliente, Oportunidad, Tesoreria, Proveedor } from "@/lib/types";

export function MovimientoDialog({
  clientes,
  oportunidades,
  proveedores = [],
  movimiento,
  tipoInicial = "gasto",
}: {
  clientes: Cliente[];
  oportunidades: Pick<Oportunidad, "id" | "numero" | "titulo">[];
  proveedores?: Pick<Proveedor, "id" | "nombre">[];
  movimiento?: Tesoreria;
  tipoInicial?: "ingreso" | "gasto";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const editar = Boolean(movimiento);

  const [tipo, setTipo] = React.useState<string>(movimiento?.tipo ?? tipoInicial);
  const [naturaleza, setNaturaleza] = React.useState<string>(
    movimiento?.naturaleza ?? (tipoInicial === "ingreso" ? "ingreso_factura" : "gasto_fijo"),
  );
  const [computa, setComputa] = React.useState(
    movimiento?.computa_contabilidad ?? computaPorNaturaleza(naturaleza),
  );

  function onNaturaleza(v: string) {
    setNaturaleza(v);
    setComputa(computaPorNaturaleza(v)); // se ajusta solo; el usuario puede cambiarlo
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await guardarMovimiento(new FormData(e.currentTarget));
      setOpen(false);
      router.refresh();
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
            <Plus size={15} /> Nuevo movimiento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={editar ? "Editar movimiento" : "Nuevo movimiento"}>
        <form onSubmit={onSubmit} className="space-y-4">
          {movimiento && <input type="hidden" name="id" value={movimiento.id} />}

          {/* Tipo (da el signo) */}
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`cursor-pointer rounded-md border-med px-4 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.06em] ${
                tipo === "ingreso"
                  ? "border-ok bg-ok-tint text-ok"
                  : "border-border bg-white text-ink-muted"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value="ingreso"
                checked={tipo === "ingreso"}
                onChange={() => setTipo("ingreso")}
                className="sr-only"
              />
              Ingreso
            </label>
            <label
              className={`cursor-pointer rounded-md border-med px-4 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.06em] ${
                tipo === "gasto"
                  ? "border-error bg-error-tint text-error"
                  : "border-border bg-white text-ink-muted"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value="gasto"
                checked={tipo === "gasto"}
                onChange={() => setTipo("gasto")}
                className="sr-only"
              />
              Gasto
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Importe € *" className="col-span-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                name="importe"
                defaultValue={movimiento?.importe ?? ""}
                required
                autoFocus
                placeholder="0,00"
              />
            </Field>
            <Field label="Concepto *" className="col-span-2">
              <Input name="concepto" defaultValue={movimiento?.concepto ?? ""} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Naturaleza">
              <Select name="naturaleza" value={naturaleza} onChange={(e) => onNaturaleza(e.target.value)}>
                {NATURALEZAS_MOV.map((n) => (
                  <option key={n} value={n}>{NATURALEZA_LABEL[n]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Input name="categoria" defaultValue={movimiento?.categoria ?? ""} placeholder="Gasolina, Seña…" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Estado">
              <Select name="estado" defaultValue={movimiento?.estado ?? (tipo === "ingreso" ? "cobrado" : "pagado")}>
                {ESTADOS_MOV.map((s) => (
                  <option key={s} value={s}>{ESTADO_MOV_META[s].label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Método">
              <Select name="metodo" defaultValue={movimiento?.metodo ?? ""}>
                <option value="">—</option>
                {METODOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha">
              <Input type="date" name="fecha" defaultValue={movimiento?.fecha ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Evento (opcional)">
              <Select name="oportunidad_id" defaultValue={movimiento?.oportunidad_id ?? ""}>
                <option value="">— Ninguno —</option>
                {oportunidades.map((o) => (
                  <option key={o.id} value={o.id}>{o.numero} · {o.titulo}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cliente (opcional)">
              <Select name="cliente_id" defaultValue={movimiento?.cliente_id ?? ""}>
                <option value="">— Ninguno —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            </Field>
          </div>

          {proveedores.length > 0 && (
            <Field label="Proveedor (opcional)">
              <Select name="proveedor_id" defaultValue={movimiento?.proveedor_id ?? ""}>
                <option value="">— Ninguno —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </Field>
          )}

          <label className="flex items-center gap-2 rounded-md bg-beige-light px-3 py-2 text-[12px]">
            <input
              type="checkbox"
              name="computa_contabilidad"
              checked={computa}
              onChange={(e) => setComputa(e.target.checked)}
              className="h-4 w-4 accent-sage"
            />
            <span>
              Computa en la contabilidad mensual{" "}
              <span className="text-ink-muted">(solo facturas propias y gastos fijos, §5.4)</span>
            </span>
          </label>

          <Field label="Notas">
            <Textarea name="notas" defaultValue={movimiento?.notas ?? ""} />
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
