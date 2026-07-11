import Link from "next/link";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CuadroMando, type OpRow } from "@/components/cuadro/CuadroMando";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getTesoreria, getCostesEstimadosTodos, getPartesHorasTodas } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { eur, fecha, num } from "@/lib/format";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";

export const dynamic = "force-dynamic";

const CONTRATADAS = ["confirmada", "realizada", "facturada"];

// Agrupa las oportunidades contratadas por una clave (tipo de evento, cliente…)
// y calcula ingresos, gastos, margen, margen % y ticket medio.
type RentRow = { clave: string; n: number; ingresos: number; gastos: number; margen: number; margenPct: number; ticket: number };
function rentabilidadPor(rows: OpRow[], keyFn: (r: OpRow) => string | null): RentRow[] {
  const m = new Map<string, { n: number; ingresos: number; gastos: number; margen: number }>();
  for (const r of rows) {
    if (!r.contratada) continue;
    const k = keyFn(r);
    if (!k) continue;
    const a = m.get(k) ?? { n: 0, ingresos: 0, gastos: 0, margen: 0 };
    a.n += 1;
    a.ingresos += r.total;
    a.gastos += r.gastos;
    a.margen += r.margen;
    m.set(k, a);
  }
  return Array.from(m.entries())
    .map(([clave, v]) => ({
      clave,
      ...v,
      margenPct: v.ingresos > 0 ? (v.margen / v.ingresos) * 100 : 0,
      ticket: v.n > 0 ? v.ingresos / v.n : 0,
    }))
    .sort((a, b) => b.margen - a.margen);
}

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

      {/* Rentabilidad por tipo de evento y por cliente (solo contratadas) */}
      {(() => {
        const porTipo = rentabilidadPor(rows, (r) => r.tipoEvento).map((x) => ({
          ...x,
          etiqueta: TIPO_EVENTO_LABEL[x.clave] ?? x.clave,
        }));
        const porCliente = rentabilidadPor(rows, (r) => r.cliente)
          .slice(0, 10)
          .map((x) => ({ ...x, etiqueta: x.clave }));
        if (porTipo.length === 0 && porCliente.length === 0) return null;
        return (
          <>
            <Overline>Rentabilidad</Overline>
            <p className="-mt-2 text-[12px] text-ink-muted">
              Solo eventos contratados. Margen de caja (ingresos − gastos de evento registrados);
              no incluye horas de personal salvo que se registren como gasto.
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RentabilidadTabla titulo="Por tipo de evento" col="Tipo" filas={porTipo} />
              <RentabilidadTabla titulo="Por cliente (top 10)" col="Cliente" filas={porCliente} />
            </div>
          </>
        );
      })()}

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

// Tabla de rentabilidad reutilizable (por tipo de evento o por cliente).
function RentabilidadTabla({
  titulo,
  col,
  filas,
}: {
  titulo: string;
  col: string;
  filas: (RentRow & { etiqueta: string })[];
}) {
  const totIngresos = filas.reduce((s, f) => s + f.ingresos, 0);
  const totMargen = filas.reduce((s, f) => s + f.margen, 0);
  const totN = filas.reduce((s, f) => s + f.n, 0);
  return (
    <Card>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{titulo}</div>
      {filas.length === 0 ? (
        <p className="py-2 text-small text-ink-muted">Sin datos todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.06em] text-ink-secondary">
                <th className="border-b border-border py-2 text-left font-semibold">{col}</th>
                <th className="border-b border-border py-2 text-right font-semibold">Nº</th>
                <th className="border-b border-border py-2 text-right font-semibold">Ingresos</th>
                <th className="border-b border-border py-2 text-right font-semibold">Margen</th>
                <th className="border-b border-border py-2 text-right font-semibold">%</th>
                <th className="border-b border-border py-2 text-right font-semibold">Ticket medio</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.clave}>
                  <td className="border-b border-[#f0eae1] py-1.5 font-medium">{f.etiqueta}</td>
                  <td className="border-b border-[#f0eae1] py-1.5 text-right tabular">{f.n}</td>
                  <td className="border-b border-[#f0eae1] py-1.5 text-right tabular">{eur(f.ingresos)}</td>
                  <td className={`border-b border-[#f0eae1] py-1.5 text-right tabular font-semibold ${f.margen >= 0 ? "text-ok" : "text-error"}`}>
                    {eur(f.margen)}
                  </td>
                  <td className="border-b border-[#f0eae1] py-1.5 text-right tabular text-ink-secondary">{num(f.margenPct, 0)}%</td>
                  <td className="border-b border-[#f0eae1] py-1.5 text-right tabular">{eur(f.ticket)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-[12px] font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right tabular">{totN}</td>
                <td className="py-2 text-right tabular">{eur(totIngresos)}</td>
                <td className={`py-2 text-right tabular ${totMargen >= 0 ? "text-ok" : "text-error"}`}>{eur(totMargen)}</td>
                <td className="py-2 text-right tabular text-ink-secondary">
                  {totIngresos > 0 ? num((totMargen / totIngresos) * 100, 0) : 0}%
                </td>
                <td className="py-2 text-right tabular">{totN > 0 ? eur(totIngresos / totN) : eur(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
