// Autenticación sencilla por contraseña compartida del equipo.
// La contraseña se define en la variable de entorno APP_PASSWORD (Vercel).
// El navegador guarda una cookie httpOnly con el hash; si se cambia la
// contraseña, todas las sesiones caducan automáticamente.
// Compatible con Edge (middleware) y Node (route handlers): solo Web Crypto.

export const AUTH_COOKIE = "tdo_auth";

export async function tokenDe(password: string): Promise<string> {
  const data = new TextEncoder().encode(`tdo·${password}·v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
