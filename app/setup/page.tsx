import { Card, Overline } from "@/components/ui/card";
import { SeedForm } from "@/components/setup/SeedForm";
import { supabaseConfigurado } from "@/lib/supabase/admin";
import { SetupNotice } from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (!supabaseConfigurado()) return <SetupNotice />;
  return (
    <Card className="max-w-container-narrow">
      <Overline>Puesta en marcha</Overline>
      <h2 className="mt-2 font-display text-h3 font-normal">Cargar datos reales</h2>
      <p className="mt-2 mb-5 text-small text-ink-secondary">
        Rellena las tablas con los datos de <code className="rounded-xs bg-beige-warm px-1">docs/seed-data.json</code>{" "}
        (equipo, clientes, oportunidades, tesorería…). Antes debes haber ejecutado{" "}
        <code className="rounded-xs bg-beige-warm px-1">supabase/schema.sql</code> en el SQL Editor.
        <br />
        <b className="text-warn">Ojo:</b> reemplaza los datos existentes de esas tablas.
      </p>
      <SeedForm />
    </Card>
  );
}
