import { NextResponse } from "next/server";
import { AUTH_COOKIE, USER_COOKIE, tokenDe, hashPassword, crearCookieUsuario } from "@/lib/auth";
import { createAdminClient, supabaseConfigurado } from "@/lib/supabase/admin";

const MAX_AGE = 60 * 60 * 24 * 180; // 180 días

// Inicia sesión. Dos modos:
//  · Con `usuario`: valida contra la tabla usuarios y deja la cookie firmada.
//  · Solo `password`: contraseña compartida (APP_PASSWORD), como respaldo.
export async function POST(req: Request) {
  const pass = process.env.APP_PASSWORD;

  let usuario = "";
  let password = "";
  try {
    ({ usuario = "", password = "" } = await req.json());
  } catch {
    /* cuerpo inválido */
  }
  usuario = (usuario || "").trim().toLowerCase();

  // --- Modo usuario ---
  if (usuario) {
    if (!supabaseConfigurado()) {
      return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 500 });
    }
    const sb = createAdminClient();
    const { data: u, error } = await sb
      .from("usuarios")
      .select("usuario, nombre, password_hash, activo")
      .eq("usuario", usuario)
      .maybeSingle();
    // Si la tabla aún no existe (migración sin aplicar), cae al modo compartido.
    if (!error && u) {
      if (!u.activo) {
        return NextResponse.json({ error: "Usuario desactivado." }, { status: 403 });
      }
      const hash = await hashPassword(usuario, password);
      if (hash !== u.password_hash) {
        return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
      }
      if (!pass) {
        return NextResponse.json({ error: "Falta APP_PASSWORD en el servidor." }, { status: 500 });
      }
      await sb.from("usuarios").update({ ultimo_acceso: new Date().toISOString() }).eq("usuario", usuario);
      const res = NextResponse.json({ ok: true, nombre: u.nombre });
      res.cookies.set(USER_COOKIE, await crearCookieUsuario(usuario, pass, Date.now()), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: MAX_AGE,
        path: "/",
      });
      return res;
    }
    // Si había usuario pero no existe en la tabla, no seguimos al modo compartido
    // salvo que la tabla no exista (error de columna/relación).
    if (!error) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }
  }

  // --- Modo contraseña compartida (respaldo) ---
  if (!pass) {
    return NextResponse.json({ error: "APP_PASSWORD no está configurada en el servidor." }, { status: 500 });
  }
  // Interruptor de seguridad: con LOGIN_SOLO_USUARIO=1 se desactiva el acceso
  // por contraseña compartida (todo el mundo entra con su usuario → queda
  // firmado y se aplican los permisos). Reversible quitando la variable.
  if (process.env.LOGIN_SOLO_USUARIO === "1") {
    return NextResponse.json(
      { error: "Entra con tu usuario y tu contraseña (el acceso compartido está desactivado)." },
      { status: 401 },
    );
  }
  if (password !== pass) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenDe(pass), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}
