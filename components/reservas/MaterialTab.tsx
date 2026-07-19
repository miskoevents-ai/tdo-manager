"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input, Field } from "@/components/ui/input";
import { crearReserva, cambiarEstadoReserva, borrarReserva, registrarIncidenciaReserva } from "@/app/actions";
import { disponible } from "@/lib/disponibilidad";
import { fecha, eur, normaliza } from "@/lib/format";
import type { Inventario, Reserva } from "@/lib/types";

const INCID_TIPO: Record<string, string> = {
  rota: "Rota",
  danada: "Dañada",
  no_devuelta: "No devuelta",
};

const ESTADO_RES: Record<string, { label: string; tone: BadgeTone }> = {
  presupuestado: { label: "En negociación", tone: "clay" },
  reservado: { label: "Reservado", tone: "warn" },
  entregado: { label: "Entregado", tone: "sage" },
  devuelto: { label: "Devuelto", tone: "ok" },
  incidencia: { label: "Incidencia", tone: "error" },
};
const ESTADOS = ["presupuestado", "reservado", "entregado", "devuelto", "incidencia"];

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
  // Reserva cuyo detalle de incidencia se está editando.
  const [incidFor, setIncidFor] = React.useState<string | null>(null);

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
              <Input type="number" min="1" value={cantidad || ""} onChange={(e) => setCantidad(Number(e.target.value))} />
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
                const incidCant = r.cantidad_incidencia ?? 0;
                const resumenIncid =
                  r.estado === "incidencia"
                    ? [
                        incidCant > 0 ? `${incidCant} ud.` : null,
                        r.incidencia_tipo ? (INCID_TIPO[r.incidencia_tipo] ?? r.incidencia_tipo) : null,
                        (r.coste_incidencia ?? 0) > 0 ? eur(r.coste_incidencia ?? 0) : null,
                        r.incidencia_nota || null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "";
                return (
                  <React.Fragment key={r.id}>
                  <tr className="hover:bg-beige-light">
                    <td className="border-t border-border px-3 py-2 font-medium">{r.articulo?.articulo ?? "—"}</td>
                    <td className="border-t border-border px-3 py-2 tabular">{r.cantidad}</td>
                    <td className="border-t border-border px-3 py-2 text-ink-secondary">{fecha(r.fecha_salida)}</td>
                    <td className="border-t border-border px-3 py-2 text-ink-secondary">{fecha(r.fecha_devolucion)}</td>
                    <td className="border-t border-border px-3 py-2">
                      <select
                        value={r.estado}
                        disabled={busy === r.id}
                        onChange={async (e) => {
                          const nuevo = e.target.value;
                          // "Incidencia" abre el formulario de detalle en vez de
                          // guardar directamente (hay que decir qué pasó).
                          if (nuevo === "incidencia") {
                            setIncidFor(r.id);
                            return;
                          }
                          setBusy(r.id);
                          try {
                            await cambiarEstadoReserva(r.id, nuevo, oportunidadId);
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
                  {r.estado === "incidencia" && incidFor !== r.id && (
                    <tr>
                      <td colSpan={6} className="border-t border-border bg-error-tint/30 px-3 py-1.5 text-[11.5px] text-error">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle size={12} /> {resumenIncid || "Incidencia sin detalle"}
                        </span>
                        <button onClick={() => setIncidFor(r.id)} className="ml-2 font-semibold underline hover:no-underline">
                          editar
                        </button>
                      </td>
                    </tr>
                  )}
                  {incidFor === r.id && (
                    <tr>
                      <td colSpan={6} className="border-t border-border bg-error-tint/40 px-3 py-3">
                        <IncidenciaForm
                          maxCant={r.cantidad}
                          inicial={{
                            cantidad: incidCant || r.cantidad,
                            tipo: r.incidencia_tipo || "rota",
                            coste: r.coste_incidencia ?? 0,
                            nota: r.incidencia_nota || "",
                          }}
                          busy={busy === r.id}
                          onCancel={() => setIncidFor(null)}
                          onSave={async (d) => {
                            setBusy(r.id);
                            try {
                              await registrarIncidenciaReserva(r.id, oportunidadId, d);
                              setIncidFor(null);
                              router.refresh();
                            } finally {
                              setBusy(null);
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Formulario del detalle de una incidencia de material (rotura / no devolución).
function IncidenciaForm({
  maxCant,
  inicial,
  busy,
  onSave,
  onCancel,
}: {
  maxCant: number;
  inicial: { cantidad: number; tipo: string; coste: number; nota: string };
  busy: boolean;
  onSave: (d: { cantidad: number; tipo: string; coste: number | null; nota: string | null }) => void;
  onCancel: () => void;
}) {
  const [cantidad, setCantidad] = React.useState(inicial.cantidad);
  const [tipo, setTipo] = React.useState(inicial.tipo);
  const [coste, setCoste] = React.useState(inicial.coste);
  const [nota, setNota] = React.useState(inicial.nota);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={`Uds. afectadas (de ${maxCant})`}>
          <Input type="number" min="1" max={maxCant} value={cantidad || ""} onChange={(e) => setCantidad(Number(e.target.value))} autoFocus />
        </Field>
        <Field label="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[14px]"
          >
            {Object.entries(INCID_TIPO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Coste reposición €">
          <Input type="number" step="0.01" value={coste || ""} onChange={(e) => setCoste(Number(e.target.value))} />
        </Field>
        <Field label="Nota (opcional)">
          <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalle…" />
        </Field>
      </div>
      <p className="text-[11px] text-ink-muted">
        Si el cliente es responsable, puedes cubrir el coste reteniendo (parte de) la fianza en la pestaña de Cobros.
      </p>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="danger" disabled={busy || !(cantidad > 0)} onClick={() => onSave({ cantidad, tipo, coste: coste > 0 ? coste : null, nota: nota || null })}>
          {busy ? "Guardando…" : "Guardar incidencia"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
