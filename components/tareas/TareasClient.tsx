"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Pencil, MessageCircle, CalendarClock, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { crearTarea, actualizarTarea, borrarTarea, ordenarTareas } from "@/app/actions";
import { fecha as fmtFecha, num } from "@/lib/format";
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

// Columnas del tablero (estilo Trello), en orden de flujo.
const COLUMNAS: { estado: TareaEstado; titulo: string; barra: string }[] = [
  { estado: "pendiente", titulo: "Pendiente", barra: "bg-ink-muted" },
  { estado: "en_curso", titulo: "En curso", barra: "bg-clay" },
  { estado: "no_puedo", titulo: "No puedo 🙋", barra: "bg-warn" },
  { estado: "hecha", titulo: "Hecha ✓", barra: "bg-ok" },
];

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
  const [vista, setVista] = React.useState<"lista" | "tablero">("tablero");
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    const guardado = localStorage.getItem("tdo_quien_soy") ?? "";
    setYo(guardado);
    setFiltroPersona(guardado);
    const v = localStorage.getItem("tdo_tareas_vista");
    if (v === "lista" || v === "tablero") setVista(v);
    setCargado(true);
  }, []);

  function cambiaVista(v: "lista" | "tablero") {
    setVista(v);
    localStorage.setItem("tdo_tareas_vista", v);
  }
  // Reordenar / mover una tarea en el tablero (arrastrar y soltar).
  async function ordenar(estado: TareaEstado, ids: string[], id: string) {
    await ordenarTareas(estado, ids, id);
    r();
  }

  function cambiaYo(v: string) {
    setYo(v);
    localStorage.setItem("tdo_quien_soy", v);
    setFiltroPersona(v);
  }

  const visiblesPersona = tareas.filter((t) => !filtroPersona || t.asignada_a === filtroPersona);
  const visibles = visiblesPersona.filter((t) => {
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
          {vista === "lista" && (
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
          )}
          {/* Vista: lista o tablero (Trello) */}
          <div className="ml-auto flex gap-2 pb-0.5">
            {([["tablero", "Tablero"], ["lista", "Lista"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => cambiaVista(k)}
                className={`rounded-pill border-med px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  vista === k
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

      {vista === "tablero" ? (
        <Tablero tareas={visiblesPersona} hoy={hoy} personas={personas} onOrdenar={ordenar} onDone={r} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

// ---------- Tablero (Trello): columnas por estado, arrastrar y soltar ----------
function Tablero({
  tareas,
  hoy,
  personas,
  onOrdenar,
  onDone,
}: {
  tareas: Tarea[];
  hoy: string;
  personas: string[];
  onOrdenar: (estado: TareaEstado, ids: string[], id: string) => void;
  onDone: () => void;
}) {
  // Tarjeta que se arrastra y dónde se soltaría (columna + antes de qué id).
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<{ estado: TareaEstado; antesDe: string | null } | null>(null);

  // Orden dentro de la columna: primero el orden manual (arrastrado); si no lo
  // hay, por prioridad y fecha.
  function orden(a: Tarea, b: Tarea) {
    const oa = a.orden, ob = b.orden;
    if (oa != null && ob != null && oa !== ob) return oa - ob;
    if (oa != null && ob == null) return -1;
    if (oa == null && ob != null) return 1;
    const p = ORDEN_PRIORIDAD.indexOf(a.prioridad) - ORDEN_PRIORIDAD.indexOf(b.prioridad);
    if (p !== 0) return p;
    return (a.fecha_limite ?? "9999") < (b.fecha_limite ?? "9999") ? -1 : 1;
  }

  function soltar(estado: TareaEstado, itemsCol: Tarea[], antesDe: string | null) {
    setOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const ids = itemsCol.map((t) => t.id).filter((x) => x !== id);
    const idx = antesDe ? ids.indexOf(antesDe) : -1;
    ids.splice(idx < 0 ? ids.length : idx, 0, id);
    onOrdenar(estado, ids, id);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNAS.map((col) => {
        const items = tareas.filter((t) => t.estado === col.estado).sort(orden);
        const horasCol = items.reduce((s, t) => s + Number(t.horas_estimadas ?? 0), 0);
        const activa = over?.estado === col.estado;
        return (
          <div
            key={col.estado}
            onDragOver={(e) => {
              e.preventDefault();
              if (over?.estado !== col.estado || over?.antesDe !== null) setOver({ estado: col.estado, antesDe: null });
            }}
            onDrop={(e) => {
              e.preventDefault();
              soltar(col.estado, items, null);
            }}
            className={`rounded-lg border-hair p-2 transition-colors ${
              activa ? "border-sage bg-sage-tint/40" : "border-border bg-beige-light/50"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 px-1 pt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${col.barra}`} />
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-secondary">
                {col.titulo}
              </span>
              {horasCol > 0 && (
                <span className="rounded-pill bg-sage-tint px-2 py-0.5 text-[10.5px] font-semibold text-sage">
                  ~{num(horasCol, 1)} h
                </span>
              )}
              <span className="ml-auto rounded-pill bg-white px-2 py-0.5 text-[11px] tabular text-ink-muted">
                {items.length}
              </span>
            </div>
            <div className="min-h-[40px] space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setOver(null); }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (t.id !== dragId && (over?.antesDe !== t.id || over?.estado !== col.estado)) {
                      setOver({ estado: col.estado, antesDe: t.id });
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soltar(col.estado, items, t.id);
                  }}
                  className={`cursor-grab rounded-md active:cursor-grabbing ${
                    dragId === t.id ? "opacity-40" : ""
                  } ${activa && over?.antesDe === t.id ? "border-t-2 border-sage pt-1" : ""}`}
                >
                  <TarjetaTarea t={t} hoy={hoy} personas={personas} onDone={onDone} compacta />
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-3 text-center text-[11px] text-ink-muted">— suéltala aquí —</p>
              )}
            </div>
          </div>
        );
      })}
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
  const [horas, setHoras] = React.useState("");
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
        horasEstimadas: horas ? Number(horas.replace(",", ".")) : null,
      });
      setOpen(false);
      setTitulo(""); setDescripcion(""); setPara(""); setPrioridad("normal"); setFechaLimite(""); setHoras(""); setOpId("");
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
        <Field label="Horas estim.">
          <Input type="number" step="0.5" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="p. ej. 2" className="text-right tabular" />
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
  compacta = false,
}: {
  t: Tarea;
  hoy: string;
  personas: string[];
  onDone: () => void;
  compacta?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [editando, setEditando] = React.useState(false);
  const [comentando, setComentando] = React.useState(false);
  const [comentario, setComentario] = React.useState(t.comentario ?? "");
  const [titulo, setTitulo] = React.useState(t.titulo);
  const [descripcion, setDescripcion] = React.useState(t.descripcion ?? "");
  const [prioridad, setPrioridad] = React.useState<string>(t.prioridad);
  const [fechaLimite, setFechaLimite] = React.useState(t.fecha_limite ?? "");
  const [horas, setHoras] = React.useState(t.horas_estimadas != null ? String(t.horas_estimadas) : "");

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
                <Input type="number" step="0.5" min="0" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="h estim." className="w-[90px] text-right tabular" />
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    await act({ titulo, descripcion, prioridad, fechaLimite, horasEstimadas: horas ? Number(horas.replace(",", ".")) : null });
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
                {t.horas_estimadas != null && t.horas_estimadas > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-sage-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-sage">
                    ~{num(Number(t.horas_estimadas), 1)} h
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
          {!compacta && (
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
          )}
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
