import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { PrintButton } from "@/components/presupuesto/PrintButton";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidad, getCostesEstimados, getEquipo, getProveedores } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha, num } from "@/lib/format";
import { EMPRESA } from "@/lib/empresa";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";
import type { CosteEstimado } from "@/lib/types";

export const dynamic = "force-dynamic";

// A qué módulo pertenece una línea (misma lógica que la pestaña Costes).
function moduloDe(categoria: string | null | undefined): string {
  const c = (categoria ?? "material").toLowerCase();
  if (c === "personal") return "manoObra";
  if (c === "desplazamiento") return "transporte";
  if (c.includes("dieta") || c.includes("comida")) return "dietas";
  if (c.includes("alquiler")) return "alquiler";
  return "materiales";
}
const MODULOS = [
  { key: "manoObra", titulo: "Mano de obra", cantLabel: "Horas" },
  { key: "transporte", titulo: "Transporte", cantLabel: "Cant." },
  { key: "dietas", titulo: "Dietas y comida", cantLabel: "Nº pers." },
  { key: "materiales", titulo: "Materiales", cantLabel: "Cant." },
  { key: "alquiler", titulo: "Alquiler externo", cantLabel: "Cant." },
];

// Escandallo interno de costes: el desglose del plan previsto para compartir
// con los socios (Jero y Cris). Documento interno, no se manda al cliente.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigurado()) return <SetupNotice />;
  const { id } = await params;
  const [op, estimados, equipo, proveedores] = await Promise.all([
    getOportunidad(id),
    getCostesEstimados(id),
    getEquipo(),
    getProveedores(),
  ]);
  if (!op) notFound();

  const nombreEquipo = (eid: string | null | undefined) => equipo.find((e) => e.id === eid)?.nombre ?? null;
  const nombreProv = (pid: string | null | undefined) => proveedores.find((p) => p.id === pid)?.nombre ?? null;

  const cont = Number(op.contingencia_pct ?? 5);
  const margenObj = Number(op.margen_objetivo_pct ?? 35);
  const t = calcularTotales(op.presupuesto_lineas ?? [], op.iva_pct, op.retencion_pct, op.descuento_pct ?? 0);
  const base = t.base;

  const grupos = MODULOS.map((m) => ({
    ...m,
    lineas: estimados.filter((e) => moduloDe(e.categoria) === m.key),
  })).filter((g) => g.lineas.length > 0);

  const totalDirecto = estimados.reduce((s, e) => s + Number(e.importe), 0);
  const conColchon = totalDirecto * (1 + cont / 100);
  const margenPrev = base - conColchon;
  const margenPrevPct = base > 0 ? (margenPrev / base) * 100 : 0;
  const horasTotales = estimados
    .filter((e) => moduloDe(e.categoria) === "manoObra")
    .reduce((s, e) => s + Number(e.cantidad ?? 0), 0);

  const quien = (e: CosteEstimado) =>
    moduloDe(e.categoria) === "manoObra"
      ? nombreEquipo(e.equipo_id) ?? (e.persona_externa ? `${e.persona_externa} (ext.)` : "—")
      : nombreProv(e.proveedor_id) ?? (e.pagador ? `paga ${e.pagador}` : "—");

  return (
    <div className="print-page mx-auto max-w-[820px] space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href={`/oportunidades/${op.id}?tab=costes`} className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-sage">
          <ArrowLeft size={14} /> Volver a Costes
        </Link>
        <PrintButton />
      </div>

      <div className="print-doc rounded-lg border-hair border-border bg-white p-8 shadow-sm md:p-12">
        {/* Cabecera */}
        <div className="avoid-break flex items-start justify-between gap-6 border-b-2 border-sage pb-5">
          <div>
            <Image src="/logo-horizontal.png" alt={EMPRESA.nombre} width={200} height={110} className="w-[170px]" />
            <div className="mt-2 text-[11px] text-ink-muted">Documento interno · no se envía al cliente</div>
          </div>
          <div className="text-right">
            <div className="font-display text-[22px] leading-none text-sage">ESCANDALLO DE COSTES</div>
            <div className="mt-2 text-[12px] text-ink-secondary">Nº {op.numero}</div>
            <div className="text-[12px] text-ink-secondary">{fecha(op.fecha_evento ?? op.created_at)}</div>
          </div>
        </div>

        {/* Evento */}
        <div className="avoid-break mt-5 text-[12.5px]">
          <div className="font-semibold">{op.titulo}</div>
          <div className="text-ink-secondary">
            {TIPO_EVENTO_LABEL[op.tipo_evento] ?? op.tipo_evento}
            {op.cliente?.nombre ? ` · ${op.cliente.nombre}` : ""}
            {op.lugar?.nombre ? ` · ${op.lugar.nombre}` : ""}
          </div>
        </div>

        {estimados.length === 0 ? (
          <p className="mt-8 text-center text-ink-muted">Sin costes previstos todavía.</p>
        ) : (
          <>
            {/* Módulos */}
            {grupos.map((g) => {
              const sub = g.lineas.reduce((s, e) => s + Number(e.importe), 0);
              return (
                <div key={g.key} className="avoid-break mt-6">
                  <div className="mb-1 flex items-baseline justify-between border-b border-border pb-1">
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-clay">{g.titulo}</h2>
                    <span className="tabular text-[12.5px] font-semibold">{eur(sub)}</span>
                  </div>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                        <th className="py-1 text-left font-semibold">Concepto</th>
                        <th className="py-1 text-left font-semibold">Quién</th>
                        <th className="py-1 text-right font-semibold">{g.cantLabel}</th>
                        <th className="py-1 text-right font-semibold">€/ud</th>
                        <th className="py-1 text-right font-semibold">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.lineas.map((e) => (
                        <tr key={e.id}>
                          <td className="border-t border-[#f0eae1] py-1">
                            {e.concepto || "—"}
                            {e.nota ? <span className="ml-1 text-[10.5px] italic text-ink-muted">· {e.nota}</span> : ""}
                          </td>
                          <td className="border-t border-[#f0eae1] py-1 text-ink-secondary">{quien(e)}</td>
                          <td className="border-t border-[#f0eae1] py-1 text-right tabular">{num(Number(e.cantidad ?? 1), 1)}</td>
                          <td className="border-t border-[#f0eae1] py-1 text-right tabular">{e.precio_unitario != null ? eur(Number(e.precio_unitario)) : "—"}</td>
                          <td className="border-t border-[#f0eae1] py-1 text-right tabular font-semibold">{eur(Number(e.importe))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Resumen */}
            <div className="avoid-break mt-8 flex justify-end">
              <div className="w-full max-w-[340px] space-y-1.5 rounded-lg bg-beige-light p-4 text-[13px]">
                {horasTotales > 0 && (
                  <div className="flex justify-between text-ink-secondary">
                    <span>Horas de equipo</span>
                    <span className="tabular">{num(horasTotales, 1)} h</span>
                  </div>
                )}
                <div className="flex justify-between text-ink-secondary">
                  <span>Costes directos</span>
                  <span className="tabular">{eur(totalDirecto)}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>Contingencia ({num(cont, 0)}%)</span>
                  <span className="tabular">{eur(conColchon - totalDirecto)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span>Coste total previsto</span>
                  <span className="tabular">{eur(conColchon)}</span>
                </div>
                {base > 0 && (
                  <>
                    <div className="mt-2 flex justify-between border-t border-border pt-2 text-ink-secondary">
                      <span>Presupuesto (base, sin IVA)</span>
                      <span className="tabular">{eur(base)}</span>
                    </div>
                    <div className={`flex justify-between font-semibold ${margenPrevPct >= margenObj ? "text-ok" : "text-error"}`}>
                      <span>Margen previsto ({num(margenPrevPct, 0)}%)</span>
                      <span className="tabular">{eur(margenPrev)}</span>
                    </div>
                    <div className="text-right text-[10.5px] text-ink-muted">Objetivo: {num(margenObj, 0)}%</div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
