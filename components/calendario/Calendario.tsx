"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CAL_META, type CalEvento, type CalTipo } from "@/lib/calendario";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const pad = (n: number) => String(n).padStart(2, "0");

export function Calendario({
  eventos,
  mesInicial,
  hoy,
}: {
  eventos: CalEvento[];
  mesInicial: string; // YYYY-MM
  hoy: string; // YYYY-MM-DD
}) {
  const [ym, setYm] = React.useState(mesInicial);
  const [activos, setActivos] = React.useState<Set<CalTipo>>(
    new Set(Object.keys(CAL_META) as CalTipo[]),
  );

  const year = Number(ym.slice(0, 4));
  const month0 = Number(ym.slice(5, 7)) - 1;

  function mueve(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  const TODOS = Object.keys(CAL_META) as CalTipo[];
  const viendoTodo = activos.size === TODOS.length;

  // Primer clic sobre un tipo → se ve SOLO ese tipo. Con un filtro ya puesto,
  // los clics añaden o quitan tipos. Si no queda ninguno, se vuelve a ver todo.
  function toggle(t: CalTipo) {
    setActivos((prev) => {
      if (prev.size === TODOS.length) return new Set([t]);
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n.size === 0 ? new Set(TODOS) : n;
    });
  }

  // Eventos del mes visibles, agrupados por fecha
  const porFecha = React.useMemo(() => {
    const map = new Map<string, CalEvento[]>();
    for (const e of eventos) {
      if (!e.fecha.startsWith(ym)) continue;
      if (!activos.has(e.tipo)) continue;
      const arr = map.get(e.fecha) ?? [];
      arr.push(e);
      map.set(e.fecha, arr);
    }
    return map;
  }, [eventos, ym, activos]);

  // Rejilla (lunes primero)
  const primerDia = (new Date(year, month0, 1).getDay() + 6) % 7;
  const diasMes = new Date(year, month0 + 1, 0).getDate();
  const celdas: (number | null)[] = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasMes; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => mueve(-1)} className="rounded-sm border-med border-border-strong p-2 text-ink-secondary hover:bg-beige-warm">
            <ChevronLeft size={16} />
          </button>
          <h2 className="min-w-[190px] text-center font-display text-h3 font-normal">
            {MESES[month0]} {year}
          </h2>
          <button onClick={() => mueve(1)} className="rounded-sm border-med border-border-strong p-2 text-ink-secondary hover:bg-beige-warm">
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setYm(hoy.slice(0, 7))}
          className="rounded-sm border-med border-border-strong px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-sage hover:bg-sage-tint"
        >
          Hoy
        </button>
      </div>

      {/* Filtro por tipo: clic en un tipo = ver solo ese tipo; más clics
          suman/quitan; "Todas" restaura la vista completa. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Ver:
        </span>
        <button
          onClick={() => setActivos(new Set(TODOS))}
          className={`rounded-pill border-hair px-3 py-1 text-[11.5px] font-semibold transition-colors ${
            viendoTodo
              ? "border-transparent bg-sage text-cream"
              : "border-border bg-white text-ink-secondary hover:border-sage-300"
          }`}
        >
          Todas
        </button>
        {TODOS.map((t) => {
          const on = activos.has(t);
          const soloEste = on && !viendoTodo;
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              title={viendoTodo ? `Ver solo ${CAL_META[t].label.toLowerCase()}` : soloEste ? "Quitar del filtro" : "Añadir al filtro"}
              className={`inline-flex items-center gap-1.5 rounded-pill border-hair px-3 py-1 text-[11.5px] font-medium transition-colors ${
                soloEste
                  ? CAL_META[t].clase + " border-transparent ring-1 ring-current"
                  : on
                    ? CAL_META[t].clase + " border-transparent opacity-80"
                    : "border-border bg-white text-ink-muted opacity-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${CAL_META[t].punto} ${on ? "" : "opacity-40"}`} />
              {CAL_META[t].label}
            </button>
          );
        })}
      </div>
      {!viendoTodo && (
        <p className="text-[11.5px] text-ink-muted">
          Mostrando solo: {TODOS.filter((t) => activos.has(t)).map((t) => CAL_META[t].label).join(", ")} ·{" "}
          <button onClick={() => setActivos(new Set(TODOS))} className="font-semibold text-sage hover:underline">
            ver todo
          </button>
        </p>
      )}

      {/* Rejilla */}
      <div className="overflow-hidden rounded-lg border-hair border-border bg-white shadow-sm">
        <div className="grid grid-cols-7 bg-beige-warm">
          {DIAS.map((d) => (
            <div key={d} className="py-2 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((d, i) => {
            const dateStr = d ? `${year}-${pad(month0 + 1)}-${pad(d)}` : "";
            const evs = d ? porFecha.get(dateStr) ?? [] : [];
            const esHoy = dateStr === hoy;
            return (
              <div
                key={i}
                className={`min-h-[92px] border-l border-t border-border p-1.5 [&:nth-child(7n+1)]:border-l-0 ${
                  d ? "" : "bg-beige-light/40"
                }`}
              >
                {d && (
                  <div className="mb-1 flex justify-end">
                    <span
                      className={`text-[12px] font-semibold ${
                        esHoy
                          ? "flex h-[21px] w-[21px] items-center justify-center rounded-full bg-clay text-cream"
                          : "text-ink-muted"
                      }`}
                    >
                      {d}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {evs.slice(0, 3).map((e, j) => {
                    const pill = (
                      <span
                        className={`block truncate rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium ${CAL_META[e.tipo].clase}`}
                        title={e.titulo}
                      >
                        {e.titulo}
                      </span>
                    );
                    return e.href ? (
                      <Link key={j} href={e.href} className="block">
                        {pill}
                      </Link>
                    ) : (
                      <div key={j}>{pill}</div>
                    );
                  })}
                  {evs.length > 3 && (
                    <span className="block px-1 text-[10px] text-ink-muted">+{evs.length - 3} más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
