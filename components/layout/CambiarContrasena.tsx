"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { cambiarMiContrasena } from "@/app/actions";

// Cambiar la propia contraseña desde la barra superior.
export function CambiarContrasena() {
  const [open, setOpen] = React.useState(false);
  const [actual, setActual] = React.useState("");
  const [nueva, setNueva] = React.useState("");
  const [repetir, setRepetir] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva !== repetir) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await cambiarMiContrasena(actual, nueva);
      setOk(true);
      setActual(""); setNueva(""); setRepetir("");
      setTimeout(() => { setOpen(false); setOk(false); }, 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button title="Cambiar mi contraseña" className="rounded-sm p-1.5 text-ink-muted hover:bg-beige-warm hover:text-sage">
          <KeyRound size={15} />
        </button>
      </DialogTrigger>
      <DialogContent title="Cambiar mi contraseña">
        <form onSubmit={guardar} className="space-y-3">
          <Field label="Contraseña actual">
            <Input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoFocus />
          </Field>
          <Field label="Nueva contraseña">
            <Input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="mínimo 6 caracteres" />
          </Field>
          <Field label="Repite la nueva">
            <Input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          </Field>
          {error && <p className="text-[12px] text-error">{error}</p>}
          {ok && <p className="text-[12px] text-ok">Contraseña actualizada ✓</p>}
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancelar</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={busy || !actual || !nueva}>
              {busy ? "Guardando…" : "Cambiar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
