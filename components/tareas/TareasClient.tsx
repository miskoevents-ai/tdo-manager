"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Pencil, MessageCircle, CalendarClock, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { crearTarea, actualizarTarea, borrarTarea } from "@/app/actions";
import { fecha as fmtFecha } from "@/lib/format";
import type { Tarea, TareaEstado, TareaPrioridad } from "@/lib/types";

const PRIORIDAD: Record<TareaPrioridad, { label: string; clase: string; punto: string }> = {
  urgente: { label: "Urgente", clase: "bg-error-tint text-error", punto: "bg-error" },
  alta: { label: "Alta", clase: "bg-clay-tint text-clay-600", punto: "bg-clay" },
  normal: { label: "Normal", clase: "bg-sage-tint text-sage", punto: "bg-sage" },
  baja: { label: "Baja", clase: "bg-beige-warm text-ink-muted", punto: "bg-ink-muted" },
};
const ORDEN_PRIORIDAD: TareaPrioridad[] = ["urgente", "alta", "normal", "baja"];

const ESTADO: Record<TareaEstado, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha ✓",
  no_puedo: "No puedo 🙋",
};

type OpLite = { id: string; titulo: string };

export function TareasClient({
  tareas,
  oportunidades,
  personas,
  hoy,
}: {
  tareas: Tarea[];
  oportunidades: OpLite[];
  personas: string[];
  hoy: string;
}) {
  const router = useRouter();
  const r = () => router.refresh();

  // "Yo soy": se recuerda en este navegador para abrir siempre tu panel.
  const [yo, setYo] = React.useState<string>("");
  const [filtroPersona, setFiltroPersona] = React.useState<string>("");
  const [filtroEstado, setFiltroEstado] = React.useState<"abiertas" | "hechas" | "todas">("abiertas");
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    const guardado = localStorage.getItem("tdo_quien_soy") ?? "";
    setYo(guardado);
    setFiltroPersona(guardado);
    setCargado(true);
  }, []);

  function cambiaYo(v: string) {
    setYo(v);
    localStorage.setItem("tdo_quien_soy", v);
    setFiltroPersona(v);
  }

  const visibles = tareas.filter((t) => {
    if (filtroPersona && t.asignada_a !== filtroPersona) return false;
    if (filtroEstado === "abiertas" && t.estado === "hecha") return false;
    if (filtroEstado === "hechas" && t.estado !== "hecha") return false;
    return true;
  });

  const abiertas = visibles
    .filter((t) => t.estado !== "hecha")
    .sort((a, b) => {
      const p = ORDEN_PRIORIDAD.indexOf(a.prioridad) - ORDEN_PRIORIDAD.indexOf(b.prioridad);
      if (p !== 0) return p;
      return (a.fecha_limite ?? "9999") < (b.fecha_limite ?? "9999") ? -1 : 1;
    });
  const hechas = visibles.filter((t) => t.estado === "hecha").slice(0, 30);

  const pendientesDeYo = yo ? tareas.filter((t) => t.asignada_a === yo && t.estado !== "hecha").length : 0;

  if (!cargado) return null;

  return (
    <div className="space-y-4">
      {/* Quién soy + filtros */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Yo soy">
            <Select value={yo} onChange={(e) => cambiaYo(e.target.value)}>
              <option value="">— Elige tu nombre —</option>
              {personas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ver tareas de">
            <Select value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)}>
              <option value="">Todo el equipo</option>
              {personas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2 pb-0.5">
            {([["abiertas", "Abiertas"], ["hechas", "Hechas"], ["todas", "Todas"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFiltroEstado(k)}
                className={`rounded-pill border-med px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  filtroEstado === k
                    ? "border-sage bg-sage text-cream"
                    : "border-border bg-white text-ink-secondary hover:border-sage-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {yo && (
            <span className="pb-1.5 text-[12px] text-ink-muted">
              Tienes <b className="text-ink">{pendientesDeYo}</b> tarea{pendientesDeYo === 1 ? "" : "s"} abierta{pendientesDeYo === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </Card>

      <NuevaTarea personas={personas} oportunidades={oportunidades} yo={yo} onDone={r} />

      {/* Abiertas */}
      {abiertas.length === 0 && filtroEstado !== "hechas" && (
        <p className="py-2 text-small text-ink-muted">
          {filtroPersona ? `${filtroPersona} no tiene tareas abiertas. 🎉` : "No hay tareas abiertas. 🎉"}
        </p>
      )}
      <div className="space-y-2.5">
        {abiertas.map((t) => (
          <TarjetaTarea key={t.id} t={t} hoy={hoy} personas={personas} onDone={r} />
        ))}
      </div>

      {/* Hechas */}
      {filtroEstado !== "abiertas" && hechas.length > 0 && (
        <div className="space-y-2.5">
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Hechas recientemente
          </p>
          {hechas.map((t) => (
            <TarjetaTarea key={t.id} t={t} hoy={hoy} personas={personas} onDone={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Alta de tarea ----------
function NuevaTarea({
  personas,
  oportunidades,
  yo,
  onDone,
}: {
  personas: string[];
  oportunidades: OpLite[];
  yo: string;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [para, setPara] = React.useState("");
  const [de, setDe] = React.useState(yo);
  const [prioridad, setPrioridad] = React.useState("normal");
  const [fechaLimite, setFechaLimite] = React.useState("");
  const [opId, setOpId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setDe(yo), [yo]);

  async function guardar() {
    if (!titulo.trim() || !para) return;
    setBusy(true);
    setError(null);
    try {
      await crearTarea({
        titulo,
        descripcion: descripcion || null,
        asignadaA: para,
        creadaPor: de || null,
        prioridad,
        fechaLimite: fechaLimite || null,
        oportunidadId: opId || null,
      });
      setOpen(false);
      setTitulo(""); setDescripcion(""); setPara(""); setPrioridad("normal"); setFechaLimite(""); setOpId("");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> Nueva tarea
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tarea *">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Preparar los centros de la boda…" autoFocus />
        </Field>
        <Field label="Detalles">
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Cómo, dónde, con qué…" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Para *">
          <Select value={para} onChange={(e) => setPara(e.target.value)}>
            <option value="">—</option>
            {personas.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="De">
          <Select value={de} onChange={(e) => setDe(e.target.value)}>
            <option value="">—</option>
            {personas.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
            {ORDEN_PRIORIDAD.map((p) => <option key={p} value={p}>{PRIORIDAD[p].label}</option>)}
          </Select>
        </Field>
        <Field label="Fecha límite">
          <Input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
        </Field>
      </div>
      <Field label="Vinculada a un evento (opcional)">
        <Select value={opId} onChange={(e) => setOpId(e.target.value)}>
          <option value="">— Ninguno —</option>
          {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
        </Select>
      </Field>
      {error && <p className="text-caption text-error">{error}</p>}
      <div className="flex justify-end gap-1">
        <Button size="sm" onClick={guardar} disabled={busy || !titulo.trim() || !para}>
          {busy ? "Guardando…" : "Asignar tarea"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

// ---------- Tarjeta de tarea ----------
function TarjetaTarea({
  t,
  hoy,
  personas,
  onDone,
}: {
  t: Tarea;
  hoy: string;
  personas: string[];
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [editando, setEditando] = React.useState(false);
  const [comentando, setComentando] = React.useState(false);
  const [comentario, setComentario] = React.useState(t.comentario ?? "");
  const [titulo, setTitulo] = React.useState(t.titulo);
  const [descripcion, setDescripcion] = React.useState(t.descripcion ?? "");
  const [prioridad, setPrioridad] = React.useState<string>(t.prioridad);
  const [fechaLimite, setFechaLimite] = React.useState(t.fecha_limite ?? "");

  const hecha = t.estado === "hecha";
  const vencida = !hecha && Boolean(t.fecha_limite) && t.fecha_limite! < hoy;
  const p = PRIORIDAD[t.prioridad] ?? PRIORIDAD.normal;

  async function act(patch: Parameters<typeof actualizarTarea>[1]) {
    setBusy(true);
    try {
      await actualizarTarea(t.id, patch);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className={`space-y-2 p-4 ${hecha ? "opacity-60" : ""} ${
        vencida ? "border-l-[3px] border-l-error" : t.estado === "no_puedo" ? "border-l-[3px] border-l-warn" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editando ? (
            <div className="space-y-2">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles…" />
              <div className="flex flex-wrap gap-2">
                <Select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-auto">
                  {ORDEN_PRIORIDAD.map((x) => <option key={x} value={x}>{PRIORIDAD[x].label}</option>)}
                </Select>
                <Input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="w-auto" />
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    await act({ titulo, descripcion, prioridad, fechaLimite });
                    setEditando(false);
                  }}
                >
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>×</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[14px] font-semibold ${hecha ? "line-through" : ""}`}>{t.titulo}</span>
                <span className={`rounded-pill px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] ${p.clase}`}>
                  {p.label}
                </span>
                {vencida && (
                  <span className="rounded-pill bg-error-tint px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-error">
                    Vencida
                  </span>
                )}
              </div>
              {t.descripcion && <p className="mt-0.5 text-[12.5px] text-ink-secondary">{t.descripcion}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-ink-muted">
                <span>
                  {t.creada_por ? `${t.creada_por} → ` : ""}
                  <b className="text-ink-secondary">{t.asignada_a}</b>
                </span>
                {t.fecha_limite && (
                  <span className={`inline-flex items-center gap-1 ${vencida ? "font-semibold text-error" : ""}`}>
                    <CalendarClock size={12} /> {fmtFecha(t.fecha_limite)}
                  </span>
                )}
                {t.oportunidad && (
                  <Link href={`/oportunidades/${t.oportunidad.id}`} className="inline-flex items-center gap-1 text-sage hover:underline">
                    <Link2 size={12} /> {t.oportunidad.titulo}
                  </Link>
                )}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={t.estado}
            disabled={busy}
            onChange={(e) => act({ estado: e.target.value })}
            className={`rounded-sm border-hair border-border px-2 py-1.5 text-[12px] font-medium ${
              hecha ? "bg-ok-tint text-ok" : t.estado === "no_puedo" ? "bg-warn-tint text-warn" : "bg-beige-light"
            }`}
          >
            {(Object.keys(ESTADO) as TareaEstado[]).map((e) => (
              <option key={e} value={e}>{ESTADO[e]}</option>
            ))}
          </select>
          {!hecha && (
            <button
              title="Marcar como hecha"
              disabled={busy}
              onClick={() => act({ estado: "hecha" })}
              className="rounded-sm p-1.5 text-ink-muted hover:bg-ok-tint hover:text-ok"
            >
              <Check size={15} />
            </button>
          )}
          <button
            title="Comentar"
            onClick={() => setComentando((v) => !v)}
            className={`rounded-sm p-1.5 ${t.comentario ? "text-sage" : "text-ink-muted"} hover:bg-sage-tint hover:text-sage`}
          >
            <MessageCircle size={15} />
          </button>
          <button
            title="Editar"
            onClick={() => setEditando((v) => !v)}
            className="rounded-sm p-1.5 text-ink-muted hover:bg-beige-warm"
          >
            <Pencil size={15} />
          </button>
          <button
            title="Borrar tarea"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await borrarTarea(t.id);
                onDone();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Comentario / respuesta */}
      {(comentando || t.comentario) && (
        <div className="rounded-md bg-beige-light p-2.5">
          {comentando ? (
            <div className="flex gap-2">
              <Input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escribe una nota o respuesta (ej. 'me falta material')…"
              />
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  await act({ comentario });
                  setComentando(false);
                }}
              >
                Guardar
              </Button>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-secondary">
              💬 {t.comentario}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
