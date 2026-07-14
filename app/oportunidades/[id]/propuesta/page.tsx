import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, FileText } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { PrintButton } from "@/components/presupuesto/PrintButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidad, getVersionPresupuesto } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha, num } from "@/lib/format";
import { EMPRESA, CONDICIONES_PRESUPUESTO, PORTADA_CANDIDATAS, PORTADA_RESPALDO } from "@/lib/empresa";
import { portadaUrl } from "@/lib/catalogo";
import { PortadaDoc } from "@/components/PortadaDoc";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";
import type { PresupuestoLinea } from "@/lib/types";

export const dynamic = "force-dynamic";

// Propuesta visual: el mismo presupuesto en clave comercial (fotos grandes de
// cada concepto, agrupadas por bloque) para enamorar al cliente antes de los
// números. Se imprime a PDF con las mismas reglas que el presupuesto.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ v?: string }>;
}) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const { v } = (await searchParams) ?? {};
  const op = await getOportunidad(id);
  if (!op) notFound();

  const version = v ? await getVersionPresupuesto(v) : null;
  if (v && (!version || version.oportunidad_id !== op.id)) notFound();

  const lineas: PresupuestoLinea[] = version
    ? version.lineas.map((l, i) => ({
        id: String(i),
        oportunidad_id: op.id,
        concepto: l.concepto,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario),
        orden: i,
        bloque: l.bloque ?? null,
        via: l.via ?? "factura",
        foto: l.foto ?? null,
        descuento_pct: l.descuento_pct ?? null,
      }))
    : op.presupuesto_lineas ?? [];
  const ivaPct = version ? Number(version.iva_pct) : op.iva_pct;
  const retPct = version ? Number(version.retencion_pct) : op.retencion_pct;
  const dtoPct = version ? Number(version.descuento_pct ?? 0) : op.descuento_pct ?? 0;
  const t = calcularTotales(lineas, ivaPct, retPct, dtoPct);
  const cli = op.cliente;
  const esAlquiler = op.serie === "alquiler_encargo";

  const importe = (l: PresupuestoLinea) =>
    l.cantidad * l.precio_unitario * (1 - (l.descuento_pct ?? 0) / 100);

  // Agrupación por bloques, en orden de aparición.
  const grupos: { nombre: string | null; lineas: PresupuestoLinea[] }[] = [];
  for (const l of lineas) {
    const nombre = l.bloque ?? null;
    const g = grupos.find((x) => x.nombre === nombre);
    if (g) g.lineas.push(l);
    else grupos.push({ nombre, lineas: [l] });
  }
  const hayBloques = grupos.some((g) => g.nombre);

  const portadaSrcs = [
    ...PORTADA_CANDIDATAS.map((c) => portadaUrl(c)).filter((u): u is string => Boolean(u)),
    PORTADA_RESPALDO,
  ];

  return (
    <div className="print-page mx-auto max-w-[860px] space-y-4">
      {/* Barra de acciones (no se imprime) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/oportunidades/${op.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage"
        >
          <ArrowLeft size={14} /> Volver a la ficha
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/oportunidades/${op.id}/presupuesto${v ? `?v=${v}` : ""}`}
            className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
          >
            <FileText size={15} /> Ver presupuesto clásico
          </Link>
          <Link
            href={`/oportunidades/${op.id}?tab=presupuesto`}
            className="inline-flex items-center gap-2 rounded-sm border-med border-border-strong bg-white px-4 py-2 text-[13px] font-semibold text-ink-secondary hover:bg-beige-warm"
          >
            <Pencil size={15} /> Editar
          </Link>
          <PrintButton />
        </div>
      </div>

      {version && (
        <div className="no-print rounded-md border-hair border-[#e7d3a6] bg-warn-tint px-[15px] py-[10px] text-[12.5px] text-[#7a5a1a]">
          Estás viendo la <b>V{version.version}</b> guardada el {fecha(version.created_at)}
          {version.notas ? ` («${version.notas}»)` : ""}.
        </div>
      )}

      {/* Documento visual */}
      <div className="print-doc overflow-hidden rounded-lg border-hair border-border bg-white shadow-sm">
        {/* Portada a sangre con el título encima */}
        <div className="avoid-break relative">
          <PortadaDoc srcs={portadaSrcs} alt={`Montaje de ${EMPRESA.nombre}`} />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 via-black/10 to-transparent p-6 md:p-9">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image src="/logo-horizontal-cream.png" alt={EMPRESA.nombre} width={200} height={110} className="mb-3 w-[150px]" />
            <div className="font-display text-[30px] leading-tight text-white drop-shadow md:text-[38px]">
              {op.titulo}
            </div>
            <div className="mt-1 text-[13px] text-white/90">
              Propuesta {esAlquiler ? "de alquiler" : "de decoración"} para {cli?.nombre ?? "ti"}
              {op.fecha_evento ? ` · ${fecha(op.fecha_evento)}` : ""}
              {op.lugar?.nombre ? ` · ${op.lugar.nombre}` : ""}
            </div>
          </div>
        </div>

        <div className="p-7 md:p-10">
          {/* Introducción cálida */}
          <div className="avoid-break border-b border-border pb-5">
            <div className="font-display text-[20px] text-sage">
              Hemos imaginado {op.titulo} así ✨
            </div>
            <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-secondary">
              Esta es nuestra propuesta {TIPO_EVENTO_LABEL[op.tipo_evento]
                ? `para ${TIPO_EVENTO_LABEL[op.tipo_evento].toLowerCase()}`
                : ""}
              . Cada elemento está pensado con mimo para que el día sea inolvidable. Debajo tienes el
              detalle con imágenes de referencia y el presupuesto.
            </p>
          </div>

          {/* Bloques con fotos */}
          {lineas.length === 0 && (
            <p className="py-8 text-center text-ink-muted">Sin conceptos en el presupuesto todavía.</p>
          )}
          {grupos.map((g, gi) => {
            const conFoto = g.lineas.filter((l) => portadaUrl(l.foto ?? null));
            const sinFoto = g.lineas.filter((l) => !portadaUrl(l.foto ?? null));
            const subtotal = g.lineas.reduce((s, l) => s + importe(l), 0);
            return (
              <section key={gi} className="mt-7">
                {hayBloques && (
                  <div className="avoid-break mb-3 flex items-baseline justify-between border-b border-border/70 pb-1.5">
                    <h2 className="font-display text-[18px] text-clay">
                      {g.nombre ?? "Otros conceptos"}
                    </h2>
                    <span className="tabular text-[13px] font-semibold text-ink-secondary">{eur(subtotal)}</span>
                  </div>
                )}
                {conFoto.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {conFoto.map((l) => (
                      <div key={l.id} className="avoid-break overflow-hidden rounded-lg border-hair border-border bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={portadaUrl(l.foto ?? null)!}
                          alt={l.concepto}
                          className="h-[150px] w-full object-cover"
                        />
                        <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                          <div className="text-[12.5px] font-medium leading-snug text-ink">{l.concepto}</div>
                          <div className="shrink-0 tabular text-[12px] font-semibold text-sage">{eur(importe(l))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {sinFoto.length > 0 && (
                  <ul className="mt-3 divide-y divide-border/60 rounded-md border-hair border-border bg-beige-light/40 px-4">
                    {sinFoto.map((l) => (
                      <li key={l.id} className="avoid-break flex items-center justify-between gap-3 py-2 text-[12.5px]">
                        <span className="text-ink">
                          {l.concepto}
                          {l.cantidad > 1 ? <span className="text-ink-muted"> · {l.cantidad} ud.</span> : ""}
                        </span>
                        <span className="tabular font-semibold text-sage">{eur(importe(l))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {/* Totales */}
          {lineas.length > 0 && (
            <div className="avoid-break mt-8 flex justify-end">
              <div className="w-full max-w-[320px] space-y-1.5 rounded-lg bg-sage-tint/50 p-4 text-[13px]">
                {dtoPct > 0 && (
                  <>
                    <div className="flex justify-between text-ink-secondary">
                      <span>Subtotal</span>
                      <span className="tabular">{eur(t.bruto)}</span>
                    </div>
                    <div className="flex justify-between text-clay">
                      <span>Descuento (−{num(dtoPct, 0)}%)</span>
                      <span className="tabular">−{eur(t.descuento)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-ink-secondary">
                  <span>Base</span>
                  <span className="tabular">{eur(t.base)}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>IVA ({ivaPct}%)</span>
                  <span className="tabular">{eur(t.iva)}</span>
                </div>
                {t.retencion > 0 && (
                  <div className="flex justify-between text-ink-secondary">
                    <span>Retención IRPF (−{retPct}%)</span>
                    <span className="tabular">−{eur(t.retencion)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-sage pt-2 font-display text-[20px] text-sage">
                  <span>Total</span>
                  <span className="tabular">{eur(t.total)}</span>
                </div>
                {(op.fianza ?? 0) > 0 && (
                  <div className="flex justify-between pt-1 text-[12px] text-clay">
                    <span>Fianza (reembolsable)</span>
                    <span className="tabular font-semibold">{eur(op.fianza ?? 0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Condiciones + cierre */}
          <div className="avoid-break mt-8 border-t border-border pt-5 text-[11px] leading-relaxed text-ink-secondary">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Condiciones</div>
            <ul className="list-disc space-y-0.5 pl-4">
              {CONDICIONES_PRESUPUESTO.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <div className="mt-5 text-center font-display text-[16px] text-sage">
              ¡Gracias por confiar en {EMPRESA.nombre}! 🤍
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
