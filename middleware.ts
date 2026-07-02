import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, tokenDe } from "@/lib/auth";

// Protege toda la app con la contraseña compartida (APP_PASSWORD).
// Si la variable no está configurada, no bloquea (evita quedarse fuera
// antes de configurarla en Vercel).
export async function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await tokenDe(pass))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Se excluyen: la propia pantalla de login, las APIs con su propia
  // autenticación (cron con CRON_SECRET, leads con LEADS_TOKEN, seed con
  // SEED_TOKEN), los estáticos y el optimizador de imágenes.
  matcher: [
    "/((?!login|api/login|api/cron|api/leads|api/seed|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
