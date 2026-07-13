import { NextResponse } from "next/server";
import { AUTH_COOKIE, USER_COOKIE } from "@/lib/auth";

// Cierra la sesión: borra ambas cookies y vuelve al login.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const c of [USER_COOKIE, AUTH_COOKIE]) {
    res.cookies.set(c, "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/" });
  }
  return res;
}
