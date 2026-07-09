"use client";

import * as React from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eur, fecha } from "@/lib/format";
import { ESTADO_META } from "@/lib/estados";
import type { OportunidadEstado } from "@/lib/types";

export type PresupuestoRow = {
  id: string;
  numero: string | null;
  titulo: string;
  cliente: string | null;
  fechaEntrada: string | null;
  fechaEvento: string | null;
  total: number;
  estado: OportunidadEstado;
  esAmigos: boolean;
};

// Archivo de presupuestos: todos los emitidos, con su número y acceso
// directo al documento (sin ir a buscarlos al OneDrive).
export function PresupuestosList({ presupuestos }: { presupuestos: PresupuestoRow[] }) {
  const [q, setQ] = React.useState("");

  const visibles = presupuestos.filter((p) => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return (
      (p.numero ?? "").toLowerCase().includes(t) ||
      p.titulo.toLowerCase().includes(t) ||
      (p.cliente ?? "").toLowerCase().includes(t)
    );
  });

  const docHref = (p: PresupuestoRow) =>
    `/oportunidades/${p.id}/${p.esAmigos ? "prestamo" : "presupuesto"}`;

  return (
    <div className="space-y-4">
      <div className="max-w-[320px]">
        <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Buscar (nº, título o cliente)
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="0062/2026, Cristina…"
          className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:shadow-ring focus:outline-none"
        />
      </div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Nº", "Título", "Cliente", "Fecha", "Evento", "Total", "Estado", ""].map((h) => (
                <th
                  key={h}
                  className="bg-beige-warm px-[15px] py-3 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => {
              const m = ESTADO_META[p.estado];
              return (
                <tr key={p.id} className="hover:bg-beige-light">
                  <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                    <Link href={`/oportunidades/${p.id}`} className="hover:text-clay">
                      {p.numero ?? "—"}
                    </Link>
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-[13px]">{p.titulo}</td>
                  <td className="border-t border-border px-[15px] py-3 text-[13px] text-ink-secondary">
                    {p.cliente ?? "—"}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-[13px] text-ink-secondary">
                    {p.fechaEntrada ? fecha(p.fechaEntrada) : "—"}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-[13px] text-ink-secondary">
                    {p.fechaEvento ? fecha(p.fechaEvento) : "—"}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-right text-[13px] tabular font-semibold">
                    {eur(p.total)}
                  </td>
                  <td className="border-t border-border px-[15px] py-3">
                    <Badge tone={m.tone}>{m.label}</Badge>
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-right">
                    <Link
                      href={docHref(p)}
                      className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary hover:bg-beige-warm"
                    >
                      <FileDown size={12} /> PDF
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibles.length === 0 && (
          <div className="bg-white px-4 py-6 text-center text-[12.5px] text-ink-muted">Sin resultados.</div>
        )}
      </div>

      {/* Tarjetas móvil */}
      <div className="space-y-3 md:hidden">
        {visibles.map((p) => {
          const m = ESTADO_META[p.estado];
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/oportunidades/${p.id}`} className="text-[14px] font-semibold hover:text-clay">
                    {p.numero ?? "—"}
                  </Link>
                  <div className="mt-0.5 text-[12px]">{p.titulo}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-muted">
                    {p.cliente ?? "—"}
                    {p.fechaEvento ? ` · ${fecha(p.fechaEvento)}` : ""}
                  </div>
                </div>
                <Badge tone={m.tone}>{m.label}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="tabular text-[15px] font-semibold text-sage">{eur(p.total)}</span>
                <Link
                  href={docHref(p)}
                  className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary"
                >
                  <FileDown size={12} /> Ver PDF
                </Link>
              </div>
            </Card>
          );
        })}
        {visibles.length === 0 && (
          <p className="py-2 text-center text-[12.5px] text-ink-muted">Sin resultados.</p>
        )}
      </div>
    </div>
  );
}
