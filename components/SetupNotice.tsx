import { Card, Overline } from "@/components/ui/card";

export function SetupNotice() {
  return (
    <Card className="max-w-container-narrow border-warn-tint bg-warn-tint/40">
      <Overline className="text-warn">Configuración pendiente</Overline>
      <h2 className="mt-2 font-display text-h3 font-normal">Conecta Supabase</h2>
      <p className="mt-3 text-small text-ink-secondary">
        Falta la <b>URL del proyecto</b> de Supabase. Añádela en{" "}
        <code className="rounded-xs bg-beige-warm px-1">NEXT_PUBLIC_SUPABASE_URL</code> (en{" "}
        <code className="rounded-xs bg-beige-warm px-1">.env.local</code> en local, o en las
        variables de entorno de Vercel). Después ejecuta el esquema y el seed para cargar tus datos
        reales.
      </p>
    </Card>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <Card className="max-w-container-narrow border-error-tint bg-error-tint/40">
      <Overline className="text-error">No se pudo cargar</Overline>
      <p className="mt-3 text-small text-ink-secondary">{message}</p>
    </Card>
  );
}
