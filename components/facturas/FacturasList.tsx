"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Undo2, FileDown, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { marcarFacturaCobrada, anularFactura } from "@/app/actions";
import { PersonaCajaModal } from "@/components/ui/PersonaCajaModal";
import { eur, fecha } from "@/lib/format";
import { FACTURA_META } from "@/lib/estados";
import type { Factura, FacturaEstado } from "@/lib/types";

const FILTROS: { key: "todas" | FacturaEstado; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "emitida", label: "Emitidas" },
  { key: "cobrada", label: "Cobradas" },
  { key: "vencida", label: "Vencidas" },
  { key: "anulada", label: "Anuladas" },
];

export function FacturasList({ facturas, responsables = [] }: { facturas: Factura[]; responsables?: string[] }) {
  const router = useRouter();
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const vencidaSinCobrar = (f: Factura) =>
    f.estado === "emitida" && Boolean(f.fecha_vencimiento) && f.fecha_vencimiento! < hoy;
  const [filtro, setFiltro] = React.useState<"todas" | FacturaEstado>("todas");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [desde, setDesde] = React.useState("");
  const [hasta, setHasta] = React.useState("");

  const visibles = facturas.filter((f) => {
    if (filtro !== "todas" && f.estado !== filtro) return false;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      const hay =
        f.numero.toLowerCase().includes(t) ||
        (f.cliente?.nombre ?? "").toLowerCase().includes(t);
      if (!hay) return false;
    }
    if (desde && f.fecha_emision < desde) return false;
    if (hasta && f.fecha_emision > hasta) return false;
    return true;
  });

  const pendienteCobro = facturas
    .filter((f) => f.estado === "emitida" || f.estado === "vencida")
    .reduce((s, f) => s + Number(f.total), 0);

  // Al marcar cobrada se pregunta quién recibió el dinero (equipo o caja).
  const [cobrando, setCobrando] = React.useState<Factura | null>(null);

  async function toggle(f: Factura, cobradoPor?: string | null) {
    const cobrar = f.estado !== "cobrada";
    if (cobrar && cobradoPor === undefined && responsables.length > 0) {
      setCobrando(f);
      return;
    }
    setBusy(f.id);
    try {
      await marcarFacturaCobrada(f.id, cobrar, cobradoPor ?? null);
      router.refresh();
    } finally {
      setBusy(null);
      setCobrando(null);
    }
  }

  async function anular(f: Factura) {
    const anulando = f.estado !== "anulada";
    if (
      anulando &&
      !confirm(
        `¿Anular la factura ${f.numero}? Conserva su número (como exige la normativa) y se retira su cobro previsto.`,
      )
    )
      return;
    setBusy(f.id);
    try {
      await anularFactura(f.id, anulando);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Buscar + fechas */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
            Buscar (nº o cliente)
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="26009, Produktema…"
            className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:shadow-ring focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-sm border-med border-border bg-white px-3 py-2 text-[13px] focus:border-sage-300 focus:outline-none"
          />
        </div>
        {(q || desde || hasta) && (
          <button
            onClick={() => {
              setQ("");
              setDesde("");
              setHasta("");
            }}
            className="rounded-sm border-med border-border-strong px-3 py-2 text-[12px] text-ink-secondary hover:bg-beige-warm"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`rounded-pill border-med px-[14px] py-[7px] text-[12px] transition-colors ${
                filtro === f.key
                  ? "border-sage bg-sage text-cream"
                  : "border-border bg-white text-ink-secondary hover:border-sage-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-[12px] text-ink-muted">
          Pendiente de cobro:{" "}
          <b className="tabular text-error">{eur(pendienteCobro)}</b>
        </div>
      </div>

      {/* Tabla escritorio */}
      <div className="hidden overflow-hidden rounded-lg border-hair border-border shadow-sm md:block">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {["Nº", "Cliente", "Fecha", "Vence", "Base", "Total", "Estado", ""].map((h) => (
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
            {visibles.map((f) => {
              const m = FACTURA_META[f.estado];
              return (
                <tr key={f.id} className="hover:bg-beige-light">
                  <td className="border-t border-border px-[15px] py-3 text-[13px] font-medium">
                    {f.oportunidad_id ? (
                      <Link href={`/oportunidades/${f.oportunidad_id}`} className="hover:text-clay">
                        {f.numero}
                      </Link>
                    ) : (
                      f.numero
                    )}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-[13px]">
                    {f.cliente?.nombre ?? "—"}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-[13px] text-ink-secondary">
                    {fecha(f.fecha_emision)}
                  </td>
                  <td
                    className={`border-t border-border px-[15px] py-3 text-[13px] ${
                      vencidaSinCobrar(f) ? "font-semibold text-error" : "text-ink-secondary"
                    }`}
                  >
                    {f.fecha_vencimiento ? fecha(f.fecha_vencimiento) : "—"}
                    {vencidaSinCobrar(f) && " ⚠"}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-right text-[13px] tabular">
                    {eur(Number(f.base_imponible))}
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-right text-[13px] tabular font-semibold">
                    {eur(Number(f.total))}
                  </td>
                  <td className="border-t border-border px-[15px] py-3">
                    <Badge tone={m.tone}>{m.label}</Badge>
                  </td>
                  <td className="border-t border-border px-[15px] py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/facturas/${f.id}`}
                        className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary hover:bg-beige-warm"
                      >
                        <FileDown size={12} /> PDF
                      </Link>
                      {f.estado !== "anulada" && (
                        <button
                          onClick={() => toggle(f)}
                          disabled={busy === f.id}
                          className={`inline-flex items-center gap-1 rounded-sm border-med px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                            f.estado === "cobrada"
                              ? "border-border text-ink-muted hover:bg-beige-warm"
                              : "border-ok bg-ok text-cream hover:opacity-90"
                          }`}
                        >
                          {f.estado === "cobrada" ? (
                            <>
                              <Undo2 size={12} /> Reabrir
                            </>
                          ) : (
                            <>
                              <Check size={12} /> Cobrada
                            </>
                          )}
                        </button>
                      )}
                      {f.estado !== "cobrada" && (
                        <button
                          onClick={() => anular(f)}
                          disabled={busy === f.id}
                          title={f.estado === "anulada" ? "Restaurar la factura (vuelve a emitida)" : "Anular la factura (conserva su número)"}
                          className={`inline-flex items-center gap-1 rounded-sm border-med px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                            f.estado === "anulada"
                              ? "border-border text-ink-muted hover:bg-beige-warm"
                              : "border-border-strong text-error hover:bg-error-tint"
                          }`}
                        >
                          {f.estado === "anulada" ? (
                            <>
                              <Undo2 size={12} /> Restaurar
                            </>
                          ) : (
                            <>
                              <Ban size={12} /> Anular
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="space-y-3 md:hidden">
        {visibles.map((f) => {
          const m = FACTURA_META[f.estado];
          return (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  {f.oportunidad_id ? (
                    <Link href={`/oportunidades/${f.oportunidad_id}`} className="text-[14px] font-semibold hover:text-clay">
                      {f.numero}
                    </Link>
                  ) : (
                    <div className="text-[14px] font-semibold">{f.numero}</div>
                  )}
                  <div className="mt-0.5 text-[12px] text-ink-muted">
                    {f.cliente?.nombre ?? "—"} · {fecha(f.fecha_emision)}
                  </div>
                  {f.fecha_vencimiento && (
                    <div
                      className={`mt-0.5 text-[11.5px] ${
                        vencidaSinCobrar(f) ? "font-semibold text-error" : "text-ink-muted"
                      }`}
                    >
                      Vence {fecha(f.fecha_vencimiento)}
                      {vencidaSinCobrar(f) && " ⚠"}
                    </div>
                  )}
                </div>
                <Badge tone={m.tone}>{m.label}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="tabular text-[15px] font-semibold text-sage">
                  {eur(Number(f.total))}
                </span>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/facturas/${f.id}`}
                    className="inline-flex items-center gap-1 rounded-sm border-med border-border-strong px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-secondary"
                  >
                    <FileDown size={12} /> PDF
                  </Link>
                  <button
                    onClick={() => toggle(f)}
                    disabled={busy === f.id}
                    className={`inline-flex items-center gap-1 rounded-sm border-med px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                      f.estado === "cobrada"
                        ? "border-border text-ink-muted"
                        : "border-ok bg-ok text-cream"
                    }`}
                  >
                    {f.estado === "cobrada" ? (
                      <>
                        <Undo2 size={12} /> Reabrir
                      </>
                    ) : (
                      <>
                        <Check size={12} /> Cobrada
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {cobrando && (
        <PersonaCajaModal
          titulo={`Cobrar factura ${cobrando.numero}`}
          descripcion={`${cobrando.cliente?.nombre ?? ""} · ${eur(Number(cobrando.total))}`}
          responsables={responsables}
          busy={busy === cobrando.id}
          confirmLabel="Marcar cobrada"
          onConfirm={({ persona }) => toggle(cobrando, persona)}
          onClose={() => setCobrando(null)}
        />
      )}
    </div>
  );
}
