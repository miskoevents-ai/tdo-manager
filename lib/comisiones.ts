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

const ESTADOS_DEVENGAN = ["confirmada", "realizada", "facturada"];
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Calcula los devengos de comisión: por cada oportunidad confirmada y cada
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
    if (!ESTADOS_DEVENGAN.includes(o.estado)) continue;
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
