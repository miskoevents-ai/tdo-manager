"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { guardarLogisticaChecklist } from "@/app/actions";
import type { LogisticaItem } from "@/lib/types";

// Requisitos habituales de un recinto (institucional o venue): se cargan de una
// plantilla y luego se marcan/editan. Cada evento tiene los suyos.
const PLANTILLA: string[] = [
  "Seguro de responsabilidad civil (RC)",
  "ART / plan de autoprotección",
  "Permisos y acreditaciones del personal",
  "Muelle de carga y descarga (horario)",
  "Parking / estacionamiento de furgonetas",
  "Montacargas / ascensor de carga",
  "Horario de acceso al recinto",
  "Normativa de decoración (ignífugo, sujeciones, no clavar…)",
  "Contacto técnico de sala",
];

export function LogisticaChecklist({
  oportunidadId,
  inicial,
}: {
  oportunidadId: string;
  inicial: LogisticaItem[] | null | undefined;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<LogisticaItem[]>(inicial ?? []);
  const [nuevo, setNuevo] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function persistir(next: LogisticaItem[]) {
    setItems(next);
    setBusy(true);
    try {
      await guardarLogisticaChecklist(oportunidadId, next);
      router.refresh();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const cargarPlantilla = () =>
    persistir([
      ...items,
      ...PLANTILLA.filter((l) => !items.some((i) => i.label === l)).map((label) => ({ label, hecho: false, nota: null })),
    ]);
  const toggle = (idx: number) => persistir(items.map((it, j) => (j === idx ? { ...it, hecho: !it.hecho } : it)));
  const setNota = (idx: number, nota: string) =>
    setItems((l) => l.map((it, j) => (j === idx ? { ...it, nota } : it)));
  const guardarNota = (idx: number) => persistir(items);
  const quitar = (idx: number) => persistir(items.filter((_, j) => j !== idx));
  const anadir = () => {
    const label = nuevo.trim();
    if (!label) return;
    setNuevo("");
    persistir([...items, { label, hecho: false, nota: null }]);
  };

  const hechos = items.filter((i) => i.hecho).length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sage">
          <ClipboardCheck size={13} /> Requisitos del recinto
          {items.length > 0 && (
            <span className="font-normal text-ink-muted">
              — {hechos}/{items.length} listos
            </span>
          )}
        </span>
        {items.length === 0 && (
          <Button variant="outline" size="sm" onClick={cargarPlantilla} disabled={busy}>
            <Plus size={13} /> Cargar checklist típico
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-ink-muted">
          Seguros, permisos, cargas y descargas, parking, montacargas, normativa… Carga el checklist típico y ajústalo.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 rounded-md bg-beige-light/60 px-2.5 py-1.5">
              <label className="flex flex-1 items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={it.hecho}
                  onChange={() => toggle(idx)}
                  className="h-4 w-4 accent-sage"
                />
                <span className={it.hecho ? "text-ink-muted line-through" : ""}>{it.label}</span>
              </label>
              <Input
                value={it.nota ?? ""}
                onChange={(e) => setNota(idx, e.target.value)}
                onBlur={() => guardarNota(idx)}
                placeholder="nota (horario, contacto, nº póliza…)"
                className="w-[240px] max-w-full py-1 text-[12px]"
              />
              <button
                onClick={() => quitar(idx)}
                className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
                title="Quitar"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), anadir())}
          placeholder="Añadir requisito…"
          className="w-auto min-w-[200px] py-1.5 text-[13px]"
        />
        <Button variant="ghost" size="sm" onClick={anadir} disabled={busy || !nuevo.trim()}>
          <Plus size={13} /> Añadir
        </Button>
      </div>
    </div>
  );
}
