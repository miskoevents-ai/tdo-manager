import { calcularTotales } from "@/lib/calc";
import type { Oportunidad, ComisionConfig, Comision } from "@/lib/types";

export type Devengo = {
  key: string;
  oportunidadId: string;
  evento: string;
  tipoEvento: string;
  equipoId: string;
  persona: string;
  base: number;
  porcentaje: number;
  importe: number;
  pagada: boolean;
  comisionId?: string;
  tesoreriaId?: string | null;
};

const ESTADOS_VIVOS = ["confirmada", "realizada", "facturada"];
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Una oportunidad está cobrada (pagada) cuando lo cobrado cubre su total.
export function oportunidadCobrada(o: Oportunidad): boolean {
  if (!ESTADOS_VIVOS.includes(o.estado)) return false;
  const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
  return t.total > 0 && (o.cobrado ?? 0) >= t.total - 0.01;
}

// Comisión total (todas las personas con regla) de UNA oportunidad, sobre su
// base imponible. Sirve para el margen del evento (cuente o no como pagada).
export function comisionDeOportunidad(o: Oportunidad, config: ComisionConfig[]): number {
  if (!ESTADOS_VIVOS.includes(o.estado)) return 0;
  const base = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).base;
  if (base <= 0) return 0;
  const activos = config.filter((c) => c.activo && c.equipo_id && c.porcentaje > 0);
  const porPersona = new Map<string, ComisionConfig[]>();
  for (const c of activos) {
    const arr = porPersona.get(c.equipo_id!) ?? [];
    arr.push(c);
    porPersona.set(c.equipo_id!, arr);
  }
  let total = 0;
  for (const [, cfgs] of porPersona) {
    const cfg = cfgs.find((c) => c.tipo_evento === o.tipo_evento) ?? cfgs.find((c) => !c.tipo_evento);
    if (cfg) total += r2((base * cfg.porcentaje) / 100);
  }
  return r2(total);
}

// Calcula los devengos de comisión: por cada oportunidad ya COBRADA y cada
// persona con % configurado (específico del tipo de evento o "todos").
export function computeDevengos(
  oportunidades: Oportunidad[],
  config: ComisionConfig[],
  pagadas: Comision[],
): Devengo[] {
  const activos = config.filter((c) => c.activo && c.equipo_id && c.porcentaje > 0);
  // Config por persona
  const porPersona = new Map<string, ComisionConfig[]>();
  for (const c of activos) {
    const arr = porPersona.get(c.equipo_id!) ?? [];
    arr.push(c);
    porPersona.set(c.equipo_id!, arr);
  }

  const devengos: Devengo[] = [];
  for (const o of oportunidades) {
    // La comisión se devenga cuando la oportunidad está cobrada… salvo que ya
    // se pagara la comisión antes (para no hacer desaparecer un pago hecho).
    const yaPagadaAlguna = pagadas.some((p) => p.oportunidad_id === o.id);
    if (!oportunidadCobrada(o) && !yaPagadaAlguna) continue;
    const base = calcularTotales(
      o.presupuesto_lineas ?? [],
      o.iva_pct,
      o.retencion_pct,
      o.descuento_pct ?? 0,
    ).base;
    if (base <= 0) continue;

    for (const [equipoId, cfgs] of porPersona) {
      // % aplicable: específico del tipo de evento, si no, el "todos" (tipo null)
      const especifico = cfgs.find((c) => c.tipo_evento === o.tipo_evento);
      const todos = cfgs.find((c) => !c.tipo_evento);
      const cfg = especifico ?? todos;
      if (!cfg) continue;

      const importe = r2((base * cfg.porcentaje) / 100);
      const pago = pagadas.find(
        (p) => p.oportunidad_id === o.id && p.equipo_id === equipoId,
      );
      devengos.push({
        key: `${o.id}:${equipoId}`,
        oportunidadId: o.id,
        evento: o.titulo,
        tipoEvento: o.tipo_evento,
        equipoId,
        persona: cfg.equipo?.nombre ?? "—",
        base,
        porcentaje: cfg.porcentaje,
        importe,
        pagada: Boolean(pago),
        comisionId: pago?.id,
        tesoreriaId: pago?.tesoreria_id ?? null,
      });
    }
  }
  return devengos;
}

// Resumen de comisiones para Tesorería/Contabilidad: totales y por persona.
export function resumenComisiones(devengos: Devengo[]) {
  const porPersona = new Map<string, { devengado: number; pagado: number }>();
  let devengado = 0;
  let pagado = 0;
  for (const d of devengos) {
    devengado += d.importe;
    if (d.pagada) pagado += d.importe;
    const acc = porPersona.get(d.persona) ?? { devengado: 0, pagado: 0 };
    acc.devengado += d.importe;
    if (d.pagada) acc.pagado += d.importe;
    porPersona.set(d.persona, acc);
  }
  return {
    devengado: r2(devengado),
    pagado: r2(pagado),
    pendiente: r2(devengado - pagado),
    porPersona: Array.from(porPersona.entries())
      .map(([persona, v]) => ({ persona, ...v, pendiente: r2(v.devengado - v.pagado) }))
      .sort((a, b) => b.pendiente - a.pendiente),
  };
}
