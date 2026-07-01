import { getOportunidades, getTesoreria } from "@/lib/data";
import { calcularAvisos } from "@/lib/avisos";
import { eur } from "@/lib/format";

const APP_URL = process.env.APP_URL || "https://tdo-manager.vercel.app";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Construye el resumen semanal para los socios (contenido del email).
export async function construirDigest(hoyISO: string): Promise<{
  asunto: string;
  html: string;
  texto: string;
  resumen: { cobros: number; fianzas: number; presupuestos: number; eventos: number; pendienteTotal: number };
}> {
  const [ops, tesoreria] = await Promise.all([getOportunidades(), getTesoreria()]);
  const avisos = calcularAvisos(ops, hoyISO);
  const cobros = avisos.filter((a) => a.categoria === "cobro");
  const fianzas = avisos.filter((a) => a.categoria === "fianza");
  const presupuestos = avisos.filter((a) => a.categoria === "presupuesto");
  const eventos = avisos.filter((a) => a.categoria === "evento");

  // Tesorería del mes en curso
  const ym = hoyISO.slice(0, 7);
  const delMes = tesoreria.filter((t) => t.fecha.slice(0, 7) === ym);
  const ingMes = delMes.filter((t) => t.tipo === "ingreso" && t.estado === "cobrado").reduce((s, t) => s + Number(t.importe), 0);
  const gasMes = delMes.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.importe), 0);
  const pendienteTotal = tesoreria
    .filter((t) => t.tipo === "ingreso" && t.estado === "previsto")
    .reduce((s, t) => s + Number(t.importe), 0);

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
      <table width="100%" cellspacing="8" cellpadding="0" style="margin-bottom:6px"><tr>
        ${kpi("Cobrado este mes", eur(ingMes), "#4C8C4A")}
        ${kpi("Gastos este mes", eur(gasMes), "#BE6E4C")}
        ${kpi("Previsto por cobrar", eur(pendienteTotal), "#C99A2E")}
      </tr></table>
      ${seccion("🔴 Cobros pendientes", "#B23B3B", cobros)}
      ${seccion("🟠 Fianzas por devolver", "#BE6E4C", fianzas)}
      ${seccion("🟡 Presupuestos sin respuesta", "#C99A2E", presupuestos)}
      ${seccion("📅 Próximos eventos", "#3F4A36", eventos)}
      ${avisos.length === 0 ? '<p style="color:#4C8C4A;font-size:14px">Todo al día. ¡Buen fin de semana! 🌿</p>' : ""}
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
Cobrado este mes: ${eur(ingMes)} · Gastos: ${eur(gasMes)} · Previsto por cobrar: ${eur(pendienteTotal)}
${bloque("Cobros pendientes", cobros)}${bloque("Fianzas por devolver", fianzas)}${bloque("Presupuestos sin respuesta", presupuestos)}${bloque("Próximos eventos", eventos)}
${APP_URL}`;

  return {
    asunto,
    html,
    texto,
    resumen: { cobros: cobros.length, fianzas: fianzas.length, presupuestos: presupuestos.length, eventos: eventos.length, pendienteTotal },
  };
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
