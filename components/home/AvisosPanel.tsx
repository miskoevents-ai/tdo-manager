"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X, Check, ChevronRight } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { marcarCobradoOportunidad, toggleFianzaDevuelta } from "@/app/actions";
import { PersonaCajaModal } from "@/components/ui/PersonaCajaModal";
import type { Aviso } from "@/lib/avisos";

const SEV_CLASS: Record<string, string> = {
  alta: "border-error/30 bg-error-tint text-error",
  media: "border-[#e7d3a6] bg-warn-tint text-[#7a5a1a]",
  baja: "border-sage-tint-deep bg-sage-tint/50 text-sage",
};

const KEY = "tdo_avisos_ocultos";

export function AvisosPanel({ avisos, responsables = [] }: { avisos: Aviso[]; responsables?: string[] }) {
  const router = useRouter();
  const [ocultos, setOcultos] = React.useState<string[]>([]);
  const [cargado, setCargado] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  // Aviso de cobro pendiente de confirmar quién recibió el dinero.
  const [cobrando, setCobrando] = React.useState<Aviso | null>(null);

  React.useEffect(() => {
    try {
      setOcultos(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      /* ignore */
    }
    setCargado(true);
  }, []);

  function ocultar(id: string) {
    setOcultos((prev) => {
      const n = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem(KEY, JSON.stringify(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  }

  async function resolver(a: Aviso, cobradoPor?: string | null) {
    if (!a.oportunidadId) return;
    // Un cobro pregunta primero quién recibió el dinero (equipo o caja).
    if (a.categoria === "cobro" && cobradoPor === undefined && responsables.length > 0) {
      setCobrando(a);
      return;
    }
    setBusy(a.id);
    try {
      if (a.categoria === "cobro") await marcarCobradoOportunidad(a.oportunidadId, cobradoPor ?? null);
      else if (a.categoria === "fianza") await toggleFianzaDevuelta(a.oportunidadId, true);
      router.refresh();
    } finally {
      setBusy(null);
      setCobrando(null);
    }
  }

  // Antes de leer localStorage no filtramos (evita parpadeo); tras cargar, ocultamos.
  const visibles = cargado ? avisos.filter((a) => !ocultos.includes(a.id)) : avisos;
  if (visibles.length === 0) return null;

  const resoluble = (a: Aviso) => Boolean(a.oportunidadId) && (a.categoria === "cobro" || a.categoria === "fianza");

  return (
    <Card className="border-l-[3px] border-l-clay">
      <CardTitle>
        <span className="flex items-center gap-2">
          <Bell size={15} className="text-clay" /> Avisos
        </span>
        <span className="font-body text-[11px] font-medium tracking-[0.03em] text-ink-muted">
          {visibles.length} para revisar
        </span>
      </CardTitle>
      <div className="mt-1 space-y-2">
        {visibles.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-1 rounded-md border-hair px-3 py-2 text-[12.5px] ${SEV_CLASS[a.severidad]}`}
          >
            <Link href={a.href} className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{a.titulo}</span>
                <span className="truncate text-[11px] opacity-80">{a.detalle}</span>
              </span>
              <ChevronRight size={15} className="ml-auto shrink-0 opacity-50" />
            </Link>
            {resoluble(a) && (
              <button
                onClick={() => resolver(a)}
                disabled={busy === a.id}
                title={a.categoria === "cobro" ? "Marcar cobrado" : "Marcar fianza devuelta"}
                className="shrink-0 rounded-sm p-1 hover:bg-white/60"
              >
                <Check size={15} />
              </button>
            )}
            <button
              onClick={() => ocultar(a.id)}
              title="Quitar del inicio"
              className="shrink-0 rounded-sm p-1 hover:bg-white/60"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      {cobrando && (
        <PersonaCajaModal
          titulo="Marcar como cobrado"
          descripcion={cobrando.titulo}
          responsables={responsables}
          busy={busy === cobrando.id}
          confirmLabel="Cobrado"
          onConfirm={({ persona }) => resolver(cobrando, persona)}
          onClose={() => setCobrando(null)}
        />
      )}
    </Card>
  );
}
