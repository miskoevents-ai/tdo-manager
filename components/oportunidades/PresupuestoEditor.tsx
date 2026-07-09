"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarLineas } from "@/app/actions";
import { calcularTotales } from "@/lib/calc";
import { eur, num, normaliza } from "@/lib/format";
import type { PresupuestoLinea } from "@/lib/types";

type Fila = { concepto: string; cantidad: number; precio_unitario: number; articulo_id?: string | null; bloque?: string | null; via?: string | null };

// Bloques sugeridos (los de los presupuestos reales); se puede escribir otro.
const BLOQUES_SUGERIDOS = ["Decoración", "Alquiler de material", "Flores", "Transporte y montaje"];
export type CatalogoItem = {
  id: string;
  articulo: string;
  precio_alquiler: number | null;
  fianza_sugerida: number | null;
};

export function PresupuestoEditor({
  oportunidadId,
  lineasIniciales,
  ivaPct,
  retPct,
  esEmpresa,
  catalogo = [],
}: {
  oportunidadId: string;
  lineasIniciales: PresupuestoLinea[];
  ivaPct: number;
  retPct: number;
  esEmpresa: boolean;
  catalogo?: CatalogoItem[];
}) {
  const router = useRouter();
  const [filas, setFilas] = React.useState<Fila[]>(
    lineasIniciales.length
      ? lineasIniciales.map((l) => ({
          concepto: l.concepto,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
          articulo_id: l.articulo_id ?? null,
          bloque: l.bloque ?? null,
          via: l.via ?? "factura",
        }))
      : [{ concepto: "", cantidad: 1, precio_unitario: 0, articulo_id: null, bloque: null, via: "factura" }],
  );
  const [iva, setIva] = React.useState(ivaPct);
  const [ret, setRet] = React.useState(retPct);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const totales = calcularTotales(filas, iva, ret);

  function setFila(i: number, patch: Partial<Fila>) {
    setFilas((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addFila() {
    // La línea nueva hereda el bloque de la última (lo normal es seguir en él).
    setFilas((f) => [
      ...f,
      {
        concepto: "",
        cantidad: 1,
        precio_unitario: 0,
        articulo_id: null,
        bloque: f[f.length - 1]?.bloque ?? null,
        via: f[f.length - 1]?.via ?? "factura",
      },
    ]);
  }
  function delFila(i: number) {
    setFilas((f) => (f.length === 1 ? f : f.filter((_, idx) => idx !== i)));
  }
  // Añade una línea a partir de un artículo del catálogo (precio automático).
  function addDesdeCatalogo(it: CatalogoItem) {
    const nueva: Fila = {
      concepto: it.articulo,
      cantidad: 1,
      precio_unitario: Number(it.precio_alquiler ?? 0),
      articulo_id: it.id,
      bloque: null,
      via: "factura",
    };
    setFilas((f) => {
      const soloVacia = f.length === 1 && !f[0].concepto.trim() && !f[0].articulo_id;
      return soloVacia ? [nueva] : [...f, nueva];
    });
  }

  // Fianza sugerida de los artículos del catálogo presentes en el presupuesto.
  const fianzaSugerida = React.useMemo(() => {
    const byId = new Map(catalogo.map((c) => [c.id, c]));
    return filas.reduce((s, f) => {
      const it = f.articulo_id ? byId.get(f.articulo_id) : null;
      return s + (it?.fianza_sugerida ? Number(it.fianza_sugerida) * (f.cantidad || 1) : 0);
    }, 0);
  }, [filas, catalogo]);

  async function guardar() {
    setSaving(true);
    setMsg(null);
    try {
      await guardarLineas(oportunidadId, filas, iva, ret);
      setMsg("Presupuesto guardado.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Líneas */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="w-[130px] border-b border-border py-2 text-left font-semibold">Bloque</th>
              <th className="border-b border-border py-2 text-left font-semibold">Concepto</th>
              <th className="w-[70px] border-b border-border py-2 text-right font-semibold">Cant.</th>
              <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Precio €</th>
              <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Subtotal</th>
              <th className="w-[96px] border-b border-border py-2 pl-2 text-left font-semibold">Vía</th>
              <th className="w-[36px] border-b border-border py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td className="border-b border-[#f0eae1] py-1.5 pr-2">
                  <Input
                    value={f.bloque ?? ""}
                    onChange={(e) => setFila(i, { bloque: e.target.value || null })}
                    list="bloques-presupuesto"
                    placeholder="—"
                    className="py-2 text-[12px]"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    {f.articulo_id && (
                      <span title="Del catálogo de inventario" className="shrink-0 text-sage">
                        <Package size={13} />
                      </span>
                    )}
                    <Input
                      value={f.concepto}
                      onChange={(e) => setFila(i, { concepto: e.target.value })}
                      placeholder="Descripción del concepto"
                      className="py-2 text-[13px]"
                    />
                  </div>
                </td>
                <td className="border-b border-[#f0eae1] py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    value={f.cantidad || ""}
                    onChange={(e) => setFila(i, { cantidad: Number(e.target.value) })}
                    className="py-2 text-right text-[13px] tabular"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={f.precio_unitario || ""}
                    onChange={(e) => setFila(i, { precio_unitario: Number(e.target.value) })}
                    className="py-2 text-right text-[13px] tabular"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 text-right text-[13px] tabular font-semibold">
                  {eur(f.cantidad * f.precio_unitario)}
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                  <select
                    value={f.via ?? "factura"}
                    onChange={(e) => setFila(i, { via: e.target.value })}
                    title="Con factura (lleva IVA) o efectivo (sin IVA, contabilidad de amigos)"
                    className={`w-full rounded-sm border-med border-border bg-white px-1.5 py-2 text-[11.5px] focus:outline-none ${
                      f.via === "efectivo" ? "font-semibold text-clay" : "text-ink-secondary"
                    }`}
                  >
                    <option value="factura">Factura</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 text-center">
                  <button
                    onClick={() => delFila(i)}
                    className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
                    aria-label="Eliminar línea"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sugerencias de bloque: los ya usados + los habituales */}
      <datalist id="bloques-presupuesto">
        {Array.from(new Set([...filas.map((f) => f.bloque).filter(Boolean) as string[], ...BLOQUES_SUGERIDOS])).map(
          (b) => (
            <option key={b} value={b} />
          ),
        )}
      </datalist>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={addFila}>
          <Plus size={14} /> Añadir línea
        </Button>
        {catalogo.length > 0 && <CatalogoPicker catalogo={catalogo} onPick={addDesdeCatalogo} />}
        {fianzaSugerida > 0 && (
          <span className="text-[11.5px] text-ink-muted">
            Fianza sugerida del material:{" "}
            <b className="tabular text-clay">{eur(fianzaSugerida)}</b>
          </span>
        )}
      </div>

      {/* IVA / Retención + Totales */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              IVA %
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              value={iva || ""}
              onChange={(e) => setIva(Math.round(Number(e.target.value) || 0))}
              className="w-[90px] py-2 text-right text-[13px] tabular"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              Retención %
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              value={ret || ""}
              onChange={(e) => setRet(Math.round(Number(e.target.value) || 0))}
              className="w-[90px] py-2 text-right text-[13px] tabular"
            />
            <p className="mt-1 text-[10.5px] text-ink-muted">
              {esEmpresa ? "Empresa → −15% sugerido" : "Particular → sin retención"}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[280px]">
          <div className="flex justify-between border-t border-border py-2 text-[13px]">
            <span className="text-ink-secondary">
              {totales.efectivo > 0 ? "Base facturable" : "Base imponible"}
            </span>
            <span className="tabular font-semibold">{eur(totales.baseFactura)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13px]">
            <span className="text-ink-secondary">IVA ({num(iva, 0)}%)</span>
            <span className="tabular">{eur(totales.iva)}</span>
          </div>
          {ret > 0 && (
            <div className="flex justify-between py-1 text-[13px]">
              <span className="text-ink-secondary">Retención (−{num(ret, 0)}%)</span>
              <span className="tabular text-error">−{eur(totales.retencion)}</span>
            </div>
          )}
          {totales.efectivo > 0 && (
            <>
              <div className="flex justify-between border-t border-border py-1.5 text-[13px]">
                <span className="text-ink-secondary">Total factura</span>
                <span className="tabular">{eur(totales.totalFactura)}</span>
              </div>
              <div className="flex justify-between py-1 text-[13px]">
                <span className="text-clay">Efectivo (sin IVA)</span>
                <span className="tabular font-semibold text-clay">{eur(totales.efectivo)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between border-t-2 border-ink pt-2 font-display text-[17px] font-bold">
            <span>Total</span>
            <span className="tabular">{eur(totales.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={guardar} disabled={saving}>
          {saving ? "Guardando…" : "Guardar presupuesto"}
        </Button>
        {msg && <span className="text-caption text-ink-muted">{msg}</span>}
      </div>
    </div>
  );
}

// Buscador desplegable del catálogo de inventario para añadir líneas con precio automático.
function CatalogoPicker({
  catalogo,
  onPick,
}: {
  catalogo: CatalogoItem[];
  onPick: (it: CatalogoItem) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const visibles = React.useMemo(() => {
    const t = normaliza(q.trim());
    const arr = t ? catalogo.filter((c) => normaliza(c.articulo).includes(t)) : catalogo;
    return arr.slice(0, 40);
  }, [q, catalogo]);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Package size={14} /> Añadir del catálogo
      </Button>
      {open && (
        <div className="absolute z-20 mt-1 w-[300px] rounded-md border-hair border-border bg-white p-2 shadow-lg">
          <div className="flex items-center gap-1.5 rounded-sm border-med border-border px-2 py-1.5">
            <Search size={14} className="text-ink-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar artículo…"
              className="w-full text-[13px] focus:outline-none"
            />
          </div>
          <div className="mt-1 max-h-[260px] overflow-y-auto">
            {visibles.length === 0 && (
              <div className="px-2 py-3 text-center text-[12px] text-ink-muted">Sin resultados.</div>
            )}
            {visibles.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  onPick(it);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-[13px] hover:bg-beige-warm"
              >
                <span className="truncate">{it.articulo}</span>
                <span className="shrink-0 tabular text-[12px] text-ink-muted">
                  {it.precio_alquiler != null ? eur(it.precio_alquiler) : "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
