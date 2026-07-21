"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Package, Search, ImagePlus, X, Upload, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarLineas, subirFotoPresupuesto } from "@/app/actions";
import { calcularTotales, importeLinea, resumenModalidades } from "@/lib/calc";
import { eur, num, normaliza } from "@/lib/format";
import { CATALOGO, fotoUrl } from "@/lib/catalogo";
import type { PresupuestoLinea } from "@/lib/types";

// Referencias del catálogo con precio de tarifario: son la fuente de precios
// del presupuesto (lo que se enseña a clientes). Cada una lleva su foto.
type RefCatalogo = { concepto: string; precio: number; foto: string | null };
const TARIFARIO: RefCatalogo[] = CATALOGO.filter((c) => (c.precio ?? 0) > 0).map((c) => ({
  concepto: c.nombre?.trim() || c.descripcion,
  precio: Number(c.precio),
  foto: c.archivo ?? null,
}));

type Fila = { concepto: string; cantidad: number; precio_unitario: number; articulo_id?: string | null; bloque?: string | null; via?: string | null; foto?: string | null; descuento_pct?: number | null; modalidad?: string | null };

const red2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Reduce una foto (típica de móvil, 5-15 MB) a un JPEG ligero (máx. 2000 px,
// calidad 0.85) antes de subirla: evita el límite de tamaño y aligera el PDF.
// Si algo falla (formato no decodable, etc.), sube el archivo original.
async function comprimirImagen(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 1_200_000) return file; // ya es ligera
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const MAX = 2000;
    const escala = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file; // si no mejora, deja el original
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Bloques sugeridos (los de los presupuestos reales); se puede escribir otro.
const BLOQUES_SUGERIDOS = ["Decoración", "Alquiler de material", "Flores", "Transporte y montaje"];
// Opciones/modalidades habituales (el cliente elige una).
const MODALIDADES_SUGERIDAS = ["C&C (recogida)", "Con montaje/desmontaje"];
export type CatalogoItem = {
  id: string;
  articulo: string;
  precio_alquiler: number | null;
  fianza_sugerida: number | null;
  foto_url?: string | null;
};

export function PresupuestoEditor({
  oportunidadId,
  lineasIniciales,
  ivaPct,
  retPct,
  descuentoPct = 0,
  esEmpresa,
  catalogo = [],
  envioAparte = 0,
}: {
  oportunidadId: string;
  lineasIniciales: PresupuestoLinea[];
  ivaPct: number;
  retPct: number;
  descuentoPct?: number;
  esEmpresa: boolean;
  catalogo?: CatalogoItem[];
  envioAparte?: number; // coste del envío que se cobra aparte (0 = no aplica)
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
          foto: l.foto ?? null,
          descuento_pct: l.descuento_pct ?? null,
          modalidad: l.modalidad ?? null,
        }))
      : [{ concepto: "", cantidad: 1, precio_unitario: 0, articulo_id: null, bloque: null, via: "factura", foto: null, descuento_pct: null, modalidad: null }],
  );
  const [iva, setIva] = React.useState(ivaPct);
  const [ret, setRet] = React.useState(retPct);
  const [dto, setDto] = React.useState(descuentoPct || 0);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [totalObjetivo, setTotalObjetivo] = React.useState("");

  const totales = calcularTotales(filas, iva, ret, dto);
  // Modalidades: opciones excluyentes (el cliente elige una). Si alguna línea
  // lleva "opción", los totales reales van por opción (común + sus líneas), no
  // sumando todo.
  const filasConConcepto = filas.filter((f) => f.concepto.trim() !== "");
  const resumen = resumenModalidades(filasConConcepto, iva, ret, dto);
  const modalidadesUsadas = Array.from(
    new Set(filas.map((f) => f.modalidad?.trim()).filter((m): m is string => Boolean(m))),
  );

  // "Cuadrar al total": escribes el TOTAL final (con IVA y retención) y se
  // reparte entre las líneas — proporcionalmente si ya tienen precio, a
  // partes iguales si están a cero. Así se puede cargar un presupuesto
  // sabiendo solo el total, sin inventarse cada subtotal.
  function repartirAlTotal() {
    const target = Number(totalObjetivo.replace(",", "."));
    if (!isFinite(target) || target <= 0) return;
    const fDto = 1 - Math.min(100, Math.max(0, dto)) / 100;
    const factorImp = 1 + iva / 100 - ret / 100;
    if (fDto <= 0 || factorImp <= 0) return;
    const conConcepto = (f: Fila) => f.concepto.trim() !== "";
    const brutoEfectivo = filas
      .filter((f) => f.via === "efectivo" && conConcepto(f))
      .reduce((s, f) => s + importeLinea(f), 0);
    // total = brutoFactura·fDto·factorImp + brutoEfectivo·fDto
    const targetBruto = (target - brutoEfectivo * fDto) / (factorImp * fDto);
    if (targetBruto <= 0) {
      setMsg("El total que has puesto no llega ni para la parte en efectivo.");
      return;
    }
    const idxs = filas.map((_, i) => i).filter((i) => filas[i].via !== "efectivo" && conConcepto(filas[i]));
    if (!idxs.length) {
      setMsg("No hay líneas de factura entre las que repartir.");
      return;
    }
    const nuevas = filas.map((f) => ({ ...f }));
    const actual = idxs.reduce((s, i) => s + importeLinea(nuevas[i]), 0);
    if (actual > 0.005) {
      const k = targetBruto / actual;
      for (const i of idxs) nuevas[i].precio_unitario = red2(nuevas[i].precio_unitario * k);
    } else {
      const parte = targetBruto / idxs.length;
      for (const i of idxs) {
        const l = nuevas[i];
        l.cantidad = l.cantidad || 1;
        const den = l.cantidad * (1 - Math.min(99.99, l.descuento_pct ?? 0) / 100);
        l.precio_unitario = red2(parte / den);
      }
    }
    // Ajuste de céntimos para clavar el total: se corrige en una línea sin
    // descuento y con cantidad 1 (si la hay).
    const logrado = idxs.reduce((s, i) => s + importeLinea(nuevas[i]), 0);
    const diff = red2(targetBruto - logrado);
    if (Math.abs(diff) >= 0.01) {
      const j = idxs.find((i) => (nuevas[i].cantidad || 1) === 1 && !nuevas[i].descuento_pct) ?? idxs[0];
      const l = nuevas[j];
      const den = (l.cantidad || 1) * (1 - Math.min(99.99, l.descuento_pct ?? 0) / 100);
      l.precio_unitario = red2(l.precio_unitario + diff / den);
    }
    setFilas(nuevas);
    setMsg("Repartido. Revisa las líneas y dale a Guardar.");
  }

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
        modalidad: f[f.length - 1]?.modalidad ?? null,
      },
    ]);
  }
  function delFila(i: number) {
    setFilas((f) => (f.length === 1 ? f : f.filter((_, idx) => idx !== i)));
  }
  // Añade una línea a partir de una referencia del catálogo (precio de
  // tarifario y foto automáticos).
  function addDesdeCatalogo(it: RefCatalogo) {
    const nueva: Fila = {
      concepto: it.concepto,
      cantidad: 1,
      precio_unitario: it.precio,
      articulo_id: null,
      bloque: null,
      via: "factura",
      foto: it.foto,
    };
    setFilas((f) => {
      const soloVacia = f.length === 1 && !f[0].concepto.trim() && !f[0].articulo_id;
      return soloVacia ? [nueva] : [...f, nueva];
    });
  }

  // Envío que se cobra aparte: si aún no hay una línea de envío, ofrecemos
  // añadirla de un clic con su coste.
  const yaHayEnvio = filas.some((f) => /env[ií]o/i.test(f.concepto));
  const mostrarBotonEnvio = envioAparte > 0 && !yaHayEnvio;
  function addEnvio() {
    setFilas((f) => {
      const nueva: Fila = {
        concepto: "Envío", cantidad: 1, precio_unitario: envioAparte,
        articulo_id: null, bloque: f[f.length - 1]?.bloque ?? null, via: "factura", foto: null, descuento_pct: null,
        modalidad: f[f.length - 1]?.modalidad ?? null,
      };
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
      await guardarLineas(oportunidadId, filas, iva, ret, dto || null);
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
              <th className="w-[120px] border-b border-border py-2 text-left font-semibold" title="Opción excluyente: deja en blanco para que la línea vaya en todas las opciones">
                Opción
              </th>
              <th className="border-b border-border py-2 text-left font-semibold">Concepto</th>
              <th className="w-[70px] border-b border-border py-2 text-right font-semibold">Cant.</th>
              <th className="w-[110px] border-b border-border py-2 text-right font-semibold">Precio €</th>
              <th className="w-[84px] border-b border-border py-2 text-right font-semibold">Dto %</th>
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
                  <Input
                    value={f.modalidad ?? ""}
                    onChange={(e) => setFila(i, { modalidad: e.target.value || null })}
                    list="modalidades-presupuesto"
                    placeholder="Común"
                    title="Opción a la que pertenece la línea. En blanco = común a todas."
                    className={`py-2 text-[12px] ${f.modalidad ? "font-semibold text-sage" : ""}`}
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <FotoPicker
                      catalogo={catalogo}
                      foto={f.foto}
                      onPick={(foto) => setFila(i, { foto })}
                    />
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
                    step="1"
                    min="0"
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
                <td className="border-b border-[#f0eae1] py-1.5 pl-2">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={f.descuento_pct || ""}
                    onChange={(e) => setFila(i, { descuento_pct: Math.min(100, Number(e.target.value) || 0) || null })}
                    placeholder="—"
                    title="Descuento de esta línea (%)"
                    className="py-2 pr-1.5 text-right text-[12px] tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </td>
                <td className="border-b border-[#f0eae1] py-1.5 text-right text-[13px] tabular font-semibold">
                  {eur(importeLinea(f))}
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

      {/* Sugerencias de opción: las ya usadas + las habituales */}
      <datalist id="modalidades-presupuesto">
        {Array.from(new Set([...modalidadesUsadas, ...MODALIDADES_SUGERIDAS])).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={addFila}>
          <Plus size={14} /> Añadir línea
        </Button>
        {TARIFARIO.length > 0 && <CatalogoPicker tarifario={TARIFARIO} onPick={addDesdeCatalogo} />}
        {mostrarBotonEnvio && (
          <Button variant="outline" size="sm" onClick={addEnvio} title="El envío está marcado como 'se cobra aparte' en la oportunidad">
            <Plus size={14} /> Añadir envío ({eur(envioAparte)})
          </Button>
        )}
        {fianzaSugerida > 0 && (
          <span className="text-[11.5px] text-ink-muted">
            Fianza sugerida del material:{" "}
            <b className="tabular text-clay">{eur(fianzaSugerida)}</b>
          </span>
        )}
      </div>

      {/* IVA / Retención / Descuento + Totales */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
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
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                Descuento %
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={dto || ""}
                onChange={(e) => setDto(Math.min(100, Number(e.target.value) || 0))}
                className="w-[90px] py-2 text-right text-[13px] tabular"
              />
              <p className="mt-1 text-[10.5px] text-ink-muted">A todo el presupuesto</p>
            </div>
          </div>

          {/* Cuadrar al total: reparte un total cerrado entre las líneas */}
          <div className="rounded-md border-hair border-border bg-beige-light p-3">
            <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
              Cuadrar al total (€)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalObjetivo}
                onChange={(e) => setTotalObjetivo(e.target.value)}
                placeholder="p. ej. 127,20"
                className="w-[130px] py-2 text-right text-[13px] tabular"
              />
              <Button variant="outline" size="sm" onClick={repartirAlTotal} disabled={!totalObjetivo}>
                Repartir
              </Button>
            </div>
            <p className="mt-1.5 max-w-[300px] text-[10.5px] leading-relaxed text-ink-muted">
              Escribe el TOTAL final (con IVA y retención) y se reparte entre las líneas: si ya
              tienen precio, proporcionalmente; si están a 0 €, a partes iguales.
            </p>
          </div>
        </div>

        <div className="w-full md:w-[280px]">
          {totales.descuento > 0 && (
            <>
              <div className="flex justify-between border-t border-border py-2 text-[13px]">
                <span className="text-ink-secondary">Suma de las líneas</span>
                <span className="tabular">{eur(totales.bruto)}</span>
              </div>
              <div className="flex justify-between py-1 text-[13px]">
                <span className="text-clay">Descuento (−{num(dto, 0)}%)</span>
                <span className="tabular font-semibold text-clay">−{eur(totales.descuento)}</span>
              </div>
            </>
          )}
          <div className={`flex justify-between py-2 text-[13px] ${totales.descuento > 0 ? "" : "border-t border-border"}`}>
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
          {resumen.hay ? (
            <div className="mt-2 border-t-2 border-ink pt-2">
              <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                Precio por opción · el cliente elige una
              </div>
              {resumen.comunTotal > 0 && (
                <div className="flex justify-between py-0.5 text-[12px] text-ink-muted">
                  <span>Común a todas</span>
                  <span className="tabular">{eur(resumen.comunTotal)}</span>
                </div>
              )}
              {resumen.opciones.map((o) => (
                <div key={o.nombre} className="flex justify-between py-1 font-display text-[15px] font-bold text-sage">
                  <span>{o.nombre}</span>
                  <span className="tabular">{eur(o.total)}</span>
                </div>
              ))}
              <p className="mt-1 text-[10px] leading-snug text-ink-muted">
                Cada opción = común + sus líneas. El desglose de arriba suma todas las líneas.
              </p>
            </div>
          ) : (
            <div className="flex justify-between border-t-2 border-ink pt-2 font-display text-[17px] font-bold">
              <span>Total</span>
              <span className="tabular">{eur(totales.total)}</span>
            </div>
          )}
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

// Foto de la línea: A) elegir de la galería (artículos del catálogo con
// foto), B) subir una imagen desde el ordenador (se guarda en Storage), o
// C) pegar un enlace (p. ej. imagen creada con IA). Base del presupuesto visual.
function FotoPicker({
  catalogo,
  foto,
  onPick,
}: {
  catalogo: CatalogoItem[];
  foto: string | null | undefined;
  onPick: (foto: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [subiendo, setSubiendo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Galería = fotos del inventario (URL en la BD) + todas las fotos del
  // catálogo (packs y productos del bucket). Así se puede colgar en la línea
  // cualquier imagen ya existente, no solo las del inventario.
  const galeria = React.useMemo(() => {
    const t = normaliza(q.trim());
    const items: { key: string; nombre: string; src: string; valor: string }[] = [];
    const vistos = new Set<string>();
    for (const c of catalogo) {
      if (!c.foto_url || vistos.has(c.foto_url)) continue;
      vistos.add(c.foto_url);
      items.push({ key: `inv-${c.id}`, nombre: c.articulo, src: c.foto_url, valor: c.foto_url });
    }
    CATALOGO.forEach((c, i) => {
      if (!c.archivo || vistos.has(c.archivo)) return;
      vistos.add(c.archivo);
      const src = fotoUrl(c.archivo);
      if (!src) return; // sin BASE de Storage no hay URL que mostrar
      items.push({ key: `cat-${i}`, nombre: c.nombre?.trim() || c.descripcion || "Catálogo", src, valor: c.archivo! });
    });
    return items.filter((x) => !t || normaliza(x.nombre).includes(t)).slice(0, 120);
  }, [q, catalogo]);

  function cerrar() {
    setOpen(false);
    setQ("");
    setUrl("");
    setError(null);
  }

  async function subirArchivo(f: File) {
    setSubiendo(true);
    setError(null);
    try {
      const comprimido = await comprimirImagen(f); // fotos de móvil → JPEG ligero
      const fd = new FormData();
      fd.set("foto", comprimido);
      const res = await subirFotoPresupuesto(fd);
      if (res.error || !res.url) {
        setError(res.error ?? "No se pudo subir la imagen.");
        return;
      }
      onPick(res.url);
      cerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="shrink-0">
      <button
        onClick={() => setOpen(true)}
        title={foto ? "Cambiar o quitar la foto de la línea" : "Añadir foto a la línea"}
        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-sm border-med ${
          foto ? "border-border" : "border-dashed border-border-strong text-ink-muted hover:bg-beige-warm"
        }`}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={14} />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrar();
          }}
        >
          <div className="max-h-[85vh] w-full max-w-[620px] overflow-y-auto rounded-lg border-hair border-border bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[18px]">Foto de la línea</h3>
              <button onClick={cerrar} className="rounded-sm p-1.5 text-ink-muted hover:bg-beige-warm">
                <X size={16} />
              </button>
            </div>

            {/* Foto actual */}
            {foto && (
              <div className="mb-4 flex items-center gap-3 rounded-md bg-beige-light p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="" className="h-16 w-16 rounded-sm object-cover" />
                <div className="flex-1 text-[12px] text-ink-muted">Foto actual de la línea</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onPick(null);
                    cerrar();
                  }}
                >
                  <X size={13} /> Quitar
                </Button>
              </div>
            )}

            {/* A · Galería */}
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">
              A · De la galería del catálogo
            </div>
            <div className="flex items-center gap-2 rounded-sm border-med border-border px-3 py-2">
              <Search size={15} className="text-ink-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar artículo con foto…"
                className="w-full text-[13px] focus:outline-none"
                autoFocus
              />
            </div>
            {galeria.length > 0 ? (
              <div className="mt-3 grid max-h-[300px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {galeria.map((it) => (
                  <button
                    key={it.key}
                    title={it.nombre}
                    onClick={() => {
                      onPick(it.valor);
                      cerrar();
                    }}
                    className="group overflow-hidden rounded-md border-med border-border text-left hover:border-sage"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.src} alt={it.nombre} className="aspect-square w-full object-cover" />
                    <div className="truncate px-1.5 py-1 text-[10.5px] text-ink-secondary group-hover:text-sage">
                      {it.nombre}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-ink-muted">
                {q.trim()
                  ? "Ninguna foto coincide con la búsqueda."
                  : "Aún no hay fotos en el catálogo ni en el inventario."}
              </p>
            )}

            {/* B · Subir del ordenador */}
            <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">
              B · Subir una imagen nueva
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                disabled={subiendo}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong px-4 py-6 text-[12.5px] text-ink-secondary hover:border-sage hover:bg-sage-tint/30"
              >
                <Upload size={20} className="text-sage" />
                {subiendo ? "Subiendo…" : "Desde el ordenador"}
                <span className="text-[10.5px] text-ink-muted">Se guarda en vuestra galería (máx. 10 MB)</span>
              </button>
              <div className="flex flex-col justify-center gap-2 rounded-md border-hair border-border p-4">
                <div className="flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
                  <Link2 size={15} className="text-sage" /> Desde un enlace (p. ej. IA)
                </div>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-sm border-med border-border px-2.5 py-2 text-[12.5px] focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!/^https?:\/\/.+/.test(url.trim())}
                  onClick={() => {
                    onPick(url.trim());
                    cerrar();
                  }}
                >
                  Usar este enlace
                </Button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) subirArchivo(f);
              }}
            />
            {error && <p className="mt-3 text-caption text-error">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Buscador desplegable del catálogo (tarifario) para añadir líneas con su
// precio de catálogo y su foto automáticamente.
function CatalogoPicker({
  tarifario,
  onPick,
}: {
  tarifario: RefCatalogo[];
  onPick: (it: RefCatalogo) => void;
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
    const arr = t ? tarifario.filter((c) => normaliza(c.concepto).includes(t)) : tarifario;
    return arr.slice(0, 60);
  }, [q, tarifario]);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Package size={14} /> Añadir del catálogo
      </Button>
      {open && (
        <div className="absolute z-20 mt-1 w-[340px] rounded-md border-hair border-border bg-white p-2 shadow-lg">
          <div className="flex items-center gap-1.5 rounded-sm border-med border-border px-2 py-1.5">
            <Search size={14} className="text-ink-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en el catálogo…"
              className="w-full text-[13px] focus:outline-none"
            />
          </div>
          <div className="mt-1 max-h-[300px] overflow-y-auto">
            {visibles.length === 0 && (
              <div className="px-2 py-3 text-center text-[12px] text-ink-muted">Sin resultados.</div>
            )}
            {visibles.map((it, i) => (
              <button
                key={i}
                onClick={() => {
                  onPick(it);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] hover:bg-beige-warm"
              >
                {it.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl(it.foto)} alt="" className="h-8 w-8 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-beige-warm text-ink-muted">
                    <Package size={13} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{it.concepto}</span>
                <span className="shrink-0 tabular text-[12px] text-ink-muted">{eur(it.precio)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
