import { NextResponse } from "next/server";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";
import { CANALES } from "@/lib/estados";

export const dynamic = "force-dynamic";

// Webhook de entrada de leads. Un conector (Make/Zapier/n8n o integración nativa)
// de WhatsApp o Outlook envía aquí un POST y creamos cliente + oportunidad "nueva".
//
// Seguridad: cabecera "x-leads-token" o ?token= debe coincidir con LEADS_TOKEN.
// Cuerpo JSON: { nombre, email?, telefono?, mensaje?, canal?, titulo?,
//               tipo_evento?, serie?, fecha_evento?, tipo_cliente? }

const TOKEN = process.env.LEADS_TOKEN || "tdo-leads-2026";

function dosDig(n: number) {
  return String(n).padStart(2, "0");
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get("x-leads-token") || url.searchParams.get("token");
  if (token !== TOKEN) {
    return NextResponse.json({ error: "Token incorrecto." }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ error: "Base de datos no configurada." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido." }, { status: 400 });
  }

  const str = (k: string) => {
    const v = body[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const nombre = str("nombre") || str("name");
  const email = str("email");
  const telefono = str("telefono") || str("phone");
  const mensaje = str("mensaje") || str("message") || str("texto");
  if (!nombre && !email && !telefono) {
    return NextResponse.json(
      { error: "Falta identificar al lead: envía al menos nombre, email o teléfono." },
      { status: 400 },
    );
  }

  // Canal: normaliza a los canales conocidos; por defecto "otro".
  const canalRaw = (str("canal") || "").toLowerCase();
  const canal =
    CANALES.find((c) => c.value === canalRaw)?.value ??
    (canalRaw.includes("whats") ? "whatsapp" : canalRaw.includes("mail") || canalRaw.includes("outlook") ? "email" : "otro");

  const tipoCliente = str("tipo_cliente") || "sin_clasificar";
  const tipoEvento = str("tipo_evento") || "otro";
  const serie = str("serie") === "alquiler_encargo" ? "alquiler_encargo" : "evento";
  const fechaEvento = str("fecha_evento");
  const titulo = str("titulo") || (nombre ? `Lead · ${nombre}` : `Lead por ${canal}`);

  try {
    const sb = createAdminClient();

    // 1) Buscar cliente existente por email o teléfono; si no, crearlo.
    let clienteId: string | null = null;
    if (email || telefono) {
      const filtros: string[] = [];
      if (email) filtros.push(`email.eq.${email}`);
      if (telefono) filtros.push(`telefono.eq.${telefono}`);
      const { data: existente } = await sb
        .from("clientes")
        .select("id")
        .or(filtros.join(","))
        .limit(1)
        .maybeSingle();
      clienteId = existente?.id ?? null;
    }
    if (!clienteId) {
      const { data: nuevo, error: cErr } = await sb
        .from("clientes")
        .insert({
          nombre: nombre || email || telefono,
          tipo: tipoCliente,
          email,
          telefono,
          estado: "lead",
          origen: "cliente_nuevo",
          canal,
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      clienteId = nuevo.id;
    }

    // 2) Número de oportunidad autogenerado para el lead.
    const now = new Date();
    const numero = `L-${now.getFullYear()}${dosDig(now.getMonth() + 1)}${dosDig(now.getDate())}-${dosDig(
      now.getHours(),
    )}${dosDig(now.getMinutes())}${dosDig(now.getSeconds())}`;
    const fechaEntrada = `${now.getFullYear()}-${dosDig(now.getMonth() + 1)}-${dosDig(now.getDate())}`;

    // 3) Crear la oportunidad en estado "nueva".
    const { data: op, error: oErr } = await sb
      .from("oportunidades")
      .insert({
        numero,
        titulo,
        serie,
        tipo_evento: tipoEvento,
        tipo_operacion: "normal",
        estado: "nueva",
        cliente_id: clienteId,
        canal,
        fecha_entrada: fechaEntrada,
        fecha_evento: fechaEvento,
        iva_pct: 21,
        retencion_pct: 0,
        notas: mensaje,
      })
      .select("id, numero")
      .single();
    if (oErr) throw new Error(oErr.message);

    return NextResponse.json({ ok: true, clienteId, oportunidadId: op.id, numero: op.numero });
  } catch (e) {
    return NextResponse.json({ error: `No se pudo crear el lead: ${(e as Error).message}` }, { status: 500 });
  }
}
