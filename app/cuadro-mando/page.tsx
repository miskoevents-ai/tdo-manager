import Link from "next/link";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CuadroMando, type OpRow } from "@/components/cuadro/CuadroMando";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getTesoreria, getCostesEstimadosTodos, getPartesHorasTodas } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha, num } from "@/lib/format";

export const dynamic = "force-dynamic";

const CONTRATADAS = ["confirmada", "realizada", "facturada"];

// Fila de la tabla de precisión presupuestando (pre vs real por evento).
type PrecisionRow = {
  id: string;
  titulo: string;
  fecha: string | null;
  cerrada: boolean;
  estimado: number; // con la contingencia del evento aplicada
  real: number;
  desv: number;
  desvPct: number;
};

export default async function CuadroMandoPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let rows: OpRow[];
  let precision: PrecisionRow[] = [];
  try {
    const [ops, tesoreria, estimadosTodos, partesTodas] = await Promise.all([
      getOportunidades(),
      getTesoreria(),
      getCostesEstimadosTodos(),
      getPartesHorasTodas(),
    ]);

    // Precisión presupuestando: estimado (+contingencia) vs coste real por
    // evento. Real = gastos de evento en tesorería + horas de personal.
    const estPorOp = new Map<string, number>();
    for (const e of estimadosTodos) {
      estPorOp.set(e.oportunidad_id, (estPorOp.get(e.oportunidad_id) ?? 0) + Number(e.importe));
    }
    const gastoEventoPorOp = new Map<string, number>();
    for (const t of tesoreria) {
      if (t.tipo === "gasto" && t.naturaleza === "gasto_de_evento" && t.oportunidad_id) {
        gastoEventoPorOp.set(
          t.oportunidad_id,
          (gastoEventoPorOp.get(t.oportunidad_id) ?? 0) + Number(t.importe),
        );
      }
    }
    const horasPorOp = new Map<string, number>();
    for (const p of partesTodas) {
      // Los externos ya cuentan como gasto en tesorería: no se suman dos veces.
      if (p.tesoreria_id) continue;
      if (p.oportunidad_id) {
        horasPorOp.set(
          p.oportunidad_id,
          (horasPorOp.get(p.oportunidad_id) ?? 0) + Number(p.horas) * Number(p.precio_hora),
        );
      }
    }
    precision = ops
      .filter((o) => (estPorOp.get(o.id) ?? 0) > 0)
      .map((o) => {
        const estimado = (estPorOp.get(o.id) ?? 0) * (1 + Number(o.contingencia_pct ?? 5) / 100);
        const real = (gastoEventoPorOp.get(o.id) ?? 0) + (horasPorOp.get(o.id) ?? 0);
        return {
          id: o.id,
          titulo: o.titulo,
          fecha: o.fecha_evento,
          cerrada: o.cerrada ?? false,
          estimado,
          real,
          desv: real - estimado,
          desvPct: estimado > 0 ? ((real - estimado) / estimado) * 100 : 0,
        };
      })
      .sort((a, b) => (a.fecha && b.fecha ? (a.fecha < b.fecha ? 1 : -1) : 0));

    // Gastos de evento registrados en tesorería, por oportunidad.
    const gastoPorOp = new Map<string, number>();
    for (const t of tesoreria) {
      if (t.tipo === "gasto" && t.oportunidad_id) {
        gastoPorOp.set(t.oportunidad_id, (gastoPorOp.get(t.oportunidad_id) ?? 0) + Number(t.importe));
      }
    }
    // Nº de oportunidades por cliente → recurrente si tiene más de una.
    const opsPorCliente = new Map<string, number>();
    for (const o of ops) {
      if (o.cliente_id) opsPorCliente.set(o.cliente_id, (opsPorCliente.get(o.cliente_id) ?? 0) + 1);
    }
    const diasEntre = (a?: string | null, b?: string | null) => {
      if (!a || !b) return null;
      const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
      return isNaN(ms) ? null : Math.max(0, Math.round(ms / 86_400_000));
    };

    rows = ops.map((o) => {
      const total = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
      const cobrado = o.cobrado ?? 0;
      const gastos = gastoPorOp.get(o.id) ?? 0;
      return {
        id: o.id,
        titulo: o.titulo,
        estado: o.estado,
        contratada: CONTRATADAS.includes(o.estado),
        tipoEvento: o.tipo_evento,
        serie: o.serie,
        canal: o.canal,
        tipoOperacion: o.tipo_operacion,
        cliente: o.cliente?.nombre ?? null,
        lugar: o.lugar?.nombre ?? null,
        responsable: o.responsable ?? null,
        fecha: o.fecha_evento,
        ym: o.fecha_evento ? o.fecha_evento.slice(0, 7) : null,
        total,
        cobrado,
        pendiente: Math.max(0, total - cobrado),
        gastos,
        margen: total - gastos,
        fianza: (o.fianza ?? 0) > 0 && !o.fianza_devuelta ? Number(o.fianza) : 0,
        clienteRecurrente: o.cliente_id ? (opsPorCliente.get(o.cliente_id) ?? 0) > 1 : false,
        diasCierre: diasEntre(o.fecha_entrada, o.fecha_confirmacion),
      };
    });
  } catch (e) {
    return <ErrorNotice message={(e as Error).message} />;
  }

  return (
    <div className="space-y-5">
      <InfoNote id="cuadro-mando">Análisis y gráficas del negocio: de dónde vienen los eventos, facturación y conversión de leads. Pincha en las gráficas para ver el detalle.</InfoNote>
      <div>
        <Overline className="!mt-0">Cuadro de mando</Overline>
        <p className="mt-1 text-[12px] text-ink-muted">
          Analítica del negocio con filtros. El margen es de caja (ingresos − gastos de evento registrados);
          no incluye horas de personal salvo que se registren como gasto.
        </p>
      </div>
      <CuadroMando rows={rows} />

      {/* ¿Nos equivocamos presupuestando? Pre vs real, evento a evento. */}
      {precision.length > 0 && (
        <>
          <Overline>Precisión presupuestando</Overline>
          <Card>
            <p className="mb-3 text-[12px] text-ink-muted">
              Lo que estimamos antes del presu (con su contingencia) contra lo que costó de verdad.
              Los <b>cerrados 🔒</b> son cifras definitivas; el resto puede seguir moviéndose.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
                    <th className="border-b border-border py-2 text-left font-semibold">Evento</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Previsto</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Real</th>
                    <th className="border-b border-border py-2 text-right font-semibold">Desviación</th>
                    <th className="border-b border-border py-2 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {precision.map((p) => (
                    <tr key={p.id}>
                      <td className="border-b border-[#f0eae1] py-2">
                        <Link href={`/oportunidades/${p.id}?tab=costes`} className="hover:text-clay">
                          {p.titulo}
                        </Link>
                        {p.cerrada && <span className="ml-1.5 text-[11px]">🔒</span>}
                        {p.fecha && <span className="ml-2 text-[11px] text-ink-muted">{fecha(p.fecha)}</span>}
                      </td>
                      <td className="border-b border-[#f0eae1] py-2 text-right tabular">{eur(p.estimado)}</td>
                      <td className="border-b border-[#f0eae1] py-2 text-right tabular">{eur(p.real)}</td>
                      <td className={`border-b border-[#f0eae1] py-2 text-right tabular font-semibold ${p.desv > 0.01 ? "text-error" : "text-ok"}`}>
                        {p.desv > 0 ? "+" : ""}{eur(p.desv)}
                      </td>
                      <td className={`border-b border-[#f0eae1] py-2 text-right tabular ${p.desv > 0.01 ? "text-error" : "text-ok"}`}>
                        {p.desvPct > 0 ? "+" : ""}{num(p.desvPct, 0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const cerrados = precision.filter((p) => p.cerrada);
              const base = cerrados.length >= 2 ? cerrados : precision;
              const media = base.reduce((s, p) => s + p.desvPct, 0) / base.length;
              return (
                <p className="mt-3 text-[12.5px]">
                  De media nos desviamos{" "}
                  <b className={`tabular ${media > 1 ? "text-error" : "text-ok"}`}>
                    {media > 0 ? "+" : ""}{num(media, 0)}%
                  </b>{" "}
                  {media > 1
                    ? "— nos quedamos cortos presupuestando: sube la contingencia o los precios."
                    : media < -10
                      ? "— estimamos por encima de lo real: margen para afinar precios al cliente."
                      : "— vamos bastante finos presupuestando. 🎯"}
                  {cerrados.length >= 2 && " (Media solo de eventos cerrados.)"}
                </p>
              );
            })()}
          </Card>
        </>
      )}
    </div>
  );
}
