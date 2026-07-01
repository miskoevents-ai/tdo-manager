// Utilidades para las rutas de cron (automatizaciones programadas en Vercel).

const CRON_SECRET = process.env.CRON_SECRET || "tdo-cron-2026";

// Vercel añade "Authorization: Bearer <CRON_SECRET>" al invocar el cron.
// También aceptamos ?key= para poder probar/previsualizar a mano.
export function cronAutorizado(req: Request): boolean {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${CRON_SECRET}` || url.searchParams.get("key") === CRON_SECRET;
}

// Fecha de hoy (YYYY-MM-DD) en la zona horaria de España.
export function fechaMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Resta días a una fecha ISO (YYYY-MM-DD).
export function restaDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}
