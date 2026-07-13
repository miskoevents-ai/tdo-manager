"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Lock, User } from "lucide-react";

export function LoginForm() {
  const params = useSearchParams();
  const [usuario, setUsuario] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }
      // Solo rutas internas para evitar redirecciones fuera de la app.
      const next = params.get("next") ?? "/";
      window.location.href = next.startsWith("/") ? next : "/";
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-sm border-med border-border bg-white py-2.5 pl-9 pr-3 text-[14px] focus:border-sage-300 focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
        Usuario
      </label>
      <div className="relative">
        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="jero, cris…"
          className={inputCls}
        />
      </div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
        Contraseña
      </label>
      <div className="relative">
        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputCls}
        />
      </div>
      {error && <p className="text-[12px] text-error">{error}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="w-full rounded-sm bg-sage px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:bg-sage-600 disabled:opacity-50"
      >
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <p className="pt-1 text-center text-[11px] text-ink-muted">
        Cada socio entra con su usuario. Acceso privado del equipo de TDO.
      </p>
    </form>
  );
}
