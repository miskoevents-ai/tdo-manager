import { NextResponse } from "next/server";
import { AUTH_COOKIE, tokenDe } from "@/lib/auth";

// Valida la contraseña compartida y deja la cookie de sesión (180 días).
export async function POST(req: Request) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) {
    return NextResponse.json(
      { error: "APP_PASSWORD no está configurada en el servidor." },
      { status: 500 },
    );
  }

  let password = "";
  try {
    ({ password } = await req.json());
  } catch {
    /* cuerpo inválido */
  }
  if (password !== pass) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenDe(pass), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
}
