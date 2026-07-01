"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventarioDialog, ESTADO_INV } from "@/components/inventario/InventarioDialog";
import { eur, normaliza } from "@/lib/format";
import type { Inventario } from "@/lib/types";

export function InventarioGrid({ items }: { items: Inventario[] }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [estado, setEstado] = React.useState("");

  const categorias = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.categoria).filter(Boolean))) as string[],
    [items],
  );

  const visibles = items.filter((it) => {
    if (cat && it.categoria !== cat) return false;
    if (estado && it.estado !== estado) return false;
    if (q.trim()) {
      const t = normaliza(q.trim());
      if (!normaliza(it.articulo).includes(t) && !normaliza(it.categoria ?? "").includes(t))
        return false;
    }
    return true;
  });

  const selectCls =
    "rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] text-ink-secondary focus:border-sage-300 focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar artículo…"
          className="min-w-[200px] flex-1 rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
          <option value="">Estado</option>
          {Object.entries(ESTADO_INV).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
        {(q || cat || estado) && (
          <button
            onClick={() => { setQ(""); setCat(""); setEstado(""); }}
            className="rounded-sm border-med border-border-strong px-3 py-2 text-[12px] text-ink-secondary hover:bg-beige-warm"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="text-[12px] text-ink-muted">{visibles.length} artículos</div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((it) => {
          const est = ESTADO_INV[it.estado] ?? { label: it.estado, tone: "neutral" as const };
          return (
            <Card key={it.id} className="flex flex-col p-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-beige-warm">
                {it.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.foto_url} alt={it.articulo} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-[13px] text-ink-muted">
                    Sin foto
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <Badge tone={est.tone}>{est.label}</Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold">{it.articulo}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-muted">{it.categoria ?? "—"}</div>
                  </div>
                  <InventarioDialog articulo={it} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <div className="text-ink-muted">Stock</div>
                    <div className="font-semibold">{it.cantidad_total ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-ink-muted">Alquiler</div>
                    <div className="font-semibold tabular">
                      {it.precio_alquiler != null ? eur(it.precio_alquiler) : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
                  {it.fianza_especial && (
                    <Badge tone="clay">
                      Fianza{it.fianza_sugerida != null ? ` ${eur(it.fianza_sugerida)}` : ""}
                    </Badge>
                  )}
                  {it.ubicacion && <span className="text-ink-muted">📍 {it.ubicacion}</span>}
                </div>
                {it.notas && <p className="mt-2 text-[11px] text-ink-muted">{it.notas}</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
