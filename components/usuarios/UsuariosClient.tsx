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
import { SECCIONES } from "@/lib/secciones";
import type { Usuario } from "@/lib/types";

// Tiempo total de uso, legible.
function tiempoUso(seg: number): string {
  if (!seg || seg < 60) return "—";
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

// Selector de secciones (casillas) para un usuario no admin.
function PermisosPicker({ valor, onChange }: { valor: string[]; onChange: (v: string[]) => void }) {
  function toggle(key: string) {
    onChange(valor.includes(key) ? valor.filter((k) => k !== key) : [...valor, key]);
  }
  const todas = valor.length === SECCIONES.length;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Secciones a las que puede entrar
        </span>
        <button
          type="button"
          onClick={() => onChange(todas ? [] : SECCIONES.map((s) => s.key))}
          className="text-[11px] font-semibold text-sage hover:underline"
        >
          {todas ? "Ninguna" : "Todas"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border-hair border-border bg-beige-light/60 p-3">
        {SECCIONES.map((s) => (
          <label key={s.key} className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={valor.includes(s.key)} onChange={() => toggle(s.key)} className="h-4 w-4 accent-sage" />
            {s.label}
          </label>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink-muted">Inicio y Guía están siempre disponibles.</p>
    </div>
  );
}

export function UsuariosClient({
  usuarios,
  yoUsuario,
  usoSemana = {},
  rangoSemana = "",
}: {
  usuarios: Usuario[];
  yoUsuario: string;
  usoSemana?: Record<string, number>;
  rangoSemana?: string;
}) {
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
              <th className="border-b border-border px-4 py-2.5 text-left font-semibold">
                Esta semana{rangoSemana ? ` (${rangoSemana})` : ""}
              </th>
              <th className="border-b border-border px-4 py-2.5 text-left font-semibold">Total</th>
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
                  <td className="border-b border-[#f0eae1] px-4 py-2.5 text-[12px] tabular font-medium text-sage">
                    {tiempoUso(Number(usoSemana[u.usuario] ?? 0))}
                  </td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5 text-[12px] text-ink-secondary tabular">
                    {tiempoUso(Number(u.segundos_activo ?? 0))}
                  </td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5 text-[12px] text-ink-muted">
                    {u.ultimo_acceso ? fecha(u.ultimo_acceso) : "nunca"}
                  </td>
                  <td className="border-b border-[#f0eae1] px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {!u.es_admin && <EditarPermisos usuario={u} onError={setError} onDone={() => router.refresh()} />}
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
  // Por defecto NO admin: así se ven las casillas de secciones y se da acceso
  // limitado (lo normal al sumar a alguien). Marca "Administrador" para todo.
  const [esAdmin, setEsAdmin] = React.useState(false);
  const [permisos, setPermisos] = React.useState<string[]>(SECCIONES.map((s) => s.key));
  const [busy, setBusy] = React.useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await crearUsuario({ usuario, nombre, esAdmin, password, permisos });
      setOpen(false);
      setUsuario(""); setNombre(""); setPassword(""); setEsAdmin(true); setPermisos(SECCIONES.map((s) => s.key));
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
            Administrador (ve todo y puede gestionar usuarios)
          </label>
          {!esAdmin && <PermisosPicker valor={permisos} onChange={setPermisos} />}
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

function EditarPermisos({ usuario, onError, onDone }: { usuario: Usuario; onError: (m: string | null) => void; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  // permisos null = todas (comportamiento anterior); se muestran todas marcadas.
  const inicial = usuario.permisos ?? SECCIONES.map((s) => s.key);
  const [permisos, setPermisos] = React.useState<string[]>(inicial);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) setPermisos(usuario.permisos ?? SECCIONES.map((s) => s.key));
  }, [open, usuario.permisos]);

  async function guardar() {
    onError(null);
    setBusy(true);
    try {
      await actualizarUsuario(usuario.id, { permisos });
      setOpen(false);
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
        <button title="Secciones a las que puede entrar" className="rounded-sm px-2 py-1 text-[11px] font-semibold text-ink-secondary hover:bg-beige-warm">
          Permisos
        </button>
      </DialogTrigger>
      <DialogContent title={`Permisos de ${usuario.nombre}`}>
        <div className="space-y-3">
          <PermisosPicker valor={permisos} onChange={setPermisos} />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">Cancelar</Button>
            </DialogClose>
            <Button size="sm" onClick={guardar} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
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
