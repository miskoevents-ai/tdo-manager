import "server-only";
import { cookies } from "next/headers";
import { USER_COOKIE, leerCookieUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Registra una acción del usuario conectado. Nunca lanza: si algo falla
// (tabla sin migrar, sin sesión…), simplemente no registra y sigue.
export async function registrarActividad(input: {
  accion: string;
  entidad?: string;
  entidadId?: string | null;
  detalle?: string | null;
}) {
  try {
    const pass = process.env.APP_PASSWORD;
    let usuario: string | null = null;
    if (pass) {
      const jar = await cookies();
      const u = await leerCookieUsuario(jar.get(USER_COOKIE)?.value, pass, Date.now());
      usuario = u;
    }
    const sb = createAdminClient();
    // Guarda el nombre visible si lo encontramos; si no, el usuario tal cual.
    let nombre = usuario;
    if (usuario) {
      const { data } = await sb.from("usuarios").select("nombre").eq("usuario", usuario).maybeSingle();
      if (data?.nombre) nombre = data.nombre;
    }
    await sb.from("registro_actividad").insert({
      usuario: nombre,
      accion: input.accion,
      entidad: input.entidad ?? null,
      entidad_id: input.entidadId ?? null,
      detalle: input.detalle ?? null,
    });
  } catch {
    /* el registro es best-effort: nunca bloquea la acción principal */
  }
}
