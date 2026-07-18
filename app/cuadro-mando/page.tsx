import Link from "next/link";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CuadroMando, type OpRow } from "@/components/cuadro/CuadroMando";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getTesoreria, getCostesEstimadosTodos, getPartesHorasTodas, getGastosFijos, getCalculadoraConfigRaw, getComisionesConfig } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { boteFijosMes, sueldosFijosMes, mezclarConfig } from "@/lib/calculadora-precio";
import { comisionDeOportunidad } from "@/lib/comisiones";
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

// Cobertura de fijos del mes: la "máquina" (gastos fijos + parte estructural
// del sueldo) contra la contribución que dejan los eventos del mes (base −
// costes − comisión). Es la pregunta que importa: ¿llegamos a fin de mes?
type Cobertura = {
  ym: string;
  bote: number;
  estructural: number;
  maquina: number;
  contribucion: number;
  // Cálculo vivo del sueldo (modelo por consumo): sueldo real del mes y lo ya
  // recuperado vía partes de horas. vivo=false → sin sueldos en Gastos fijos,
  // se usa la referencia del % de horas de la calculadora.
  sueldoMes: number;
  imputado: number;
  vivo: boolean;
  eventos: { id: string; titulo: string; fecha: string | null; contribucion: number; sinCostes: boolean }[];
};

