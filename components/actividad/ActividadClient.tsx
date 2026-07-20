"use client";

import * as React from "react";
import Link from "next/link";
import { Select, Input } from "@/components/ui/input";
import type { RegistroActividad } from "@/lib/types";

const COLORES = ["bg-sage", "bg-clay", "bg-ok", "bg-warn", "bg-[#7a6cae]", "bg-[#3f7fa3]"];
function colorDe(nombre: string) {
  let n = 0;
  for (const c of nombre) n = (n + c.charCodeAt(0)) % COLORES.length;
  return COLORES[n];
}

function cuando(iso: string): string {
  const d = new Date(iso);
  const dif = Date.now() - d.getTime();
  const min = Math.round(dif / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// A qué pantalla lleva cada registro según su entidad.
function enlaceDe(r: RegistroActividad): string | null {
  if (r.entidad === "oportunidad" && r.entidad_id) return `/oportunidades/${r.entidad_id}`;
  if (r.entidad === "factura") return "/facturas";
  if (r.entidad === "tarea") return "/tareas";
  if (r.entidad === "movimiento") return "/tesoreria";
  if (r.entidad === "proveedor") return "/proveedores";
  if (r.entidad === "equipo") return "/equipo";
  return null;
}

const ENTIDADES: Record<string, string> = {
  oportunidad: "Oportunidades",
  factura: "Facturas",
  movimiento: "Movimientos",
  tarea: "Tareas",
  proveedor: "Proveedores",
  equipo: "Equipo",
  usuario: "Usuarios",
};

function agrupaPorDia(items: RegistroActividad[]) {
  const grupos: Record<string, RegistroActividad[]> = {};
  for (const it of items) {
    const dia = new Date(it.created_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    (grupos[dia] ??= []).push(it);
  }
  return Object.entries(grupos);
}

export function ActividadClient({ registros }: { registros: RegistroActividad[] }) {
  const [persona, setPersona] = React.useState("");
  const [entidad, setEntidad] = React.useState("");
  const [busca, setBusca] = React.useState("");

  const personas = React.useMemo(
    () => Array.from(new Set(registros.map((r) => r.usuario).filter(Boolean) as string[])).sort(),
    [registros],
  );
  const entidades = React.useMemo(
    () => Array.from(new Set(registros.map((r) => r.entidad).filter(Boolean) as string[])),
    [registros],
  );

  const t = busca.trim().toLowerCase();
  const filtrados = registros.filter(
    (r) =>
      (!persona || r.usuario === persona) &&
      (!entidad || r.entidad === entidad) &&
      (!t ||
        (r.detalle ?? "").toLowerCase().includes(t) ||
        (r.accion ?? "").toLowerCase().includes(t) ||
        (r.usuario ?? "").toLowerCase().includes(t)),
  );
  const dias = agrupaPorDia(filtrados);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px]">
          <span className="mb-1 block font-semibold uppercase tracking-[0.08em] text-ink-muted">Persona</span>
          <Select value={persona} onChange={(e) => setPersona(e.target.value)} className="w-auto">
            <option value="">Todo el equipo</option>
            {personas.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </label>
        <label className="text-[12px]">
          <span className="mb-1 block font-semibold uppercase tracking-[0.08em] text-ink-muted">Tipo</span>
          <Select value={entidad} onChange={(e) => setEntidad(e.target.value)} className="w-auto">
            <option value="">Todo</option>
            {entidades.map((en) => <option key={en} value={en}>{ENTIDADES[en] ?? en}</option>)}
          </Select>
        </label>
        <label className="text-[12px]">
          <span className="mb-1 block font-semibold uppercase tracking-[0.08em] text-ink-muted">Buscar</span>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Concepto, acción…" className="w-auto" />
        </label>
        <span className="pb-2 text-[12px] text-ink-muted">{filtrados.length} acciones</span>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-small text-ink-muted">No hay actividad con esos filtros.</p>
      ) : (
        <div className="space-y-6">
          {dias.map(([dia, items]) => (
            <div key={dia}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{dia}</p>
              <div className="overflow-hidden rounded-lg border-hair border-border bg-white">
                {items.map((it) => {
                  // Sin usuario = sesión con la contraseña compartida (anónima).
                  // Se etiqueta como tal, no como un misterio.
                  const quien = it.usuario ?? "Sesión compartida";
                  const href = enlaceDe(it);
                  const contenido = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-cream ${colorDe(quien)}`}>
                        {quien[0]?.toUpperCase() ?? "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px]">
                          <b>{quien}</b> {it.accion}
                          {it.detalle && <span className="text-ink-secondary"> — {it.detalle}</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {cuando(it.created_at)}
                          {href && <span className="text-sage"> · ver →</span>}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <div key={it.id} className="border-t border-border first:border-t-0">
                      {href ? (
                        <Link href={href} className="block hover:bg-beige-light">{contenido}</Link>
                      ) : (
                        contenido
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
