import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, USER_COOKIE, tokenDe, leerCookieUsuario } from "@/lib/auth";

// Protege toda la app. Vale la sesión de un usuario (cookie firmada) o la de
// la contraseña compartida (APP_PASSWORD). Si APP_PASSWORD no está
// configurada, no bloquea (evita quedarse fuera antes de configurarla).
export async function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  // Se pasa la ruta a los server components (para el control de acceso por
  // sección) mediante una cabecera de petición.
  const dejarPasar = () => {
    const h = new Headers(req.headers);
    h.set("x-tdo-path", req.nextUrl.pathname);
    return NextResponse.next({ request: { headers: h } });
  };
  if (!pass) return dejarPasar();

  // 1) Sesión de usuario (firmada con APP_PASSWORD como secreto).
  const userCookie = req.cookies.get(USER_COOKIE)?.value;
  if (await leerCookieUsuario(userCookie, pass, Date.now())) return dejarPasar();

  // 2) Sesión de la contraseña compartida (respaldo). Se puede desactivar con
  //    LOGIN_SOLO_USUARIO=1 (entonces solo vale la sesión de usuario firmada).
  if (process.env.LOGIN_SOLO_USUARIO !== "1") {
    const cookie = req.cookies.get(AUTH_COOKIE)?.value;
    if (cookie && cookie === (await tokenDe(pass))) return dejarPasar();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Se excluyen: la propia pantalla de login, las APIs con su propia
  // autenticación (cron con CRON_SECRET, leads con LEADS_TOKEN, seed con
  // SEED_TOKEN, feed de calendario con CAL_FEED_TOKEN), los estáticos y el
  // optimizador de imágenes.
  matcher: [
    "/((?!login|api/login|api/logout|api/cron|api/leads|api/seed|api/calendario|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
