import { getOportunidades, getTesoreria } from "@/lib/data";
import { calcularAvisos } from "@/lib/avisos";
import { calcularTotales } from "@/lib/calc";
import { eur } from "@/lib/format";

const CONTRATADAS = ["confirmada", "realizada", "facturada"];

const APP_URL = process.env.APP_URL || "https://tdo-manager.vercel.app";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Construye el resumen semanal para los socios (contenido del email).
export async function construirDigest(hoyISO: string): Promise<{
  asunto: string;
  html: string;
  texto: string;
  resumen: {
    cobros: number;
    fianzas: number;
    presupuestos: number;
    eventos: number;
    leadsFrios: number;
    amigos: number;
    totalAmigos: number;
    facturacionMes: number;
    resultadoMes: number;
    pendienteTotal: number;
  };
}> {
  const [ops, tesoreria] = await Promise.all([getOportunidades(), getTesoreria()]);
  const avisos = calcularAvisos(ops, hoyISO);
  const cobros = avisos.filter((a) => a.categoria === "cobro");
  const fianzas = avisos.filter((a) => a.categoria === "fianza");
  const presupuestos = avisos.filter((a) => a.categoria === "presupuesto");
  const eventos = avisos.filter((a) => a.categoria === "evento");
  const leadsFrios = avisos.filter((a) => a.categoria === "lead");

  // Cómo va el mes en curso
  const ym = hoyISO.slice(0, 7);
  const prevYm = restaMes(ym);
  const cobradoDe = (m: string) =>
    tesoreria.filter((t) => t.fecha.slice(0, 7) === m && t.tipo === "ingreso" && t.estado === "cobrado").reduce((s, t) => s + Number(t.importe), 0);
  const ingMes = cobradoDe(ym);
  const ingPrev = cobradoDe(prevYm);
  const gasMes = tesoreria
    .filter((t) => t.fecha.slice(0, 7) === ym && t.tipo === "gasto")
    .reduce((s, t) => s + Number(t.importe), 0);
  const resultadoMes = ingMes - gasMes;
  const pendienteTotal = tesoreria
    .filter((t) => t.tipo === "ingreso" && t.estado === "previsto")
    .reduce((s, t) => s + Number(t.importe), 0);

  // Eventos contratados de este mes y su facturación.
  const eventosMes = ops.filter((o) => CONTRATADAS.includes(o.estado) && (o.fecha_evento ?? "").slice(0, 7) === ym);
  const facturacionMes = eventosMes.reduce(
    (s, o) => s + calcularTotales((o.presupuesto_lineas ?? []).map((l) => ({ cantidad: l.cantidad, precio_unitario: l.precio_unitario })), o.iva_pct, o.retencion_pct).total,
    0,
  );
  const tendencia = ingPrev > 0 ? Math.round(((ingMes - ingPrev) / ingPrev) * 100) : null;

  // Amigos / préstamos: operaciones tipo amigos (sin factura fiscal) contratadas.
  const amigos = ops
    .filter((o) => o.tipo_operacion === "amigos_prestamo" && CONTRATADAS.includes(o.estado))
    .map((o) => {
      const total = calcularTotales(
        (o.presupuesto_lineas ?? []).map((l) => ({ cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
        o.iva_pct,
        o.retencion_pct,
      ).total;
      return { titulo: o.titulo, detalle: `${o.cliente?.nombre ?? "—"} · ${eur(total)}`, total };
    })
    .sort((a, b) => b.total - a.total);
  const totalAmigos = amigos.reduce((s, a) => s + a.total, 0);

  const mesLabel = `${MESES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
  const asunto = `Resumen TDO · ${mesLabel} · ${cobros.length} cobros y ${fianzas.length} fianzas pendientes`;

  // --- HTML ---
  const seccion = (titulo: string, color: string, items: { titulo: string; detalle: string }[]) => {
    if (!items.length) return "";
    const filas = items
      .map(
        (a) =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;font-size:13px;color:#2a2a2a">${escapar(a.titulo)}<br><span style="color:#888;font-size:11px">${escapar(a.detalle)}</span></td></tr>`,
      )
      .join("");
    return `<h3 style="margin:18px 0 6px;font-size:13px;color:${color};text-transform:uppercase;letter-spacing:.06em">${titulo} (${items.length})</h3><table width="100%" cellpadding="0" cellspacing="0">${filas}</table>`;
  };

  const kpi = (label: string, valor: string, color: string) =>
    `<td style="padding:10px;background:#f7f5ef;border-radius:8px;text-align:center"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em">${label}</div><div style="font-size:18px;color:${color};margin-top:4px">${valor}</div></td>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#2a2a2a">
    <div style="background:#3F4A36;color:#FCFAF5;padding:20px 24px;border-radius:10px 10px 0 0">
      <div style="font-size:20px">Resumen semanal · Tu Decoración Original</div>
      <div style="font-size:12px;color:#c7cbb8;margin-top:2px">${mesLabel}</div>
    </div>
    <div style="border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;padding:22px 24px">
      <h3 style="margin:0 0 8px;font-size:13px;color:#3F4A36;text-transform:uppercase;letter-spacing:.06em">Cómo va el mes</h3>
      <table width="100%" cellspacing="8" cellpadding="0" style="margin-bottom:4px"><tr>
        ${kpi(`Facturación (${eventosMes.length} ev.)`, eur(facturacionMes), "#3F4A36")}
        ${kpi("Cobrado", eur(ingMes), "#4C8C4A")}
        ${kpi("Gastos", eur(gasMes), "#BE6E4C")}
      </tr></table>
      <table width="100%" cellspacing="8" cellpadding="0" style="margin-bottom:6px"><tr>
        ${kpi("Resultado del mes", eur(resultadoMes), resultadoMes >= 0 ? "#4C8C4A" : "#B23B3B")}
        ${kpi("Previsto por cobrar", eur(pendienteTotal), "#C99A2E")}
        ${kpi("vs mes anterior", tendencia == null ? "—" : `${tendencia >= 0 ? "▲" : "▼"} ${Math.abs(tendencia)}%`, tendencia != null && tendencia < 0 ? "#B23B3B" : "#4C8C4A")}
      </tr></table>
      ${seccion("🔴 Cobros pendientes", "#B23B3B", cobros)}
      ${seccion("🟠 Fianzas por devolver", "#BE6E4C", fianzas)}
      ${seccion("🟡 Presupuestos sin respuesta", "#C99A2E", presupuestos)}
      ${seccion("❄️ Leads fríos", "#5B7A9A", leadsFrios)}
      ${seccion("📅 Próximos eventos", "#3F4A36", eventos)}
      ${seccion(`🤝 Amigos / préstamos · ${eur(totalAmigos)}`, "#8A957C", amigos)}
      ${avisos.length === 0 && amigos.length === 0 ? '<p style="color:#4C8C4A;font-size:14px">Todo al día. ¡Buen fin de semana! 🌿</p>' : ""}
      <div style="margin-top:22px;text-align:center">
        <a href="${APP_URL}" style="display:inline-block;background:#3F4A36;color:#FCFAF5;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px">Abrir TDO Manager</a>
      </div>
    </div>
  </div>`;

  // --- Texto plano ---
  const linea = (a: { titulo: string; detalle: string }) => `- ${a.titulo} (${a.detalle})`;
  const bloque = (t: string, items: { titulo: string; detalle: string }[]) =>
    items.length ? `\n${t}:\n${items.map(linea).join("\n")}\n` : "";
  const texto = `Resumen TDO · ${mesLabel}
Cómo va el mes — Facturación: ${eur(facturacionMes)} (${eventosMes.length} ev.) · Cobrado: ${eur(ingMes)} · Gastos: ${eur(gasMes)} · Resultado: ${eur(resultadoMes)} · Previsto por cobrar: ${eur(pendienteTotal)}${tendencia != null ? ` · vs mes anterior ${tendencia >= 0 ? "+" : ""}${tendencia}%` : ""}
${bloque("Cobros pendientes", cobros)}${bloque("Fianzas por devolver", fianzas)}${bloque("Presupuestos sin respuesta", presupuestos)}${bloque("Leads fríos", leadsFrios)}${bloque("Próximos eventos", eventos)}${bloque(`Amigos / préstamos (${eur(totalAmigos)})`, amigos)}
${APP_URL}`;

  return {
    asunto,
    html,
    texto,
    resumen: {
      cobros: cobros.length,
      fianzas: fianzas.length,
      presupuestos: presupuestos.length,
      eventos: eventos.length,
      leadsFrios: leadsFrios.length,
      amigos: amigos.length,
      totalAmigos,
      facturacionMes,
      resultadoMes,
      pendienteTotal,
    },
  };
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Mes anterior (YYYY-MM) a partir de un YYYY-MM.
function restaMes(ym: string): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
}
