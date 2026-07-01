import { getOportunidades, getTesoreria, getReservas } from "@/lib/data";
import { calcularAvisos } from "@/lib/avisos";
import { calcularTotales } from "@/lib/calc";
import { restaDias } from "@/lib/cron";
import { eur } from "@/lib/format";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";
import type { Oportunidad } from "@/lib/types";

const CONTRATADAS = ["confirmada", "realizada", "facturada"];
const APP_URL = process.env.APP_URL || "https://tdo-manager.vercel.app";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type TipoDigest = "semanal" | "mensual";

type Item = { titulo: string; detalle: string };

function totalOp(o: Oportunidad): number {
  return calcularTotales(
    (o.presupuesto_lineas ?? []).map((l) => ({ cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
    o.iva_pct,
    o.retencion_pct,
  ).total;
}

// Construye el informe para los socios.
//  - "semanal" (viernes): análisis de la semana + acumulado del mes + acciones.
//  - "mensual" (último día del mes): resumen completo del mes.
export async function construirDigest(
  hoyISO: string,
  tipo: TipoDigest = "semanal",
): Promise<{ asunto: string; html: string; texto: string; resumen: Record<string, number> }> {
  const [ops, tesoreria, reservas] = await Promise.all([getOportunidades(), getTesoreria(), getReservas()]);
  const avisos = calcularAvisos(ops, hoyISO, reservas);
  const cobros = avisos.filter((a) => a.categoria === "cobro");
  const fianzas = avisos.filter((a) => a.categoria === "fianza");
  const presupuestos = avisos.filter((a) => a.categoria === "presupuesto");
  const eventos = avisos.filter((a) => a.categoria === "evento");
  const leadsFrios = avisos.filter((a) => a.categoria === "lead");
  const solapes = avisos.filter((a) => a.categoria === "material");

  const ym = hoyISO.slice(0, 7);
  const prevYm = restaMes(ym);
  const mesLabel = `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

  // --- Acumulado del mes (§ va sumando semana a semana) ---
  const cobradoMesDe = (m: string) =>
    tesoreria.filter((t) => t.fecha.slice(0, 7) === m && t.tipo === "ingreso" && t.estado === "cobrado").reduce((s, t) => s + Number(t.importe), 0);
  const gastosMesDe = (m: string) =>
    tesoreria.filter((t) => t.fecha.slice(0, 7) === m && t.tipo === "gasto").reduce((s, t) => s + Number(t.importe), 0);
  const ingMes = cobradoMesDe(ym);
  const gasMes = gastosMesDe(ym);
  const resultadoMes = ingMes - gasMes;
  const ingPrev = cobradoMesDe(prevYm);
  const tendencia = ingPrev > 0 ? Math.round(((ingMes - ingPrev) / ingPrev) * 100) : null;
  const pendienteTotal = tesoreria
    .filter((t) => t.tipo === "ingreso" && t.estado === "previsto")
    .reduce((s, t) => s + Number(t.importe), 0);
  const eventosMes = ops.filter((o) => CONTRATADAS.includes(o.estado) && (o.fecha_evento ?? "").slice(0, 7) === ym);
  const facturacionMes = eventosMes.reduce((s, o) => s + totalOp(o), 0);

  // --- Esta semana (últimos 7 días) ---
  const semDesde = restaDias(hoyISO, 6);
  const enSemana = (f?: string | null) => !!f && f >= semDesde && f <= hoyISO;
  const cobradoSemana = tesoreria.filter((t) => t.tipo === "ingreso" && t.estado === "cobrado" && enSemana(t.fecha)).reduce((s, t) => s + Number(t.importe), 0);
  const gastosSemana = tesoreria.filter((t) => t.tipo === "gasto" && enSemana(t.fecha)).reduce((s, t) => s + Number(t.importe), 0);
  const confirmadasSemana = ops.filter((o) => enSemana(o.fecha_confirmacion));
  const valorConfirmadasSemana = confirmadasSemana.reduce((s, o) => s + totalOp(o), 0);
  const eventosSemana = ops.filter((o) => enSemana(o.fecha_evento)).length;
  const leadsSemana = ops.filter((o) => enSemana(o.fecha_entrada)).length;

  // --- Amigos / préstamos ---
  const amigos: Item[] = ops
    .filter((o) => o.tipo_operacion === "amigos_prestamo" && CONTRATADAS.includes(o.estado))
    .map((o) => ({ titulo: o.titulo, detalle: `${o.cliente?.nombre ?? "—"} · ${eur(totalOp(o))}`, total: totalOp(o) }))
    .sort((a, b) => (b as { total: number }).total - (a as { total: number }).total)
    .map(({ titulo, detalle }) => ({ titulo, detalle }));
  const totalAmigos = ops
    .filter((o) => o.tipo_operacion === "amigos_prestamo" && CONTRATADAS.includes(o.estado))
    .reduce((s, o) => s + totalOp(o), 0);

  // --- Extras solo del resumen mensual ---
  const topClientesMes: Item[] = agrupa(eventosMes, (o) => o.cliente?.nombre ?? "—")
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((g) => ({ titulo: g.k, detalle: eur(g.total) }));
  const repartoTipoMes: Item[] = agrupa(eventosMes, (o) => TIPO_EVENTO_LABEL[o.tipo_evento] ?? o.tipo_evento)
    .sort((a, b) => b.total - a.total)
    .map((g) => ({ titulo: g.k, detalle: `${eur(g.total)} · ${facturacionMes > 0 ? Math.round((g.total / facturacionMes) * 100) : 0}%` }));

  // ---------- Composición ----------
  const esMensual = tipo === "mensual";
  const asunto = esMensual
    ? `Resumen del mes · ${mesLabel} · resultado ${eur(resultadoMes)}`
    : `Resumen semanal TDO · ${mesLabel} · ${cobros.length} cobros pendientes`;

  const kpi = (label: string, valor: string, color: string) =>
    `<td style="padding:10px;background:#f7f5ef;border-radius:8px;text-align:center"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em">${label}</div><div style="font-size:18px;color:${color};margin-top:4px">${valor}</div></td>`;
  const seccion = (titulo: string, color: string, items: Item[]) => {
    if (!items.length) return "";
    const filas = items
      .map((a) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px;color:#2a2a2a">${escapar(a.titulo)}<br><span style="color:#888;font-size:11px">${escapar(a.detalle)}</span></td></tr>`)
      .join("");
    return `<h3 style="margin:18px 0 6px;font-size:13px;color:${color};text-transform:uppercase;letter-spacing:.06em">${titulo} (${items.length})</h3><table width="100%" cellpadding="0" cellspacing="0">${filas}</table>`;
  };
  const mesKpis = `
    <table width="100%" cellspacing="8" cellpadding="0" style="margin-bottom:4px"><tr>
      ${kpi(`Facturación (${eventosMes.length} ev.)`, eur(facturacionMes), "#3F4A36")}
      ${kpi("Cobrado", eur(ingMes), "#4C8C4A")}
      ${kpi("Gastos", eur(gasMes), "#BE6E4C")}
    </tr></table>
    <table width="100%" cellspacing="8" cellpadding="0" style="margin-bottom:6px"><tr>
      ${kpi("Resultado", eur(resultadoMes), resultadoMes >= 0 ? "#4C8C4A" : "#B23B3B")}
      ${kpi("Previsto por cobrar", eur(pendienteTotal), "#C99A2E")}
      ${kpi("vs mes anterior", tendencia == null ? "—" : `${tendencia >= 0 ? "▲" : "▼"} ${Math.abs(tendencia)}%`, tendencia != null && tendencia < 0 ? "#B23B3B" : "#4C8C4A")}
    </tr></table>`;
  const semanaKpis = `
    <table width="100%" cellspacing="8" cellpadding="0" style="margin-bottom:6px"><tr>
      ${kpi("Cobrado", eur(cobradoSemana), "#4C8C4A")}
      ${kpi(`Confirmado (${confirmadasSemana.length})`, eur(valorConfirmadasSemana), "#3F4A36")}
      ${kpi("Eventos", String(eventosSemana), "#BE6E4C")}
      ${kpi("Leads nuevos", String(leadsSemana), "#5B7A9A")}
    </tr></table>`;

  const cabecera = esMensual ? `Resumen del mes · ${mesLabel}` : `Resumen semanal · Tu Decoración Original`;
  const subcabecera = esMensual ? "Cierre del mes" : `Semana hasta ${hoyISO} · ${mesLabel}`;

  const bloqueResumen = esMensual
    ? `<h3 style="margin:0 0 8px;font-size:13px;color:#3F4A36;text-transform:uppercase;letter-spacing:.06em">Resultado del mes</h3>${mesKpis}
       ${seccion("🏆 Top clientes del mes", "#3F4A36", topClientesMes)}
       ${seccion("📊 Por tipo de servicio", "#BE6E4C", repartoTipoMes)}`
    : `<h3 style="margin:0 0 8px;font-size:13px;color:#3F4A36;text-transform:uppercase;letter-spacing:.06em">Esta semana</h3>${semanaKpis}
       <h3 style="margin:16px 0 8px;font-size:13px;color:#3F4A36;text-transform:uppercase;letter-spacing:.06em">Cómo va el mes (acumulado)</h3>${mesKpis}`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#2a2a2a">
    <div style="background:#3F4A36;color:#FCFAF5;padding:20px 24px;border-radius:10px 10px 0 0">
      <div style="font-size:20px">${cabecera}</div>
      <div style="font-size:12px;color:#c7cbb8;margin-top:2px">${subcabecera}</div>
    </div>
    <div style="border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;padding:22px 24px">
      ${bloqueResumen}
      ${seccion("🚨 Dobles reservas de material", "#B23B3B", solapes)}
      ${seccion("🔴 Cobros pendientes", "#B23B3B", cobros)}
      ${seccion("🟠 Fianzas por devolver", "#BE6E4C", fianzas)}
      ${seccion("🟡 Presupuestos sin respuesta", "#C99A2E", presupuestos)}
      ${seccion("❄️ Leads · seguimiento", "#5B7A9A", leadsFrios)}
      ${seccion("📅 Próximos eventos", "#3F4A36", eventos)}
      ${seccion(`🤝 Amigos / préstamos · ${eur(totalAmigos)}`, "#8A957C", amigos)}
      <div style="margin-top:22px;text-align:center">
        <a href="${APP_URL}" style="display:inline-block;background:#3F4A36;color:#FCFAF5;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px">Abrir TDO Manager</a>
      </div>
    </div>
  </div>`;

  const bloque = (t: string, items: Item[]) => (items.length ? `\n${t}:\n${items.map((a) => `- ${a.titulo} (${a.detalle})`).join("\n")}\n` : "");
  const encabezado = esMensual
    ? `Resumen del mes · ${mesLabel}\nFacturación: ${eur(facturacionMes)} (${eventosMes.length} ev.) · Cobrado: ${eur(ingMes)} · Gastos: ${eur(gasMes)} · Resultado: ${eur(resultadoMes)}${tendencia != null ? ` · vs mes anterior ${tendencia >= 0 ? "+" : ""}${tendencia}%` : ""}`
    : `Resumen semanal TDO · ${mesLabel}\nEsta semana — Cobrado: ${eur(cobradoSemana)} · Confirmado: ${eur(valorConfirmadasSemana)} (${confirmadasSemana.length}) · Eventos: ${eventosSemana} · Leads: ${leadsSemana}\nAcumulado del mes — Facturación: ${eur(facturacionMes)} · Cobrado: ${eur(ingMes)} · Resultado: ${eur(resultadoMes)}`;
  const texto = `${encabezado}
${esMensual ? bloque("Top clientes del mes", topClientesMes) + bloque("Por tipo de servicio", repartoTipoMes) : ""}${bloque("Dobles reservas de material", solapes)}${bloque("Cobros pendientes", cobros)}${bloque("Fianzas por devolver", fianzas)}${bloque("Presupuestos sin respuesta", presupuestos)}${bloque("Leads seguimiento", leadsFrios)}${bloque("Próximos eventos", eventos)}${bloque(`Amigos / préstamos (${eur(totalAmigos)})`, amigos)}
${APP_URL}`;

  return {
    asunto,
    html,
    texto,
    resumen: {
      cobros: cobros.length,
      fianzas: fianzas.length,
      presupuestos: presupuestos.length,
      leadsFrios: leadsFrios.length,
      amigos: amigos.length,
      cobradoSemana,
      confirmadasSemana: confirmadasSemana.length,
      facturacionMes,
      resultadoMes,
      pendienteTotal,
    },
  };
}

function agrupa(ops: Oportunidad[], key: (o: Oportunidad) => string): { k: string; total: number }[] {
  const m = new Map<string, number>();
  for (const o of ops) m.set(key(o), (m.get(key(o)) ?? 0) + totalOp(o));
  return Array.from(m.entries()).map(([k, total]) => ({ k, total }));
}
function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function restaMes(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}
