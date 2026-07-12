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

// Fecha de referencia de una oportunidad para la vigencia de comisiones: la
// del evento y, en su defecto, la de confirmación o la de entrada.
function fechaRefOportunidad(o: Oportunidad): string | null {
  return o.fecha_evento || o.fecha_confirmacion || o.fecha_entrada || null;
}

// Una regla aplica a la oportunidad si no tiene "desde" o si el evento es de
// esa fecha en adelante. Si la regla tiene "desde" pero la oportunidad no tiene
// fecha, no aplica (no se puede confirmar que la persona ya estuviera).
function reglaVigente(c: ComisionConfig, refDate: string | null): boolean {
  if (!c.desde) return true;
  return refDate != null && refDate >= c.desde;
}

// Una oportunidad está cobrada (pagada) cuando lo cobrado cubre su total.
export function oportunidadCobrada(o: Oportunidad): boolean {
  if (!ESTADOS_VIVOS.includes(o.estado)) return false;
  const t = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0);
  return t.total > 0 && (o.cobrado ?? 0) >= t.total - 0.01;
}

// Regla de comisión aplicable a una persona en una oportunidad: la específica
// del tipo de evento, o la "todos" (tipo null), respetando la vigencia "desde".
function reglaParaPersona(
  o: Oportunidad,
  config: ComisionConfig[],
  equipoId: string,
): ComisionConfig | null {
  const refDate = fechaRefOportunidad(o);
  const cfgs = config.filter(
    (c) => c.activo && c.equipo_id === equipoId && c.porcentaje > 0 && reglaVigente(c, refDate),
  );
  return cfgs.find((c) => c.tipo_evento === o.tipo_evento) ?? cfgs.find((c) => !c.tipo_evento) ?? null;
}

// Comisión de UNA oportunidad, sobre su base imponible: SOLO la de la persona
// asignada a mano en la oportunidad (comision_equipo_id). Sin persona → 0.
// Sirve para el margen del evento (cuente o no como pagada).
export function comisionDeOportunidad(o: Oportunidad, config: ComisionConfig[]): number {
  return comisionDetalleDeOportunidad(o, config).reduce((s, l) => s + l.importe, 0);
}

// Desglose de la comisión del evento (para explicar de dónde sale el coste en la
// pestaña Costes: "Cristina · Boda 6% · 12 €"). Como máximo una línea: la de la
// persona asignada en la oportunidad.
export type ComisionLinea = { persona: string; tipoEvento: string | null; porcentaje: number; importe: number };
export function comisionDetalleDeOportunidad(o: Oportunidad, config: ComisionConfig[]): ComisionLinea[] {
  if (!ESTADOS_VIVOS.includes(o.estado)) return [];
  if (!o.comision_equipo_id) return []; // sin persona asignada → sin comisión
  const base = calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).base;
  if (base <= 0) return [];
  const cfg = reglaParaPersona(o, config, o.comision_equipo_id);
  if (!cfg) return [];
  return [
    {
      persona: cfg.equipo?.nombre ?? "—",
      tipoEvento: cfg.tipo_evento,
      porcentaje: cfg.porcentaje,
      importe: r2((base * cfg.porcentaje) / 100),
    },
  ];
}

// Calcula los devengos de comisión: por cada oportunidad ya COBRADA y cada
// persona con % configurado (específico del tipo de evento o "todos").
export function computeDevengos(
  oportunidades: Oportunidad[],
  config: ComisionConfig[],
  pagadas: Comision[],
): Devengo[] {
  const devengos: Devengo[] = [];
  for (const o of oportunidades) {
    // La comisión se devenga cuando la oportunidad está cobrada… salvo que ya
    // se pagara la comisión antes (para no hacer desaparecer un pago hecho).
    const pagadasOp = pagadas.filter((p) => p.oportunidad_id === o.id);
    if (!oportunidadCobrada(o) && pagadasOp.length === 0) continue;
    const base = calcularTotales(
      o.presupuesto_lineas ?? [],
      o.iva_pct,
      o.retencion_pct,
      o.descuento_pct ?? 0,
    ).base;
    if (base <= 0) continue;

    // Solo la persona asignada a la oportunidad (comision_equipo_id), más las
    // que ya tengan una comisión pagada aquí (para no perder ese historial).
    const candidatos = new Set<string>();
    if (o.comision_equipo_id) candidatos.add(o.comision_equipo_id);
    for (const p of pagadasOp) if (p.equipo_id) candidatos.add(p.equipo_id);

    for (const equipoId of candidatos) {
      const cfg = reglaParaPersona(o, config, equipoId);
      const pago = pagadasOp.find((p) => p.equipo_id === equipoId);
      // Sin regla vigente: solo se muestra si ya estaba pagada (usa su importe).
      if (!cfg && !pago) continue;
      const porcentaje = cfg?.porcentaje ?? pago?.porcentaje ?? 0;
      const importe = cfg ? r2((base * cfg.porcentaje) / 100) : r2(Number(pago?.importe ?? 0));
      const persona = cfg?.equipo?.nombre ?? "—";
      devengos.push({
        key: `${o.id}:${equipoId}`,
        oportunidadId: o.id,
        evento: o.titulo,
        tipoEvento: o.tipo_evento,
        equipoId,
        persona,
        base,
        porcentaje,
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
