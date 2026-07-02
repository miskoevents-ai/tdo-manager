"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, Heart, Users, RefreshCw, Copy, Check } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { marcarResena, marcarRecomendacion } from "@/app/actions";
import { fecha } from "@/lib/format";
import {
  msgResena,
  msgRecomendacion,
  msgAniversario,
  msgReactivar,
  type AccionResena,
  type AccionAniversario,
  type AccionRecomendacion,
  type AccionReactivar,
} from "@/lib/fidelizacion";

function CopiarMensaje({ texto }: { texto: string }) {
  const [copiado, setCopiado] = React.useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar mensaje para enviar por WhatsApp o email"
      className="inline-flex shrink-0 items-center gap-1 rounded-sm border-hair border-sage-tint-deep bg-sage-tint/50 px-2 py-1 text-[11px] font-semibold text-sage hover:bg-sage-tint"
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />}
      {copiado ? "Copiado" : "Copiar mensaje"}
    </button>
  );
}

function BotonAccion({
  onClick,
  children,
  tone = "sage",
}: {
  onClick: () => Promise<void>;
  children: React.ReactNode;
  tone?: "sage" | "clay";
}) {
  const [busy, setBusy] = React.useState(false);
  const cls =
    tone === "clay"
      ? "border-clay-tint-deep bg-clay-tint/50 text-clay hover:bg-clay-tint"
      : "border-sage-tint-deep bg-sage-tint/50 text-sage hover:bg-sage-tint";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm border-hair px-2 py-1 text-[11px] font-semibold disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

function Fila({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border py-2.5 text-[13px] first:border-t-0">
      {children}
    </div>
  );
}

const Info = ({ nombre, sub }: { nombre: string; sub: string }) => (
  <span className="mr-auto flex min-w-0 flex-col">
    <span className="truncate font-medium">{nombre}</span>
    <span className="truncate text-[11.5px] text-ink-muted">{sub}</span>
  </span>
);

export function FidelizacionClient({
  resenas,
  aniversarios,
  recomendaciones,
  reactivar,
}: {
  resenas: AccionResena[];
  aniversarios: AccionAniversario[];
  recomendaciones: AccionRecomendacion[];
  reactivar: AccionReactivar[];
}) {
  const router = useRouter();
  const refrescar = () => router.refresh();

  const TIPO_LABEL: Record<string, string> = {
    empresa: "Empresa",
    wedding_planner: "Wedding planner",
    finca_venue: "Finca / venue",
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 1 · Pedir reseña */}
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Star size={15} className="text-clay" /> Pedir reseña
          </span>
          <span className="font-body text-[11px] font-medium text-ink-muted">
            {resenas.length} evento{resenas.length === 1 ? "" : "s"}
          </span>
        </CardTitle>
        {resenas.length === 0 && (
          <p className="py-2 text-small text-ink-muted">No hay eventos recientes pendientes. 🎉</p>
        )}
        {resenas.map((r) => (
          <Fila key={r.id}>
            <Info nombre={r.cliente} sub={`${r.titulo} · hace ${r.dias} día${r.dias === 1 ? "" : "s"}`} />
            {r.pedida && <Badge tone="sage">Pedida</Badge>}
            <CopiarMensaje texto={msgResena(r.cliente)} />
            {!r.pedida && (
              <BotonAccion onClick={() => marcarResena(r.id, "resena_pedida", true).then(refrescar)}>
                Marcar pedida
              </BotonAccion>
            )}
            <BotonAccion
              tone="clay"
              onClick={() => marcarResena(r.id, "resena_conseguida", true).then(refrescar)}
            >
              <Star size={12} /> Conseguida
            </BotonAccion>
          </Fila>
        ))}
      </Card>

      {/* 2 · Aniversarios de boda */}
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Heart size={15} className="text-clay" /> Aniversarios de boda
          </span>
          <span className="font-body text-[11px] font-medium text-ink-muted">este mes</span>
        </CardTitle>
        {aniversarios.length === 0 && (
          <p className="py-2 text-small text-ink-muted">Ninguna boda cumple años este mes.</p>
        )}
        {aniversarios.map((a) => (
          <Fila key={a.id}>
            <Info
              nombre={a.cliente}
              sub={`${a.anios}º aniversario · boda del ${fecha(a.fechaEvento)}`}
            />
            <CopiarMensaje texto={msgAniversario(a.cliente, a.anios)} />
          </Fila>
        ))}
      </Card>

      {/* 3 · Recomendaciones / referidos */}
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Users size={15} className="text-clay" /> Recomendaciones
          </span>
          <span className="font-body text-[11px] font-medium text-ink-muted">
            {recomendaciones.length} cliente{recomendaciones.length === 1 ? "" : "s"}
          </span>
        </CardTitle>
        {recomendaciones.length === 0 && (
          <p className="py-2 text-small text-ink-muted">Sin clientes pendientes por ahora.</p>
        )}
        {recomendaciones.map((r) => (
          <Fila key={r.id}>
            <Info
              nombre={r.nombre}
              sub={`${r.eventos} evento${r.eventos === 1 ? "" : "s"} contratado${r.eventos === 1 ? "" : "s"}`}
            />
            {r.pedida && <Badge tone="sage">Pedida</Badge>}
            <CopiarMensaje texto={msgRecomendacion(r.nombre)} />
            {!r.pedida && (
              <BotonAccion
                onClick={() => marcarRecomendacion(r.id, "recomendacion_pedida", true).then(refrescar)}
              >
                Marcar pedida
              </BotonAccion>
            )}
            <BotonAccion
              tone="clay"
              onClick={() => marcarRecomendacion(r.id, "nos_ha_recomendado", true).then(refrescar)}
            >
              <Check size={12} /> Nos ha recomendado
            </BotonAccion>
          </Fila>
        ))}
      </Card>

      {/* 4 · Reactivar clientes B2B */}
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <RefreshCw size={15} className="text-clay" /> Reactivar clientes B2B
          </span>
          <span className="font-body text-[11px] font-medium text-ink-muted">+6 meses sin contratar</span>
        </CardTitle>
        {reactivar.length === 0 && (
          <p className="py-2 text-small text-ink-muted">Sin clientes B2B que reactivar. 👍</p>
        )}
        {reactivar.map((r) => (
          <Fila key={r.id}>
            <Info
              nombre={r.nombre}
              sub={`${TIPO_LABEL[r.tipo] ?? r.tipo} · último evento hace ${r.meses} meses`}
            />
            <CopiarMensaje texto={msgReactivar(r.nombre)} />
          </Fila>
        ))}
      </Card>
    </div>
  );
}
