"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, RotateCcw, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  guardarVersionPresupuesto,
  restaurarVersionPresupuesto,
  borrarVersionPresupuesto,
} from "@/app/actions";
import { eur, fecha } from "@/lib/format";

export type VersionRow = {
  id: string;
  version: number;
  notas: string | null;
  total: number;
  created_at: string;
};

// Historial de versiones del presupuesto (V1, V2…): cada una es una foto fija
// de lo que se envió al cliente. Guardar antes de cambiar precios = poder
// volver atrás y saber siempre qué versión vio el cliente.
export function VersionesPresupuesto({
  oportunidadId,
  versiones,
}: {
  oportunidadId: string;
  versiones: VersionRow[];
}) {
  const router = useRouter();
  const [notas, setNotas] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(key);
    setError(null);
    setOk(null);
    try {
      await fn();
      if (okMsg) setOk(okMsg);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const siguiente = (versiones[0]?.version ?? 0) + 1;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          Versiones guardadas
        </span>
        <div className="flex items-center gap-2">
          <Input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Nota (ej. «la enviada el 12/06»)"
            className="w-[220px] py-2 text-[12px]"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              run(
                "guardar",
                async () => {
                  await guardarVersionPresupuesto(oportunidadId, notas || null);
                  setNotas("");
                },
                `Guardada como V${siguiente}.`,
              )
            }
          >
            <Save size={14} /> {busy === "guardar" ? "Guardando…" : `Guardar como V${siguiente}`}
          </Button>
        </div>
      </div>
      {versiones.length === 0 && (
        <p className="py-1 text-[12px] text-ink-muted">
          Aún no hay versiones. Guarda una antes de cambiar precios: así queda constancia de lo que
          vio el cliente y puedes volver atrás.
        </p>
      )}
      {versiones.map((v) => (
        <div
          key={v.id}
          className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-[9px] text-[13px] first:border-t-0"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span>
              <b>V{v.version}</b>
              {v.notas ? ` · ${v.notas}` : ""}
            </span>
            <small className="text-[11.5px] text-ink-muted">
              {fecha(v.created_at)} · total {eur(Number(v.total))}
            </small>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/oportunidades/${oportunidadId}/presupuesto?v=${v.id}`}
              className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary hover:bg-beige-warm"
            >
              <FileDown size={12} /> Ver PDF
            </Link>
            <button
              title="Restaurar esta versión (sustituye las líneas actuales)"
              disabled={busy !== null}
              onClick={() => {
                if (!confirm(`¿Restaurar la V${v.version}? Las líneas actuales se sustituyen (guárdalas antes como versión si quieres conservarlas).`)) return;
                run("restaurar", () => restaurarVersionPresupuesto(v.id), `V${v.version} restaurada.`);
              }}
              className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary hover:bg-beige-warm"
            >
              <RotateCcw size={12} /> Restaurar
            </button>
            <button
              title="Borrar esta versión"
              disabled={busy !== null}
              onClick={() => {
                if (!confirm(`¿Borrar la V${v.version}? No afecta al presupuesto actual.`)) return;
                run("borrar", () => borrarVersionPresupuesto(v.id));
              }}
              className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      {error && <p className="mt-2 text-caption text-error">{error}</p>}
      {ok && <p className="mt-2 text-caption text-ok">{ok}</p>}
    </div>
  );
}
