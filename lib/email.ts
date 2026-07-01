// Envío de email vía Resend. Degradación elegante: si no hay RESEND_API_KEY,
// no rompe — devuelve { skipped: true } y quien llama decide qué hacer.

export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };

export async function enviarEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const to = opts.to.filter(Boolean);
  if (!key) return { ok: false, skipped: true, error: "Falta RESEND_API_KEY" };
  if (to.length === 0) return { ok: false, skipped: true, error: "Sin destinatarios" };

  const from = process.env.EMAIL_FROM || "TDO Manager <onboarding@resend.dev>";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!resp.ok) return { ok: false, error: `${resp.status} ${(await resp.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Destinatarios del digest: variable DIGEST_EMAILS (coma) o los emails del equipo.
export function destinatariosConfigurados(): string[] {
  const raw = process.env.DIGEST_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
