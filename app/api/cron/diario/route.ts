import { NextResponse } from "next/server";
import { cronAutorizado, fechaMadrid, restaDias } from "@/lib/cron";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";
import { generarGastosDelMes } from "@/app/actions";

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

  return NextResponse.json({ ok: true, ...resultado });
}
