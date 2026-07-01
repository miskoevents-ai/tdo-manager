"use client";

import { useActionState } from "react";
import { seedAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function SeedForm() {
  const [state, formAction, pending] = useActionState(seedAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Token de seed (SEED_TOKEN)">
        <Input name="token" placeholder="El valor de SEED_TOKEN" autoComplete="off" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Cargando datos…" : "Cargar datos reales"}
      </Button>
      {state && (
        <p className={`text-small ${state.ok ? "text-ok" : "text-error"}`}>{state.message}</p>
      )}
    </form>
  );
}
