// Autenticación del equipo. Dos vías, ambas válidas:
//  · Por usuario: cada socio entra con su usuario y contraseña (tabla
//    usuarios). Se deja una cookie FIRMADA (HMAC) con su usuario y caducidad.
//  · Compartida (respaldo): la contraseña única APP_PASSWORD sigue valiendo,
//    con su cookie de hash. Así nadie se queda fuera durante la transición.
// Todo con Web Crypto para funcionar en Edge (middleware) y Node (rutas).

export const AUTH_COOKIE = "tdo_auth"; // sesión de la contraseña compartida
export const USER_COOKIE = "tdo_user"; // sesión firmada de un usuario

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// --- Contraseña compartida (APP_PASSWORD) ---
export async function tokenDe(password: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(`tdo·${password}·v1`));
  return hex(hash);
}

// --- Contraseña de un usuario (tabla usuarios) ---
// El hash guardado en usuarios.password_hash usa exactamente esta fórmula.
export async function hashPassword(usuario: string, password: string): Promise<string> {
  const data = enc.encode(`tdo·user·${usuario.toLowerCase()}·${password}·v1`);
  return hex(await crypto.subtle.digest("SHA-256", data));
}

// --- Cookie de usuario firmada (usuario.exp.firma) ---
async function firmar(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

const DIAS_180 = 1000 * 60 * 60 * 24 * 180;

export async function crearCookieUsuario(
  usuario: string,
  secret: string,
  ahora: number,
): Promise<string> {
  const payload = `${encodeURIComponent(usuario)}.${ahora + DIAS_180}`;
  return `${payload}.${await firmar(payload, secret)}`;
}

// Devuelve el usuario si la cookie es válida (firma correcta y no caducada).
export async function leerCookieUsuario(
  cookie: string | undefined,
  secret: string,
  ahora: number,
): Promise<string | null> {
  if (!cookie) return null;
  const corte = cookie.lastIndexOf(".");
  if (corte < 0) return null;
  const payload = cookie.slice(0, corte);
  const firma = cookie.slice(corte + 1);
  if ((await firmar(payload, secret)) !== firma) return null;
  const punto = payload.indexOf(".");
  if (punto < 0) return null;
  const usuario = payload.slice(0, punto);
  const exp = Number(payload.slice(punto + 1));
  if (!usuario || !exp || exp < ahora) return null;
  return decodeURIComponent(usuario);
}
