import Link from "next/link";
import { Card, Overline } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/InfoNote";
import { SetupNotice, ErrorNotice } from "@/components/SetupNotice";
import { CuadroMando, type OpRow } from "@/components/cuadro/CuadroMando";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { getOportunidades, getTesoreria, getCostesEstimadosTodos, getPartesHorasTodas, getGastosFijos, getCalculadoraConfigRaw, getComisionesConfig, getEquipo } from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { boteFijosMes, sueldosFijosMes, mezclarConfig } from "@/lib/calculadora-precio";
import { SEMANAS_POR_MES } from "@/lib/coste-hora";
import { JornadaCalibracion, type JornadaData } from "@/components/cuadro/JornadaCalibracion";
import { comisionDeOportunidad } from "@/lib/comisiones";
import { eur, fecha, num } from "@/lib/format";
import { TIPO_EVENTO_LABEL, probabilidadEfectiva, ESTADOS_PRE_CONFIRMACION, MOTIVO_PERDIDA_LABEL, CANAL_LABEL } from "@/lib/estados";

export const dynamic = "force-dynamic";

const CONTRATADAS = ["confirmada", "en_produccion", "realizada", "facturada"];

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
  let jornada: JornadaData | null = null;
  let forecast: { total: number; ponderado: number; abiertoTotal: number; abiertoPonderado: number } | null = null;
  let motivosPerdida: { label: string; n: number; pct: number }[] = [];
  let perdidasTotal = 0;
  let conversionCanal: { label: string; leads: number; ganadas: number; pctCierre: number; facturacion: number }[] = [];
  try {
    const [ops, tesoreria, estimadosTodos, partesTodas, gastosFijos, calcRaw, comConfig, equipo] = await Promise.all([
      getOportunidades(),
      getTesoreria(),
      getCostesEstimadosTodos(),
      getPartesHorasTodas(),
      getGastosFijos(),
      getCalculadoraConfigRaw(),
      getComisionesConfig(),
      getEquipo(),
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
    // Previsión del pipeline: valor total (lo posible) vs ponderado por la
    // probabilidad de cierre (lo probable). "Abierto" = todavía sin confirmar.
    {
      const activasOps = ops.filter((o) => !["perdida", "descartada"].includes(o.estado));
      const abiertosSet = new Set(ESTADOS_PRE_CONFIRMACION.filter((e) => !["perdida", "descartada"].includes(e)));
      let total = 0, ponderado = 0, abiertoTotal = 0, abiertoPonderado = 0;
      for (const o of activasOps) {
        const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
        const p = probabilidadEfectiva(o) / 100;
        total += t;
        ponderado += t * p;
        if (abiertosSet.has(o.estado)) {
          abiertoTotal += t;
          abiertoPonderado += t * p;
        }
      }
      forecast = { total, ponderado, abiertoTotal, abiertoPonderado };
    }

    // Por qué no cerramos: motivos de las oportunidades perdidas/rechazadas.
    {
      const perdidas = ops.filter((o) => ["perdida", "descartada"].includes(o.estado));
      perdidasTotal = perdidas.length;
      const cont = new Map<string, number>();
      for (const o of perdidas) {
        const k = o.motivo_perdida || "sin_motivo";
        cont.set(k, (cont.get(k) ?? 0) + 1);
      }
      motivosPerdida = Array.from(cont.entries())
        .map(([k, n]) => ({
          label: k === "sin_motivo" ? "Sin especificar" : (MOTIVO_PERDIDA_LABEL[k] ?? k),
          n,
          pct: perdidasTotal > 0 ? Math.round((n / perdidasTotal) * 100) : 0,
        }))
        .sort((a, b) => b.n - a.n);
    }

    // Conversión por canal: de dónde vienen los leads y cuántos cierran. La
    // tasa de cierre se mide sobre los ya decididos (ganados + perdidos); los
    // que siguen abiertos cuentan como "leads" pero no penalizan la tasa.
    {
      type C = { leads: number; ganadas: number; perdidas: number; facturacion: number };
      const m = new Map<string, C>();
      for (const o of ops) {
        const k = o.canal || "sin_canal";
        const c = m.get(k) ?? { leads: 0, ganadas: 0, perdidas: 0, facturacion: 0 };
        c.leads += 1;
        if (CONTRATADAS.includes(o.estado)) {
          c.ganadas += 1;
          c.facturacion += calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
        } else if (["perdida", "descartada"].includes(o.estado)) {
          c.perdidas += 1;
        }
        m.set(k, c);
      }
      conversionCanal = Array.from(m.entries())
        .map(([k, c]) => {
          const decididas = c.ganadas + c.perdidas;
          return {
            label: k === "sin_canal" ? "Sin especificar" : (CANAL_LABEL[k] ?? k),
            leads: c.leads,
            ganadas: c.ganadas,
            pctCierre: decididas > 0 ? Math.round((c.ganadas / decididas) * 100) : 0,
            facturacion: c.facturacion,
          };
        })
        .sort((a, b) => b.leads - a.leads);
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
    // Solo restan las horas imputadas a oportunidades CONTRATADAS: las horas
    // comerciales de presupuestos que se pierden y el taller/admin son la
    // mitad "estructura" que ya cubre la tarifa cargada — si restaran aquí, la
    // máquina bajaría sin que ese coste aparezca en ninguna contribución
    // (cobertura inflada). Con varios asalariados el bote es común (hipótesis
    // consciente: hoy solo hay una empleada).
    const contratadasIds = new Set(ops.filter((o) => CONTRATADAS.includes(o.estado)).map((o) => o.id));
    const imputadoMes = partesTodas
      .filter((p) => !p.tesoreria_id && p.equipo_id && asalariados.has(p.equipo_id))
      .filter((p) => p.oportunidad_id && contratadasIds.has(p.oportunidad_id))
      .filter((p) => (p.fecha ?? p.created_at.slice(0, 10)).startsWith(hoyYm))
      .reduce((s, p) => s + Number(p.horas) * Number(p.precio_hora), 0);
    // "Vivo" = hay sueldos dados de alta en Gastos fijos (aunque este mes no
    // haya ninguno vigente: entonces el sueldo del mes es un CERO real, p. ej.
    // meses sin contrato — no se inventa la referencia).
    const vivo = gastosFijos.some((g) => g.activo && g.categoria === "sueldo");
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
        // Evento abierto: costes = el MAYOR de real y plan (con 2 h apuntadas
        // no desaparecen los materiales aún sin registrar → contribución
        // conservadora). Cerrado: mandan los costes reales congelados.
        const costes = o.cerrada ? (real > 0 ? real : previsto) : Math.max(real, previsto);
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

    // --- Jornada de Cristina + calibración del modelo (SOLO SOCIOS: vive en el
    // Cuadro de mando, que Cristina no ve). Mide sus horas reales del mes contra
    // el contrato y calcula, con los últimos 3 meses, el "% horas a eventos" y
    // los "eventos/mes" REALES para poder afinar la calculadora con datos en vez
    // de a ojo. CRISTINA = empleada; "Cris" (socia) no cuela en /crist/i.
    const cristina = equipo.find((e) => e.activo && /crist/i.test(e.nombre));
    if (cristina) {
      const contratoMes = cristina.horas_semana ? Number(cristina.horas_semana) * SEMANAS_POR_MES : 0;
      const mesesAtras = (n: number) => {
        const d = new Date(`${hoyYm}-01T00:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() - n);
        return d.toISOString().slice(0, 7);
      };
      const ventana3 = [mesesAtras(0), mesesAtras(1), mesesAtras(2)];
      // Sus partes (no externos): horas a eventos contratados vs. estructura.
      const susPartes = partesTodas.filter((p) => !p.tesoreria_id && p.equipo_id === cristina.id);
      const reparte = (meses: string[]) => {
        let ev = 0, es = 0;
        for (const p of susPartes) {
          const m = (p.fecha ?? p.created_at.slice(0, 10)).slice(0, 7);
          if (!meses.includes(m)) continue;
          const h = Number(p.horas);
          if (p.oportunidad_id && contratadasIds.has(p.oportunidad_id)) ev += h;
          else es += h;
        }
        return { ev, es, total: ev + es };
      };
      const mes = reparte([hoyYm]);
      const tri = reparte(ventana3);
      const eventos3 = ops.filter(
        (o) => CONTRATADAS.includes(o.estado) && ventana3.includes((o.fecha_evento ?? "").slice(0, 7)),
      ).length;
      jornada = {
        nombre: cristina.nombre,
        ym: hoyYm,
        contratoMes,
        horasMes: mes.total,
        horasEventoMes: mes.ev,
        horasEstructuraMes: mes.es,
        // Calibración con la ventana de 3 meses (si hay datos suficientes).
        pctEventosReal: tri.total > 0 ? Math.round((tri.ev / tri.total) * 100) : null,
        eventosMesReal: eventos3 > 0 ? Math.round((eventos3 / 3) * 10) / 10 : null,
        horas3m: tri.total,
        pctEventosConfig: Math.round(Number(cfgCalc.repartoEventosPct) || 0),
        eventosMesConfig: Math.round(Number(cfgCalc.eventosMes) || 0),
        cfg: cfgCalc,
      };
    }

    rows = ops.map((o) => {
      const total = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
      const cobrado = o.cobrado ?? 0;
      // Coste conservador (igual que la cobertura): un evento contratado pero
      // sin ejecutar no tiene "0 € de gasto" → margen del 100% inflado. Si aún
      // no hay gasto real registrado, se usa el previsto (con contingencia).
      const gastoReal = gastoPorOp.get(o.id) ?? 0;
      const gastoPrevisto = (estPorOp.get(o.id) ?? 0) * (1 + Number(o.contingencia_pct ?? 6) / 100);
      const gastos = o.cerrada ? (gastoReal > 0 ? gastoReal : gastoPrevisto) : Math.max(gastoReal, gastoPrevisto);
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
          Analítica del negocio con filtros. El margen es ingresos − costes del evento: reales cuando se han
          registrado y, si el evento aún no se ha ejecutado, los previstos (para no inflar el margen).
        </p>
      </div>
      {forecast && (forecast.total > 0 || forecast.abiertoTotal > 0) && (
        <Card>
          <Overline className="!mt-0">Previsión del pipeline</Overline>
          <p className="mb-3 mt-1 text-[12px] text-ink-muted">
            <b>Total</b> = todo lo que hay en juego. <b>Ponderado</b> = cada oportunidad × su
            probabilidad de cierre (lo que es realista que entre).
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ForecastKpi label="Pipeline total" value={eur(forecast.total)} tone="text-ink" />
            <ForecastKpi label="Ponderado" value={eur(forecast.ponderado)} tone="text-sage" />
            <ForecastKpi label="Abierto (sin confirmar)" value={eur(forecast.abiertoTotal)} tone="text-ink-secondary" />
            <ForecastKpi label="Abierto ponderado" value={eur(forecast.abiertoPonderado)} tone="text-clay-600" />
          </div>
        </Card>
      )}
      {cobertura && <CoberturaFijos c={cobertura} />}
      {jornada && <JornadaCalibracion j={jornada} />}

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
              Solo eventos contratados. Margen = ingresos − costes del evento: reales si están registrados
              o, para los que aún no se han ejecutado, los previstos (para no inflar el margen).
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RentabilidadTabla titulo="Por tipo de evento" col="Tipo" filas={porTipo} />
              <RentabilidadTabla titulo="Por cliente (top 10)" col="Cliente" filas={porCliente} />
            </div>
          </>
        );
      })()}

      {/* Por qué no cerramos: motivos de las oportunidades perdidas/rechazadas. */}
      {perdidasTotal > 0 && (
        <>
          <Overline>Por qué no cerramos</Overline>
          <Card>
            <p className="mb-3 text-[12px] text-ink-muted">
              Motivos de las {perdidasTotal} oportunidades perdidas o rechazadas. Se rellena al
              marcarlas «Perdida»/«Rechazada».
            </p>
            <div className="space-y-2">
              {motivosPerdida.map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="w-[42%] shrink-0 truncate text-[13px] text-ink-secondary">{m.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-beige-warm">
                    <div className="h-full rounded-pill bg-clay" style={{ width: `${m.pct}%` }} />
                  </div>
                  <span className="w-[70px] shrink-0 text-right text-[12px] tabular text-ink-muted">
                    {m.n} · {m.pct}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Conversión por canal: de dónde vienen los leads y cuáles cierran. */}
      {conversionCanal.length > 0 && (
        <>
          <Overline>Conversión por canal</Overline>
          <p className="-mt-2 text-[12px] text-ink-muted">
            De dónde vienen los leads y qué % acaba cerrando (sobre los ya decididos, ganados +
            perdidos). Dónde merece la pena invertir.
          </p>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                    <th className="py-1.5 text-left font-semibold">Canal</th>
                    <th className="py-1.5 text-right font-semibold">Leads</th>
                    <th className="py-1.5 text-right font-semibold">Ganadas</th>
                    <th className="py-1.5 text-right font-semibold">% cierre</th>
                    <th className="py-1.5 text-right font-semibold">Facturación</th>
                  </tr>
                </thead>
                <tbody>
                  {conversionCanal.map((c) => (
                    <tr key={c.label}>
                      <td className="border-t border-border/60 py-1.5">{c.label}</td>
                      <td className="border-t border-border/60 py-1.5 text-right tabular">{c.leads}</td>
                      <td className="border-t border-border/60 py-1.5 text-right tabular">{c.ganadas}</td>
                      <td className="border-t border-border/60 py-1.5 text-right tabular font-semibold">
                        <span className={c.pctCierre >= 50 ? "text-ok" : c.pctCierre >= 25 ? "text-warn" : "text-error"}>
                          {c.pctCierre}%
                        </span>
                      </td>
                      <td className="border-t border-border/60 py-1.5 text-right tabular text-sage">{eur(c.facturacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

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
function ForecastKpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md bg-beige-light p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-[20px] tabular ${tone}`}>{value}</div>
    </div>
  );
}

function CoberturaFijos({ c }: { c: Cobertura }) {
  // Máquina a 0 (sueldo ya recuperado y sin fijos) → cubierta por definición.
  const pct = c.maquina > 0 ? (c.contribucion / c.maquina) * 100 : 100;
  const cubierta = pct >= 100;
  const sobrante = c.contribucion - c.maquina;
  // Si lo imputado supera el sueldo del mes, la resta se recorta a 0 y suele
  // delatar un error de datos (partes duplicados o €/h cargada en vez de real).
  const imputadoEfectivo = Math.min(c.imputado, c.sueldoMes);
  const sobreimputado = c.imputado > c.sueldoMes + 0.01;
  // Punto de equilibrio en eventos: cuánto falta ÷ contribución media de un
  // evento del mes (si aún no hay eventos, referencia = máquina ÷ 6).
  const conAporte = c.eventos.filter((e) => e.contribucion > 0);
  const contribMedia =
    conAporte.length > 0 ? conAporte.reduce((s, e) => s + e.contribucion, 0) / conAporte.length : c.maquina / 6;
  const faltanEventos = !cubierta && contribMedia > 0 ? Math.ceil(-sobrante / contribMedia) : 0;
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
              eventos {eur(imputadoEfectivo)}
              {sobreimputado && (
                <span
                  className="ml-1 font-semibold text-clay"
                  title={`Hay ${eur(c.imputado)} imputados, más que el sueldo del mes: revisa partes duplicados o el €/h de los partes (debe ser el coste real, no la tarifa cargada).`}
                >
                  ⚠
                </span>
              )}{" "}
              = <b className="tabular text-ink">{eur(c.maquina)}/mes</b>
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
          <span className="font-semibold text-clay">
            Faltan {eur(-sobrante)} para cubrir el mes
            {faltanEventos > 0 && ` · ≈ ${faltanEventos} evento${faltanEventos === 1 ? "" : "s"} más`}
          </span>
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
          <> El sueldo se recupera por horas: cada parte de horas en eventos contratados baja lo que queda
          de máquina (las horas de presupuestos perdidos y de taller son estructura: no descuentan). Los
          partes de otros meses de un evento cuentan en su propio mes; el pequeño desfase se compensa entre
          meses.</>
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