export default async function CuadroMandoPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;

  let rows: OpRow[];
  let precision: PrecisionRow[] = [];
  let cobertura: Cobertura | null = null;
  try {
    const [ops, tesoreria, estimadosTodos, partesTodas, gastosFijos, calcRaw, comConfig] = await Promise.all([
      getOportunidades(),
      getTesoreria(),
      getCostesEstimadosTodos(),
      getPartesHorasTodas(),
      getGastosFijos(),
      getCalculadoraConfigRaw(),
      getComisionesConfig(),
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
        const estimado = (estPorOp.get(o.id) ?? 0) * (1 + Number(o.contingencia_pct ?? 6) / 100);
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

    // Cobertura de fijos del mes actual. Contribución por evento = base sin IVA
    // − costes (reales si hay; si no, el plan previsto con su contingencia) −
    // comisión. Cuentan los eventos contratados con fecha en este mes,
    // alquileres incluidos: todos ayudan a pagar la máquina.
    const hoyYm = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date()).slice(0, 7);
    const cfgCalc = mezclarConfig(calcRaw);
    const bote = boteFijosMes(gastosFijos, hoyYm);
    // Parte del sueldo aún no recuperada por horas (modelo por consumo): sueldo
    // REAL del mes (gastos fijos de categoría "sueldo", p. ej. 1.000 € en
    // julio) menos lo ya imputado a eventos por esas personas en sus partes de
    // horas de este mes. Cuantas más horas imputa Cristina, menos máquina queda
    // por cubrir — el descenso automático que pidieron los socios. Los costes de
    // cada evento ya incluyen esas horas a coste real, así que no se cuentan dos
    // veces. Sin sueldos en Gastos fijos, referencia: sueldo × (1 − % horas).
    const sf = sueldosFijosMes(gastosFijos, hoyYm);
    const asalariados = new Set(sf.equipoIds);
    const imputadoMes = partesTodas
      .filter((p) => !p.tesoreria_id && p.equipo_id && asalariados.has(p.equipo_id))
      .filter((p) => (p.fecha ?? p.created_at.slice(0, 10)).startsWith(hoyYm))
      .reduce((s, p) => s + Number(p.horas) * Number(p.precio_hora), 0);
    const vivo = sf.total > 0;
    const sueldoMes = vivo ? sf.total : cfgCalc.costeMensualEmpleada;
    const estructural = vivo
      ? Math.max(0, sf.total - imputadoMes)
      : cfgCalc.costeMensualEmpleada * (1 - cfgCalc.repartoEventosPct / 100);
    const eventosCobertura = ops
      .filter((o) => CONTRATADAS.includes(o.estado) && o.fecha_evento?.slice(0, 7) === hoyYm)
      .map((o) => {
        const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
        const real = (gastoEventoPorOp.get(o.id) ?? 0) + (horasPorOp.get(o.id) ?? 0);
        const previsto = (estPorOp.get(o.id) ?? 0) * (1 + Number(o.contingencia_pct ?? 6) / 100);
        const costes = real > 0 ? real : previsto;
        const comision = comisionDeOportunidad(o, comConfig);
        return {
          id: o.id,
          titulo: o.titulo,
          fecha: o.fecha_evento,
          contribucion: t.base - costes - comision,
          sinCostes: costes <= 0,
        };
      })
      .sort((a, b) => b.contribucion - a.contribucion);
    cobertura = {
      ym: hoyYm,
      bote,
      estructural,
      maquina: bote + estructural,
      contribucion: eventosCobertura.reduce((s, e) => s + e.contribucion, 0),
      sueldoMes,
      imputado: imputadoMes,
      vivo,
      eventos: eventosCobertura,
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
      {cobertura && <CoberturaFijos c={cobertura} />}

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

// La barra de "¿cubrimos la máquina este mes?": fijos + parte estructural del
// sueldo contra la contribución acumulada de los eventos del mes.
function CoberturaFijos({ c }: { c: Cobertura }) {
  const pct = c.maquina > 0 ? (c.contribucion / c.maquina) * 100 : 0;
  const cubierta = pct >= 100;
  const sobrante = c.contribucion - c.maquina;
  const mesLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${c.ym}-01T00:00:00Z`),
  );
  const sinCostes = c.eventos.filter((e) => e.sinCostes).length;
  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          Cobertura de fijos — {mesLabel}
        </div>
        <div className="text-[12px] text-ink-muted">
          {c.vivo ? (
            <>
              La máquina: fijos {eur(c.bote)} + sueldo del mes {eur(c.sueldoMes)} − ya imputado a
              eventos {eur(c.imputado)} = <b className="tabular text-ink">{eur(c.maquina)}/mes</b>
            </>
          ) : (
            <>
              La máquina: fijos {eur(c.bote)} + sueldo pendiente de horas {eur(c.estructural)}{" "}
              <span title="Sin sueldos en Gastos fijos: se usa la referencia del % de horas de la calculadora. Añade el sueldo (categoría «sueldo») para el cálculo vivo.">(referencia)</span>{" "}
              = <b className="tabular text-ink">{eur(c.maquina)}/mes</b>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 h-4 overflow-hidden rounded-full bg-beige-warm">
        <div
          className={`h-full rounded-full transition-all ${cubierta ? "bg-ok" : pct >= 60 ? "bg-[#c9a24b]" : "bg-clay"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span>
          Contribución de los eventos del mes: <b className="tabular">{eur(c.contribucion)}</b>{" "}
          <span className="text-ink-muted">({num(pct, 0)}% de la máquina)</span>
        </span>
        {cubierta ? (
          <span className="font-semibold text-ok">
            ✓ Máquina cubierta — todo lo que entre ya es beneficio (+{eur(sobrante)})
          </span>
        ) : (
          <span className="font-semibold text-clay">Faltan {eur(-sobrante)} para cubrir el mes</span>
        )}
      </div>
      {c.eventos.length > 0 && (
        <div className="mt-3 border-t border-border pt-2 text-[12px] text-ink-secondary">
          {c.eventos.map((e) => (
            <span key={e.id} className="mr-4 inline-block">
              <Link href={`/oportunidades/${e.id}?tab=costes`} className="hover:text-clay">
                {e.titulo}
              </Link>
              : <b className={`tabular ${e.contribucion >= 0 ? "" : "text-error"}`}>{eur(e.contribucion)}</b>
              {e.sinCostes && <span title="Sin costes apuntados: cuenta solo la comisión">*</span>}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-ink-muted">
        Contribución = base sin IVA − costes del evento − comisión. Cuentan los eventos contratados con fecha
        este mes, alquileres incluidos: todos ayudan a pagar la máquina.
        {c.vivo && (
          <> El sueldo se recupera por horas: cada parte de horas que registra el equipo con sueldo baja lo
          que queda de máquina por cubrir.</>
        )}
        {sinCostes > 0 && (
          <> Los marcados con * no tienen costes apuntados (su cifra está inflada): apúntales el plan en Costes.</>
        )}
      </p>
    </Card>
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
