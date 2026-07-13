import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_COOKIE, leerCookieUsuario } from "@/lib/auth";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";

// Suma tiempo de uso al usuario conectado. El navegador envía cada poco los
// segundos que ha estado con la pestaña visible. Best-effort: nunca falla.
export async function POST(req: Request) {
  try {
    const pass = process.env.APP_PASSWORD;
    if (!pass || !supabaseConfigurado()) return NextResponse.json({ ok: false });
    const jar = await cookies();
    const usuario = await leerCookieUsuario(jar.get(USER_COOKIE)?.value, pass, Date.now());
    if (!usuario) return NextResponse.json({ ok: false });

    let segundos = 0;
    try {
      ({ segundos = 0 } = await req.json());
    } catch {
      /* cuerpo inválido */
    }
    segundos = Math.min(Math.max(Math.round(Number(segundos) || 0), 0), 3600); // tope 1 h por latido
    if (segundos <= 0) return NextResponse.json({ ok: true });

    const sb = createAdminClient();
    const { data } = await sb.from("usuarios").select("segundos_activo").eq("usuario", usuario).maybeSingle();
    const actual = Number((data as { segundos_activo?: number } | null)?.segundos_activo ?? 0);
    await sb
      .from("usuarios")
      .update({ segundos_activo: actual + segundos, ultimo_acceso: new Date().toISOString() })
      .eq("usuario", usuario);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
