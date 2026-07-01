import { NextResponse } from "next/server";
import { construirContexto } from "@/lib/asistente/contexto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELO = process.env.ASISTENTE_MODEL || "claude-sonnet-5";

const SISTEMA = `Eres el asistente de gestión de **TDO Manager**, la herramienta interna de \
**Tu Decoración Original** (TDO), un negocio de decoración de eventos en Madrid (bodas, comuniones, \
corporativos, cumpleaños, bautizos, alquiler de material...).

Ayudas a Sarmi y al equipo a entender sus datos y a preparar trabajo. Respondes SIEMPRE en español, \
de forma breve, concreta y cálida. Usas los datos del contexto que se te pasa; si algo no está en el \
contexto, dilo claramente en vez de inventarlo. Importes en euros con el símbolo €.

Reglas de negocio de TDO que debes respetar:
- Los importes en tesorería son SIEMPRE positivos; el "tipo" (ingreso/gasto) marca el signo.
- La contabilidad mensual arranca en junio 2026 y solo cuenta (a) ingresos de facturas propias de la \
nueva etapa y (b) gastos fijos. La inversión inicial y los gastos variables se registran pero NO computan.
- IVA por defecto 21%. Retención de -15% solo a clientes tipo empresa.
- Corte de etapas: antes del 25-may-2026 = Etapa Cristina; desde esa fecha = Nueva etapa.
- Las operaciones "Amigos / préstamo" NO llevan factura fiscal.

Habilidad "crear presupuesto": cuando te pidan preparar un presupuesto para un evento, propón una lista \
de líneas realista (concepto, cantidad, precio unitario) según el tipo de evento y el nº de invitados, \
calcula base, IVA (21%) y total, e indica la retención si el cliente es empresa. Preséntalo en una tabla \
clara y recuerda que puede ajustarlo y guardarlo en la ficha de la oportunidad. No inventes precios como \
si fueran oficiales: son sugerencias de partida.`;

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "El asistente aún no está configurado. Añade la variable ANTHROPIC_API_KEY en Vercel " +
          "(Project Settings → Environment Variables) y vuelve a desplegar.",
        needsKey: true,
      },
      { status: 503 },
    );
  }

  let body: { messages?: Msg[]; hoy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20);
  if (messages.length === 0) {
    return NextResponse.json({ error: "No hay mensajes." }, { status: 400 });
  }

  const hoy = typeof body.hoy === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.hoy) ? body.hoy : "2026-06-01";

  let contexto = "";
  try {
    contexto = await construirContexto(hoy);
  } catch (e) {
    contexto = `No se pudo cargar el contexto de datos (${(e as Error).message}).`;
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1500,
        system: `${SISTEMA}\n\n# Contexto actual del negocio\n${contexto}`,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const detalle = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: `El asistente no pudo responder (${resp.status}). ${detalle.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = (await resp.json()) as { content?: { type: string; text?: string }[] };
    const texto = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();

    return NextResponse.json({ text: texto || "(sin respuesta)" });
  } catch (e) {
    return NextResponse.json(
      { error: `Error de conexión con el asistente: ${(e as Error).message}` },
      { status: 502 },
    );
  }
}
