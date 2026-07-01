import { NextResponse } from "next/server";
import { cronAutorizado, fechaMadrid } from "@/lib/cron";
import { construirDigest } from "@/lib/digest";
import { enviarEmail, destinatariosConfigurados } from "@/lib/email";
import { getEquipo } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Digest semanal a los socios (programado los viernes). También se puede
// llamar a mano con ?key=<CRON_SECRET> (&preview=1 para ver sin enviar).
export async function GET(req: Request) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = fechaMadrid();
  let digest;
  try {
    digest = await construirDigest(hoy);
  } catch (e) {
    return NextResponse.json({ error: `No se pudo construir el resumen: ${(e as Error).message}` }, { status: 500 });
  }

  const preview = new URL(req.url).searchParams.get("preview") === "1";
  if (preview) {
    return new NextResponse(digest.html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // Destinatarios: DIGEST_EMAILS o, si no, los emails del equipo.
  let destinatarios = destinatariosConfigurados();
  if (destinatarios.length === 0) {
    try {
      const equipo = await getEquipo();
      destinatarios = equipo.filter((e) => e.activo && e.email).map((e) => e.email!) as string[];
    } catch {
      /* ignore */
    }
  }

  const envio = await enviarEmail({
    to: destinatarios,
    subject: digest.asunto,
    html: digest.html,
    text: digest.texto,
  });

  return NextResponse.json({
    ok: envio.ok,
    enviado: envio.ok,
    motivo: envio.skipped ? "Sin RESEND_API_KEY o sin destinatarios; configúralos para enviar." : envio.error,
    destinatarios: destinatarios.length,
    resumen: digest.resumen,
  });
}
