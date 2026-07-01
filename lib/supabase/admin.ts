import { createClient } from "@supabase/supabase-js";

// Cliente de servidor con la SECRET key. Nunca se importa en componentes de cliente.
// Se usa en Server Components y Server Actions para leer/escribir datos.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || url.includes("TU-PROYECTO")) {
    throw new Error(
      "Faltan credenciales de Supabase. Rellena NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local (o en las variables de entorno de Vercel).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True si hay credenciales reales configuradas (para mostrar avisos claros en la UI). */
export function supabaseConfigurado(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return Boolean(url && key && !url.includes("TU-PROYECTO"));
}
