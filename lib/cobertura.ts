import type { Oportunidad, GastoFijo, CosteEstimado, ParteHoras, Tesoreria, ComisionConfig } from "@/lib/types";
import { boteFijosMes, sueldosFijosMes, mezclarConfig } from "@/lib/calculadora-precio";
import { comisionDeOportunidad } from "@/lib/comisiones";
import { calcularTotales } from "@/lib/calc";

const CONTRATADAS = ["confirmada", "en_produccion", "realizada", "facturada"];

// Cobertura de fijos de un mes: la "máquina" (gastos fijos + parte del sueldo
// aún no recuperada por horas) contra la contribución que dejan los eventos
// contratados con fecha ese mes (base − costes − comisión). Es la misma lógica
// que el panel del Cuadro de mando, extraída para reutilizarla en el termómetro
// de Reports. Detalle del modelo en docs/modelo-costes.md §8.
export type CoberturaMes = {
  ym: string;
  bote: number; // fijos sin sueldo (local, software…)
  sueldoMes: number;
  estructural: number; // sueldo no recuperado por horas imputadas
  maquina: number; // objetivo a cubrir = bote + estructural
  contribucion: number; // lo cubierto por los eventos del mes
  pct: number; // contribución / máquina · 0..100+
  nEventos: number;
};

export type CoberturaDeps = {
  ops: Oportunidad[];
  gastosFijos: GastoFijo[];
  calcRaw: unknown;
  estimados: CosteEstimado[];
  partes: ParteHoras[];
  tesoreria: Tesoreria[];
  comConfig: ComisionConfig[];
};

export function coberturaMes(ym: string, d: CoberturaDeps): CoberturaMes {
  const cfgCalc = mezclarConfig(d.calcRaw);

  // Costes por oportunidad (independientes del mes).
  const estPorOp = new Map<string, number>();
  for (const e of d.estimados) estPorOp.set(e.oportunidad_id, (estPorOp.get(e.oportunidad_id) ?? 0) + Number(e.importe));
  const gastoEventoPorOp = new Map<string, number>();
  for (const t of d.tesoreria) {
    if (t.tipo === "gasto" && t.naturaleza === "gasto_de_evento" && t.oportunidad_id) {
      gastoEventoPorOp.set(t.oportunidad_id, (gastoEventoPorOp.get(t.oportunidad_id) ?? 0) + Number(t.importe));
    }
  }
  const horasPorOp = new Map<string, number>();
  for (const p of d.partes) {
    if (p.tesoreria_id) continue; // los externos ya cuentan como gasto en tesorería
    if (p.oportunidad_id) horasPorOp.set(p.oportunidad_id, (horasPorOp.get(p.oportunidad_id) ?? 0) + Number(p.horas) * Number(p.precio_hora));
  }

  const bote = boteFijosMes(d.gastosFijos, ym);
  const sf = sueldosFijosMes(d.gastosFijos, ym);
  const asalariados = new Set(sf.equipoIds);
  const contratadasIds = new Set(d.ops.filter((o) => CONTRATADAS.includes(o.estado)).map((o) => o.id));
  const imputadoMes = d.partes
    .filter((p) => !p.tesoreria_id && p.equipo_id && asalariados.has(p.equipo_id))
    .filter((p) => p.oportunidad_id && contratadasIds.has(p.oportunidad_id))
    .filter((p) => (p.fecha ?? p.created_at.slice(0, 10)).startsWith(ym))
    .reduce((s, p) => s + Number(p.horas) * Number(p.precio_hora), 0);
  const vivo = d.gastosFijos.some((g) => g.activo && g.categoria === "sueldo");
  const sueldoMes = vivo ? sf.total : cfgCalc.costeMensualEmpleada;
  const estructural = vivo
    ? Math.max(0, sf.total - imputadoMes)
    : cfgCalc.costeMensualEmpleada * (1 - cfgCalc.repartoEventosPct / 100);

  const eventos = d.ops.filter((o) => CONTRATADAS.includes(o.estado) && o.fecha_evento?.slice(0, 7) === ym);
  let contribucion = 0;
  for (const o of eventos) {
    const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
    const real = (gastoEventoPorOp.get(o.id) ?? 0) + (horasPorOp.get(o.id) ?? 0);
    const previsto = (estPorOp.get(o.id) ?? 0) * (1 + Number(o.contingencia_pct ?? 6) / 100);
    const costes = o.cerrada ? (real > 0 ? real : previsto) : Math.max(real, previsto);
    contribucion += t.base - costes - comisionDeOportunidad(o, d.comConfig);
  }

  const maquina = bote + estructural;
  const pct = maquina > 0 ? (contribucion / maquina) * 100 : contribucion > 0 ? 100 : 0;
  return { ym, bote, sueldoMes, estructural, maquina, contribucion, pct, nEventos: eventos.length };
}
