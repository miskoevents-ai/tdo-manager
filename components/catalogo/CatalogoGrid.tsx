"use client";

import * as React from "react";
import Image from "next/image";
import { X, Sparkles } from "lucide-react";
import { fotoUrl, CATEGORIAS, CAT_LABEL, type CatalogoItem } from "@/lib/catalogo";
import { eur } from "@/lib/format";

// Imagen del catálogo con doble vía: primero intenta la versión optimizada
// (Vercel la redimensiona a WebP ligero y la cachea); si el optimizador falla
// por lo que sea, cae a la imagen directa de Supabase (probada y funcional).
// Solo si ambas fallan se muestra el fondo suave.
function FotoCatalogo({ archivo, alt, grande = false }: { archivo: string; alt: string; grande?: boolean }) {
  // fase 0 = optimizada · fase 1 = directa (sin optimizador) · fase 2 = fallo
  const [fase, setFase] = React.useState(0);

  if (fase >= 2) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-beige-warm">
        <Sparkles size={18} className="text-ink-muted" />
      </div>
    );
  }
  return (
    <Image
      key={fase}
      src={fotoUrl(archivo)}
      alt={alt}
      fill
      quality={70}
      unoptimized={fase === 1}
      sizes={grande ? "90vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
      onError={() => setFase((f) => f + 1)}
      className={
        grande
          ? "object-contain"
          : "object-cover transition-transform duration-300 group-hover:scale-105"
      }
    />
  );
}

// Normaliza para buscar sin acentos ni mayúsculas.
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function CatalogoGrid({ items }: { items: CatalogoItem[] }) {
  const [cat, setCat] = React.useState<string>("");
  const [q, setQ] = React.useState("");
  const [abierto, setAbierto] = React.useState<CatalogoItem | null>(null);

  const visibles = items.filter((it) => {
    if (cat && !it.categorias.includes(cat)) return false;
    if (q.trim()) {
      const t = norm(q);
      const hay =
        norm(it.nombre ?? "").includes(t) ||
        norm(it.descripcion).includes(t) ||
        it.categorias.some((c) => norm(CAT_LABEL[c] ?? c).includes(t));
      if (!hay) return false;
    }
    return true;
  });

  const cuenta = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      for (const c of it.categorias) m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  }, [items]);

  const total = items.length;
  const clave = (it: CatalogoItem) => it.archivo ?? `pack-${it.nombre}`;

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
      {/* Buscador + filtros por categoría */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar en el catálogo… (girasoles, arco, columpio, seating…)"
        className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
      />
      <div className="no-scrollbar flex flex-wrap gap-2">
        <Chip k="" label="Todo" n={total} />
        {CATEGORIAS.filter((c) => cuenta[c.key]).map((c) => (
          <Chip key={c.key} k={c.key} label={c.label} n={cuenta[c.key] ?? 0} />
        ))}
        {q.trim() && (
          <span className="ml-auto self-center text-[11.5px] text-ink-muted">
            {visibles.length} resultado{visibles.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Galería */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibles.map((it) => (
          <button
            key={clave(it)}
            type="button"
            onClick={() => setAbierto(it)}
            className="group flex flex-col overflow-hidden rounded-[12px] border-hair border-border bg-white text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
          >
            {it.archivo ? (
              <div className="relative aspect-[4/3] overflow-hidden bg-beige-warm">
                <FotoCatalogo archivo={it.archivo} alt={it.nombre ?? it.descripcion} />
              </div>
            ) : (
              // Pack del dossier sin foto propia: tarjeta de texto elegante.
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-gradient-to-br from-sage-tint/60 to-beige-warm px-4 text-center">
                <Sparkles size={18} className="text-sage" />
                <span className="font-display text-[14px] leading-snug text-sage">
                  {it.nombre}
                </span>
              </div>
            )}
            <div className="flex flex-1 flex-col p-2.5">
              {it.nombre && it.archivo && (
                <span className="mb-0.5 text-[12px] font-semibold leading-snug">{it.nombre}</span>
              )}
              <p className="line-clamp-2 text-[11.5px] leading-snug text-ink-secondary">
                {it.descripcion}
              </p>
              <div className="mt-auto flex items-center justify-between pt-1.5">
                <span className="truncate text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                  {(it.categorias[0] && CAT_LABEL[it.categorias[0]]) ?? ""}
                </span>
                {typeof it.precio === "number" && (
                  <span className="tabular text-[12.5px] font-semibold text-sage">{eur(it.precio)}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="py-8 text-center text-small text-ink-muted">
          {q.trim()
            ? `Nada que coincida con «${q.trim()}». Prueba con otra palabra.`
            : "No hay referencias en esta categoría todavía."}
        </p>
      )}

      {/* Lightbox / ficha */}
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
              {abierto.archivo ? (
                <div className="relative h-[60vh] w-full">
                  <FotoCatalogo
                    archivo={abierto.archivo}
                    alt={abierto.nombre ?? abierto.descripcion}
                    grande
                  />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-sage-tint/60 to-beige-warm">
                  <Sparkles size={26} className="text-sage" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setAbierto(null)}
                className="absolute right-2 top-2 rounded-full bg-white/85 p-1.5 text-ink-secondary hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              {abierto.nombre && (
                <h3 className="font-display text-[18px] text-ink">{abierto.nombre}</h3>
              )}
              <p className="mt-1 text-[13.5px] text-ink-secondary">{abierto.descripcion}</p>
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
                  <span className="ml-auto tabular text-[16px] font-semibold text-sage">
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
