import { NextResponse } from "next/server";
import { cronAutorizado, fechaMadrid, restaDias } from "@/lib/cron";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";
import { generarGastosDelMes } from "@/app/actions";
import { construirDigest } from "@/lib/digest";
import { enviarEmail, destinatariosConfigurados } from "@/lib/email";
import { getEquipo } from "@/lib/data";

// ¿Es hoy el último día del mes? (mañana es día 1)
function esUltimoDiaDeMes(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.getUTCDate() === 1;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Automatismos contables diarios:
//  - Marca como "vencida" cualquier factura emitida hace más de 30 días.
//  - El día 1 de cada mes, genera los gastos fijos del mes (idempotente).
export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ error: "Base de datos no configurada." }, { status: 503 });
  }

  const hoy = fechaMadrid();
  const limite = restaDias(hoy, 30);
  const sb = createAdminClient();
  const resultado: Record<string, unknown> = { fecha: hoy };

  // 1) Facturas vencidas
  try {
    const { data, error } = await sb
      .from("facturas")
      .update({ estado: "vencida" })
      .eq("estado", "emitida")
      .lt("fecha_emision", limite)
      .select("id");
    if (error) throw new Error(error.message);
    resultado.facturasVencidas = data?.length ?? 0;
  } catch (e) {
    resultado.facturasVencidasError = (e as Error).message;
  }

  // 2) Gastos fijos del mes (solo el día 1)
  if (hoy.slice(8, 10) === "01") {
    try {
      const r = await generarGastosDelMes(hoy.slice(0, 7));
      resultado.gastosGenerados = r.creados;
      resultado.gastosExistentes = r.existentes;
    } catch (e) {
      resultado.gastosError = (e as Error).message;
    }
  }

  // 3) Resumen completo del mes (solo el último día del mes)
  if (esUltimoDiaDeMes(hoy)) {
    try {
      const digest = await construirDigest(hoy, "mensual");
      let destinatarios = destinatariosConfigurados();
      if (destinatarios.length === 0) {
        const equipo = await getEquipo();
        destinatarios = equipo.filter((e) => e.activo && e.email).map((e) => e.email!) as string[];
      }
      const envio = await enviarEmail({ to: destinatarios, subject: digest.asunto, html: digest.html, text: digest.texto });
      resultado.resumenMensual = envio.ok ? "enviado" : envio.skipped ? "omitido (sin RESEND_API_KEY/destinatarios)" : `error: ${envio.error}`;
    } catch (e) {
      resultado.resumenMensualError = (e as Error).message;
    }
  }

  return NextResponse.json({ ok: true, ...resultado });
}
