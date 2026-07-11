"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarSueldo, borrarSueldo } from "@/app/actions";
import { eur } from "@/lib/format";
import type { Sueldo } from "@/lib/types";

type Persona = { id: string; nombre: string };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function mesCorto(desde: string) {
  const [y, m] = desde.split("-");
  return `${MESES[Number(m) - 1] ?? m} ${y}`;
}

// Sueldo vigente en un mes: el de la fecha 'desde' más reciente que no lo supere.
function sueldoVigente(sueldos: Sueldo[], mes: string): Sueldo | null {
  const tope = `${mes}-01`;
  const orden = sueldos
    .filter((s) => s.desde <= tope)
    .sort((a, b) => (a.desde < b.desde ? 1 : -1));
  return orden[0] ?? null;
}

export function SueldosPanel({
  personas,
  sueldos,
  costeMesPorId,
  mesActual,
}: {
  personas: Persona[];
  sueldos: Sueldo[];
  costeMesPorId: Record<string, number>;
  mesActual: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState<string | null>(null);
  const [mes, setMes] = React.useState(mesActual);
  const [importe, setImporte] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const porPersona = React.useMemo(() => {
    const m = new Map<string, Sueldo[]>();
    for (const s of sueldos) {
      const arr = m.get(s.equipo_id) ?? [];
      arr.push(s);
      m.set(s.equipo_id, arr);
    }
    return m;
  }, [sueldos]);

  async function guardar(equipoId: string) {
    setBusy(true);
    setError(null);
    try {
      await guardarSueldo({ equipoId, mes, importe: Number(importe.replace(",", ".")) });
      setAbierto(null);
      setImporte("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function borrar(id: string) {
    await borrarSueldo(id);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {personas.map((p) => {
        const suyos = (porPersona.get(p.id) ?? []).sort((a, b) => (a.desde < b.desde ? 1 : -1));
        const vig = sueldoVigente(suyos, mesActual);
        const coste = costeMesPorId[p.id] ?? 0;
        const pct = vig && vig.importe > 0 ? Math.min(100, (coste / vig.importe) * 100) : 0;
        return (
          <div key={p.id} className="rounded-md border-hair border-border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold">{p.nombre}</span>
                {vig ? (
                  <span className="text-[12px] text-ink-secondary">
                    Sueldo {mesCorto(mesActual)}: <b className="tabular text-ink">{eur(vig.importe)}</b>
                  </span>
                ) : (
                  <span className="text-[12px] text-ink-muted">Sin sueldo configurado</span>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => { setAbierto(abierto === p.id ? null : p.id); setMes(mesActual); setImporte(vig ? String(vig.importe) : ""); }}>
                <Plus size={13} /> Sueldo
              </Button>
            </div>

            {/* Horas imputadas este mes vs sueldo */}
            {vig && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[11.5px] text-ink-secondary">
                  <span>Horas imputadas a proyectos este mes</span>
                  <span className="tabular">{eur(coste)} · {Math.round(pct)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-beige-warm">
                  <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {/* Historial de sueldos */}
            {suyos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suyos.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-sm bg-beige-light px-2 py-1 text-[11px] text-ink-secondary">
                    Desde {mesCorto(s.desde)}: <b className="tabular">{eur(s.importe)}</b>
                    <button onClick={() => borrar(s.id)} className="text-ink-muted hover:text-error" aria-label="Borrar sueldo">
                      <Trash2 size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Alta / edición */}
            {abierto === p.id && (
              <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-beige-light p-3">
                <label className="text-[11px] text-ink-secondary">
                  Vigente desde el mes
                  <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="mt-1 w-[150px] py-1.5 text-[12px]" />
                </label>
                <label className="text-[11px] text-ink-secondary">
                  Sueldo mensual €
                  <Input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="1000" className="mt-1 w-[120px] py-1.5 text-right text-[12px] tabular" />
                </label>
                <Button size="sm" onClick={() => guardar(p.id)} disabled={busy || !importe}>
                  <Check size={13} /> Guardar
                </Button>
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}
