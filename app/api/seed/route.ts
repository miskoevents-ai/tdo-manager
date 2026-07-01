import { withSupabase } from "@supabase/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runSeed, type SeedData } from "@/lib/seed-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Carga los datos reales (docs/seed-data.json) en Supabase.
// Protegida por SEED_TOKEN (?token= o header x-seed-token) + auth "secret"
// de @supabase/server: usa ctx.supabaseAdmin (bypassa RLS) para insertar.
// Se ejecuta en Vercel, que sí tiene salida a Supabase.
export const POST = withSupabase({ auth: "secret" }, async (req, ctx) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-seed-token");
  const expected = process.env.SEED_TOKEN?.trim() || "tdo-seed-2026";
  if (token !== expected) {
    return Response.json({ error: "Token de seed inválido." }, { status: 401 });
  }

  try {
    const data = JSON.parse(
      readFileSync(join(process.cwd(), "docs", "seed-data.json"), "utf8"),
    ) as SeedData;
    const counts = await runSeed(ctx.supabaseAdmin, data);
    return Response.json({ ok: true, counts });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
});

// GET informativo (no ejecuta nada destructivo).
export function GET() {
  return Response.json({
    info: "POST con ?token=SEED_TOKEN y Authorization: Bearer <secret key> para cargar los datos.",
  });
}
