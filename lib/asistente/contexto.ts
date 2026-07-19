import {
  getOportunidades,
  getTesoreria,
  getGastosFijos,
  getClientes,
  getInventario,
} from "@/lib/data";
import { calcularTotales } from "@/lib/calc";
import { ESTADO_META, TIPO_EVENTO_LABEL, NATURALEZA_LABEL } from "@/lib/estados";
import { eur, fecha } from "@/lib/format";
import type { Oportunidad } from "@/lib/types";

// Total (base+IVA−retención) de una oportunidad a partir de sus líneas.
function totalOp(o: Oportunidad): number {
  return calcularTotales(o.presupuesto_lineas ?? [], o.iva_pct, o.retencion_pct, o.descuento_pct ?? 0).total;
}

/**
 * Construye un resumen de texto del estado del negocio para dar contexto al
 * asistente. Todo se lee en el servidor con la secret key (o el mock).
 * `hoyISO` se pasa desde la petición para no depender del reloj del contenedor.
 */
export async function construirContexto(hoyISO: string): Promise<string> {
  const [oportunidades, tesoreria, gastosFijos, clientes, inventario] = await Promise.all([
    getOportunidades(),
    getTesoreria(),
    getGastosFijos(),
    getClientes(),
    getInventario(),
  ]);

  const lineas: string[] = [];
  lineas.push(`Fecha de hoy: ${hoyISO}.`);

  // Pipeline por estado
  const porEstado = new Map<string, number>();
  for (const o of oportunidades) porEstado.set(o.estado, (porEstado.get(o.estado) ?? 0) + 1);
  const pipeline = Array.from(porEstado.entries())
    .map(([e, n]) => `${ESTADO_META[e as keyof typeof ESTADO_META]?.label ?? e}: ${n}`)
    .join(", ");
  lineas.push(`\n## Pipeline comercial (${oportunidades.length} oportunidades)\n${pipeline}`);

  // Próximos eventos confirmados/realizados con fecha futura
  const proximos = oportunidades
    .filter(
      (o) =>
        ["confirmada", "en_produccion", "realizada", "facturada"].includes(o.estado) &&
        o.fecha_evento &&
        o.fecha_evento >= hoyISO,
    )
    .sort((a, b) => (a.fecha_evento ?? "").localeCompare(b.fecha_evento ?? ""))
    .slice(0, 12);
  if (proximos.length) {
    lineas.push("\n## Próximos eventos");
    for (const o of proximos) {
      const pend = Math.max(0, totalOp(o) - (o.cobrado ?? 0));
      lineas.push(
        `- ${fecha(o.fecha_evento)} · ${o.titulo} (${TIPO_EVENTO_LABEL[o.tipo_evento] ?? o.tipo_evento})` +
          ` · ${o.cliente?.nombre ?? "sin cliente"} · total ${eur(totalOp(o))}` +
          (pend > 0.01 ? ` · pendiente ${eur(pend)}` : " · cobrado"),
      );
    }
  }

  // Tesorería del mes en curso
  const ym = hoyISO.slice(0, 7);
  const delMes = tesoreria.filter((t) => t.fecha.slice(0, 7) === ym);
  const ingMes = delMes
    .filter((t) => t.tipo === "ingreso" && t.estado === "cobrado")
    .reduce((s, t) => s + Number(t.importe), 0);
  const gasMes = delMes
    .filter((t) => t.tipo === "gasto")
    .reduce((s, t) => s + Number(t.importe), 0);
  lineas.push(
    `\n## Tesorería del mes (${ym})\nIngresos cobrados: ${eur(ingMes)} · Gastos: ${eur(gasMes)} · Resultado: ${eur(ingMes - gasMes)}`,
  );

  // Contabilidad acumulada (regla §5.4: solo computa_contabilidad desde jun-2026)
  const contables = tesoreria.filter((t) => t.computa_contabilidad && t.fecha.slice(0, 7) >= "2026-06");
  const ingCont = contables
    .filter((t) => t.tipo === "ingreso" && t.estado === "cobrado")
    .reduce((s, t) => s + Number(t.importe), 0);
  const gasCont = contables.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.importe), 0);
  const porNat = new Map<string, number>();
  for (const t of contables) {
    const v = (t.tipo === "ingreso" ? 1 : -1) * Number(t.importe);
    const k = NATURALEZA_LABEL[t.naturaleza] ?? t.naturaleza;
    porNat.set(k, (porNat.get(k) ?? 0) + v);
  }
  lineas.push(
    `\n## Contabilidad de la nueva etapa (desde jun-2026, §5.4)\nIngresos: ${eur(ingCont)} · Gastos fijos: ${eur(gasCont)} · Resultado: ${eur(ingCont - gasCont)}`,
  );

  // Gastos fijos configurados
  const gfActivos = gastosFijos.filter((g) => g.activo !== false);
  const gfTotal = gfActivos.reduce((s, g) => s + Number(g.importe_mensual), 0);
  lineas.push(
    `\n## Gastos fijos mensuales (${gfActivos.length}, total ${eur(gfTotal)})\n` +
      gfActivos.map((g) => `- ${g.concepto}: ${eur(Number(g.importe_mensual))}`).join("\n"),
  );

  // Clientes e inventario (cifras generales)
  lineas.push(`\n## Otros\nClientes en base: ${clientes.length}. Artículos de inventario: ${inventario.length}.`);

  return lineas.join("\n");
}
