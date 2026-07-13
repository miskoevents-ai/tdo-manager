import "server-only";
import { cookies } from "next/headers";
import { USER_COOKIE, leerCookieUsuario } from "@/lib/auth";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";

export type UsuarioActual = { usuario: string; nombre: string; esAdmin: boolean } | null;

// Quién está conectado (según la cookie firmada). null si es la sesión de la
// contraseña compartida o no hay sesión de usuario.
export async function getUsuarioActual(): Promise<UsuarioActual> {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return null;
  const jar = await cookies();
  const usuario = await leerCookieUsuario(jar.get(USER_COOKIE)?.value, pass, Date.now());
  if (!usuario) return null;
  if (!supabaseConfigurado()) return { usuario, nombre: usuario, esAdmin: false };
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("usuarios")
      .select("nombre, es_admin, activo")
      .eq("usuario", usuario)
      .maybeSingle();
    if (!data || data.activo === false) return { usuario, nombre: usuario, esAdmin: false };
    return { usuario, nombre: data.nombre ?? usuario, esAdmin: Boolean(data.es_admin) };
  } catch {
    return { usuario, nombre: usuario, esAdmin: false };
  }
}
