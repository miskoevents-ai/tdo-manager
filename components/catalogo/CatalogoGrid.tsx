"use client";

import * as React from "react";
import { X } from "lucide-react";
import { fotoUrl, CATEGORIAS, CAT_LABEL, type CatalogoItem } from "@/lib/catalogo";
import { eur } from "@/lib/format";

export function CatalogoGrid({ items }: { items: CatalogoItem[] }) {
  const [cat, setCat] = React.useState<string>("");
  const [abierto, setAbierto] = React.useState<CatalogoItem | null>(null);
  // Fotos que no cargan (no están en el bucket) → se ocultan, para mostrar
  // solo las que tienen foto real.
  const [rotas, setRotas] = React.useState<Record<string, boolean>>({});

  const visibles = items.filter(
    (it) => !rotas[it.archivo] && (!cat || it.categorias.includes(cat)),
  );

  // Recuento por categoría (sobre las que sí tienen foto).
  const cuenta = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      if (rotas[it.archivo]) continue;
      for (const c of it.categorias) m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  }, [items, rotas]);

  const totalConFoto = items.filter((it) => !rotas[it.archivo]).length;

  function Chip({ k, label, n }: { k: string; label: string; n: number }) {
    const activo = cat === k;
    return (
      <button
        type="button"
        onClick={() => setCat(activo ? "" : k)}
        className={`shrink-0 rounded-pill border-hair px-3 py-1 text-[12px] font-semibold transition-colors ${
          activo
            ? "border-sage bg-sage text-white"
            : "border-border bg-white text-ink-secondary hover:bg-beige-light"
        }`}
      >
        {label} <span className={activo ? "opacity-80" : "text-ink-muted"}>{n}</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros por categoría */}
      <div className="no-scrollbar flex flex-wrap gap-2">
        <Chip k="" label="Todo" n={totalConFoto} />
        {CATEGORIAS.filter((c) => cuenta[c.key]).map((c) => (
          <Chip key={c.key} k={c.key} label={c.label} n={cuenta[c.key] ?? 0} />
        ))}
      </div>

      {/* Galería */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibles.map((it) => (
          <button
            key={it.archivo}
            type="button"
            onClick={() => setAbierto(it)}
            className="group overflow-hidden rounded-[12px] border-hair border-border bg-white text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
          >
            <div className="aspect-[4/3] overflow-hidden bg-beige-warm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl(it.archivo)}
                alt={it.descripcion}
                loading="lazy"
                onError={() => setRotas((r) => ({ ...r, [it.archivo]: true }))}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-[11.5px] leading-snug text-ink-secondary">
                {it.descripcion}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="truncate text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                  {(it.categorias[0] && CAT_LABEL[it.categorias[0]]) ?? ""}
                </span>
                {typeof it.precio === "number" && (
                  <span className="tabular text-[12px] font-semibold text-sage">{eur(it.precio)}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="py-8 text-center text-small text-ink-muted">
          No hay fotos en esta categoría todavía.
        </p>
      )}

      {/* Lightbox */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
          onClick={() => setAbierto(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[14px] bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-beige-warm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl(abierto.archivo)}
                alt={abierto.descripcion}
                className="max-h-[65vh] w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setAbierto(null)}
                className="absolute right-2 top-2 rounded-full bg-white/85 p-1.5 text-ink-secondary hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-[13.5px] text-ink">{abierto.descripcion}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {abierto.categorias.map((c) => (
                  <span
                    key={c}
                    className="rounded-pill bg-sage-tint px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-sage"
                  >
                    {CAT_LABEL[c] ?? c}
                  </span>
                ))}
                {typeof abierto.precio === "number" && (
                  <span className="ml-auto tabular text-[15px] font-semibold text-sage">
                    {eur(abierto.precio)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
