"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, KeyRound, Trash2, ShieldCheck, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { crearUsuario, actualizarUsuario, resetPasswordUsuario, borrarUsuario } from "@/app/actions";
import { fecha } from "@/lib/format";
import type { Usuario } from "@/lib/types";

export function UsuariosClient({ usuarios, yoUsuario }: { usuarios: Usuario[]; yoUsuario: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NuevoUsuario onError={setError} onDone={() => router.refresh()} />
      </div>
      {error && <p className="text-[12px] text-error">{error}</p>}

      <div className="overflow-hidden rounded-lg border-hair border-border bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-ink-secondary">
              <th className="border-b border-border px-4 py-2.5 text-left font-semibold">Nombre</th>
              <th className="border-b border-border px-4 py-2.5 text-left font-semibold">Usuario</th>
              <th className="border-b border-border px-4 py-2.5 text-left font-semibold">Rol</th>
              <th className="border-b border-border px-4 py-2.5 text-left font-semibold">Último acceso</th>
              <th className="border-b border-border px-4 py-2.5 text-right font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const soyYo = u.usuario === yoUsuario;
              return (
                <tr key={u.id} className={u.activo ? "" : "opacity-50"}>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5 font-medium">
                    {u.nombre}
                    {soyYo && <span className="ml-1.5 text-[10.5px] text-ink-muted">(tú)</span>}
                    {!u.activo && <span className="ml-1.5 rounded-pill bg-beige-warm px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">inactivo</span>}
                  </td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5 text-ink-secondary">{u.usuario}</td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5">
                    <button
                      onClick={() => run(() => actualizarUsuario(u.id, { esAdmin: !u.es_admin }))}
                      disabled={soyYo}
                      title={soyYo ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${
                        u.es_admin ? "bg-sage-tint text-sage" : "bg-beige-warm text-ink-muted"
                      } ${soyYo ? "cursor-default" : "hover:opacity-80"}`}
                    >
                      {u.es_admin ? <ShieldCheck size={12} /> : <Shield size={12} />}
                      {u.es_admin ? "Admin" : "Normal"}
                    </button>
                  </td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5 text-[12px] text-ink-muted">
                    {u.ultimo_acceso ? fecha(u.ultimo_acceso) : "nunca"}
                  </td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <ResetPassword usuario={u} onError={setError} onDone={() => router.refresh()} />
                      {!soyYo && (
                        <>
                          <button
                            onClick={() => run(() => actualizarUsuario(u.id, { activo: !u.activo }))}
                            title={u.activo ? "Desactivar" : "Activar"}
                            className="rounded-sm px-2 py-1 text-[11px] font-semibold text-ink-secondary hover:bg-beige-warm"
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Borrar el usuario ${u.nombre}? No podrá volver a entrar.`)) {
                                run(() => borrarUsuario(u.id));
                              }
                            }}
                            title="Borrar usuario"
                            className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NuevoUsuario({ onError, onDone }: { onError: (m: string | null) => void; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [usuario, setUsuario] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [esAdmin, setEsAdmin] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await crearUsuario({ usuario, nombre, esAdmin, password });
      setOpen(false);
      setUsuario(""); setNombre(""); setPassword(""); setEsAdmin(true);
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus size={15} /> Nuevo usuario</Button>
      </DialogTrigger>
      <DialogContent title="Nuevo usuario">
        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre visible">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cristina" autoFocus />
            </Field>
            <Field label="Usuario (para entrar)">
              <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="cristina" autoCapitalize="none" />
            </Field>
          </div>
          <Field label="Contraseña inicial">
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
          </Field>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={esAdmin} onChange={(e) => setEsAdmin(e.target.checked)} className="h-4 w-4 accent-sage" />
            Administrador (puede gestionar usuarios y borrar)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancelar</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={busy || !usuario || !nombre || !password}>
              {busy ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPassword({ usuario, onError, onDone }: { usuario: Usuario; onError: (m: string | null) => void; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [nueva, setNueva] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await resetPasswordUsuario(usuario.id, nueva);
      setOpen(false);
      setNueva("");
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button title="Reiniciar contraseña" className="rounded-sm p-1.5 text-ink-muted hover:bg-beige-warm hover:text-sage">
          <KeyRound size={15} />
        </button>
      </DialogTrigger>
      <DialogContent title={`Reiniciar contraseña de ${usuario.nombre}`}>
        <form onSubmit={guardar} className="space-y-3">
          <Field label="Nueva contraseña">
            <Input type="text" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="mínimo 6 caracteres" autoFocus />
          </Field>
          <p className="text-[11.5px] text-ink-muted">
            Dísela a {usuario.nombre}; podrá cambiarla luego desde su propia sesión.
          </p>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancelar</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={busy || nueva.length < 6}>
              {busy ? "Guardando…" : "Reiniciar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
