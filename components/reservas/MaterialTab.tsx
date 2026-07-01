"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input, Field } from "@/components/ui/input";
import { crearReserva, cambiarEstadoReserva, borrarReserva } from "@/app/actions";
import { disponible } from "@/lib/disponibilidad";
import { fecha, normaliza } from "@/lib/format";
import type { Inventario, Reserva } from "@/lib/types";

const ESTADO_RES: Record<string, { label: string; tone: BadgeTone }> = {
  reservado: { label: "Reservado", tone: "warn" },
  entregado: { label: "Entregado", tone: "sage" },
  devuelto: { label: "Devuelto", tone: "ok" },
  incidencia: { label: "Incidencia", tone: "error" },
};
const ESTADOS = ["reservado", "entregado", "devuelto", "incidencia"];

export function MaterialTab({
  oportunidadId,
  reservasEvento,
  reservasGlobal,
  inventario,
  fechaSalidaDefault,
  fechaDevolucionDefault,
}: {
  oportunidadId: string;
  reservasEvento: Reserva[];
  reservasGlobal: Reserva[];
  inventario: Pick<Inventario, "id" | "articulo" | "cantidad_total">[];
  fechaSalidaDefault: string;
  fechaDevolucionDefault: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [articuloId, setArticuloId] = React.useState("");
  const [busca, setBusca] = React.useState("");
  const [cantidad, setCantidad] = React.useState(1);

  const coincidencias = React.useMemo(() => {
    const t = normaliza(busca.trim());
    if (!t) return inventario.slice(0, 8);
    return inventario.filter((i) => normaliza(i.articulo).includes(t)).slice(0, 8);
  }, [busca, inventario]);
  const [salida, setSalida] = React.useState(fechaSalidaDefault);
  const [devolucion, setDevolucion] = React.useState(fechaDevolucionDefault);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const art = inventario.find((i) => i.id === articuloId);
  const disp = art ? disponible(art.cantidad_total ?? 0, art.id, salida, devolucion, reservasGlobal) : 0;
  const sobrepasa = Boolean(art && cantidad > disp);

  async function guardar() {
    if (!articuloId) return;
    setBusy("new");
    setError(null);
    try {
      await crearReserva({
        oportunidadId,
        articuloId,
        cantidad,
        fechaSalida: salida || null,
        fechaDevolucion: devolucion || null,
      });
      setAbierto(false);
      setArticuloId("");
      setCantidad(1);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-muted">{reservasEvento.length} reservas</span>
        <Button size="sm" variant="outline" onClick={() => setAbierto((v) => !v)}>
          <Plus size={14} /> {abierto ? "Cerrar" : "Reservar material"}
        </Button>
      </div>

      {/* Alta de reserva con disponibilidad en vivo */}
      {abierto && (
        <div className="space-y-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4">
          <Field label="Artículo">
            {art ? (
              <div className="flex items-center justify-between rounded-sm border-med border-sage-300 bg-white px-3 py-2 text-[14px]">
                <span>
                  {art.articulo}
                  {art.cantidad_total != null && (
                    <span className="ml-2 text-[11px] text-ink-muted">stock {art.cantidad_total}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => { setArticuloId(""); setBusca(""); }}
                  className="text-[11px] font-semibold text-clay hover:text-clay-600"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Busca un artículo del inventario…"
                  autoFocus
                />
                <div className="mt-1 max-h-[180px] overflow-y-auto rounded-sm border-hair border-border bg-white">
                  {coincidencias.length === 0 && (
                    <p className="px-3 py-2 text-[12px] text-ink-muted">Sin resultados.</p>
                  )}
                  {coincidencias.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setArticuloId(i.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-sage-tint"
                    >
                      <span>{i.articulo}</span>
                      {i.cantidad_total != null && (
                        <span className="text-[11px] text-ink-muted">stock {i.cantidad_total}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cantidad">
              <Input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
            </Field>
            <Field label="Salida">
              <Input type="date" value={salida} onChange={(e) => setSalida(e.target.value)} />
            </Field>
            <Field label="Devolución">
              <Input type="date" value={devolucion} onChange={(e) => setDevolucion(e.target.value)} />
            </Field>
          </div>

          {art && (
            <div
              className={`flex items-center gap-2 rounded-sm px-3 py-2 text-[12px] ${
                sobrepasa ? "bg-error-tint text-error" : "bg-ok-tint text-ok"
              }`}
            >
              {sobrepasa && <AlertTriangle size={14} />}
              Disponibles en esas fechas: <b>{disp}</b> de {art.cantidad_total ?? "—"}
              {sobrepasa && " · te estás pasando del stock disponible"}
            </div>
          )}

          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" variant={sobrepasa ? "danger" : "primary"} onClick={guardar} disabled={busy === "new" || !articuloId}>
              {busy === "new" ? "Guardando…" : sobrepasa ? "Reservar de todos modos" : "Reservar"}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de reservas del evento */}
      {reservasEvento.length === 0 ? (
        <p className="py-2 text-small text-ink-muted">Sin material reservado todavía.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border-hair border-border">
          <table className="w-full border-collapse bg-white text-[13px]">
            <thead>
              <tr>
                {["Artículo", "Cant.", "Salida", "Devolución", "Estado", ""].map((h) => (
                  <th key={h} className="bg-beige-warm px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservasEvento.map((r) => {
                const est = ESTADO_RES[r.estado] ?? { label: r.estado, tone: "neutral" as const };
                return (
                  <tr key={r.id} className="hover:bg-beige-light">
                    <td className="border-t border-border px-3 py-2 font-medium">{r.articulo?.articulo ?? "—"}</td>
                    <td className="border-t border-border px-3 py-2 tabular">{r.cantidad}</td>
                    <td className="border-t border-border px-3 py-2 text-ink-secondary">{fecha(r.fecha_salida)}</td>
                    <td className="border-t border-border px-3 py-2 text-ink-secondary">{fecha(r.fecha_devolucion)}</td>
                    <td className="border-t border-border px-3 py-2">
                      <select
                        value={r.estado}
                        disabled={busy === r.id}
                        onChange={async (e) => {
                          setBusy(r.id);
                          try {
                            await cambiarEstadoReserva(r.id, e.target.value, oportunidadId);
                            router.refresh();
                          } finally {
                            setBusy(null);
                          }
                        }}
                        className="rounded-sm border-hair border-border bg-beige-light px-2 py-1 text-[11px]"
                      >
                        {ESTADOS.map((s) => (
                          <option key={s} value={s}>{ESTADO_RES[s].label}</option>
                        ))}
                      </select>
                      <span className="ml-2 hidden">{est.label}</span>
                    </td>
                    <td className="border-t border-border px-3 py-2 text-right">
                      <button
                        onClick={async () => {
                          setBusy(r.id);
                          try {
                            await borrarReserva(r.id, oportunidadId);
                            router.refresh();
                          } finally {
                            setBusy(null);
                          }
                        }}
                        className="rounded-sm p-1 text-ink-muted hover:bg-error-tint hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
