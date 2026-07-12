"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Pencil, MessageCircle, CalendarClock, Link2, X, ListChecks, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { crearTarea, actualizarTarea, borrarTarea, ordenarTareas, crearTareasPlantilla, crearParteHoras } from "@/app/actions";
import { fecha as fmtFecha, num } from "@/lib/format";
import { plantillaPara } from "@/lib/plantillas-tareas";
import { TIPO_EVENTO_LABEL } from "@/lib/estados";
import { normalizarChecklist, contarChecklist } from "@/lib/checklist";
import type { Tarea, TareaEstado, TareaPrioridad, ChecklistGrupo, ChecklistItem } from "@/lib/types";

// Personas asignadas de una tarea (soporta tareas compartidas y datos antiguos).
function asignadosDe(t: Tarea): string[] {
  const arr = (t.asignados ?? []).filter(Boolean);
  return arr.length ? arr : t.asignada_a ? [t.asignada_a] : [];
}
function perteneceA(t: Tarea, persona: string): boolean {
  return asignadosDe(t).includes(persona);
}

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
  // El estado guardado sigue siendo `no_puedo` (sin migración), pero para el
  // equipo pasa a significar "En revisión".
  no_puedo: "En revisión",
};

// Columnas del tablero (estilo Trello), en orden de flujo.
const COLUMNAS: { estado: TareaEstado; titulo: string; barra: string }[] = [
  { estado: "pendiente", titulo: "Pendiente", barra: "bg-ink-muted" },
  { estado: "en_curso", titulo: "En curso", barra: "bg-clay" },
  { estado: "no_puedo", titulo: "En revisión", barra: "bg-sage" },
  { estado: "hecha", titulo: "Hecha ✓", barra: "bg-ok" },
];

type OpLite = { id: string; titulo: string; tipoEvento?: string | null; fechaEvento?: string | null };

type EquipoInfo = { nombre: string; id: string; precioHora: number };

// ---------- Personas asignadas (tarea compartida) ----------
// Chips seleccionables. La primera elegida es la principal (avisos / horas).
function AsignadosPicker({
  personas,
  valor,
  onChange,
}: {
  personas: string[];
  valor: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(p: string) {
    onChange(valor.includes(p) ? valor.filter((x) => x !== p) : [...valor, p]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {personas.map((p) => {
        const idx = valor.indexOf(p);
        const activo = idx >= 0;
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={`inline-flex items-center gap-1 rounded-pill border-med px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              activo ? "border-sage bg-sage text-cream" : "border-border bg-white text-ink-secondary hover:border-sage-300"
            }`}
          >
            {activo && <Check size={12} />}
            {p}
            {idx === 0 && valor.length > 1 && <span className="ml-0.5 text-[9.5px] opacity-80">principal</span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Checklist (varias listas con nombre, estilo Trello) ----------
// Barra de progreso global de todas las listas: "3/5" + barra salvia.
function ProgresoChecklist({ grupos, className = "" }: { grupos: ChecklistGrupo[]; className?: string }) {
  const { total, hechos, pct, completa } = contarChecklist(grupos);
  if (total === 0) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ListChecks size={12} className={completa ? "text-ok" : "text-ink-muted"} />
      <span className={`text-[10.5px] font-semibold tabular ${completa ? "text-ok" : "text-ink-muted"}`}>
        {hechos}/{total}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-beige-warm">
        <div className={`h-full rounded-pill transition-all ${completa ? "bg-ok" : "bg-sage"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Listas marcables dentro de la tarjeta: cada paso se tacha al pincharlo y se
// guarda al momento. onToggle recibe los grupos ya actualizados.
function ChecklistTarjeta({
  grupos,
  onToggle,
  disabled,
}: {
  grupos: ChecklistGrupo[];
  onToggle: (nuevos: ChecklistGrupo[]) => void;
  disabled?: boolean;
}) {
  if (grupos.length === 0) return null;
  function toggleItem(gi: number, ii: number) {
    onToggle(
      grupos.map((g, j) =>
        j === gi ? { ...g, items: g.items.map((it, k) => (k === ii ? { ...it, hecho: !it.hecho } : it)) } : g,
      ),
    );
  }
  return (
    <div className="space-y-2.5 rounded-md bg-beige-light/70 p-2.5">
      <ProgresoChecklist grupos={grupos} />
      {grupos.map((g, gi) => (
        <div key={gi} className="space-y-0.5">
          {g.titulo && (
            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-secondary">{g.titulo}</div>
          )}
          {g.items.map((it, ii) => (
            <button
              key={ii}
              type="button"
              disabled={disabled}
              onClick={() => toggleItem(gi, ii)}
              className="flex w-full items-start gap-2 rounded-sm px-1 py-1 text-left text-[12.5px] hover:bg-white/70 disabled:opacity-60"
            >
              <span
                className={`mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border-med ${
                  it.hecho ? "border-ok bg-ok text-white" : "border-border-strong bg-white"
                }`}
              >
                {it.hecho && <Check size={11} strokeWidth={3} />}
              </span>
              <span className={it.hecho ? "text-ink-muted line-through" : "text-ink-secondary"}>{it.texto}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// Editor de checklists para los formularios: varias listas con nombre, y en
// cada una añadir / renombrar / marcar / borrar pasos.
function ChecklistEditor({
  grupos,
  onChange,
}: {
  grupos: ChecklistGrupo[];
  onChange: (grupos: ChecklistGrupo[]) => void;
}) {
  const setGrupo = (gi: number, patch: Partial<ChecklistGrupo>) =>
    onChange(grupos.map((g, j) => (j === gi ? { ...g, ...patch } : g)));
  const setItems = (gi: number, items: ChecklistItem[]) => setGrupo(gi, { items });

  return (
    <div className="space-y-3">
      {grupos.length > 0 && <ProgresoChecklist grupos={grupos} className="px-0.5" />}
      {grupos.map((g, gi) => (
        <div key={gi} className="space-y-2 rounded-md border-hair border-border bg-white/60 p-2.5">
          <div className="flex items-center gap-2">
            <ListChecks size={14} className="shrink-0 text-sage" />
            <Input
              value={g.titulo}
              onChange={(e) => setGrupo(gi, { titulo: e.target.value })}
              placeholder="Título de la lista (p. ej. Montaje)"
              className="py-2 text-[13.5px] font-semibold"
            />
            <button
              type="button"
              onClick={() => onChange(grupos.filter((_, j) => j !== gi))}
              className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
              title="Quitar esta lista"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {g.items.map((it, ii) => (
            <div key={ii} className="flex items-center gap-2 pl-1">
              <button
                type="button"
                onClick={() => setItems(gi, g.items.map((x, k) => (k === ii ? { ...x, hecho: !x.hecho } : x)))}
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-med ${
                  it.hecho ? "border-ok bg-ok text-white" : "border-border-strong bg-white"
                }`}
                title={it.hecho ? "Marcar sin hacer" : "Marcar hecho"}
              >
                {it.hecho && <Check size={12} strokeWidth={3} />}
              </button>
              <Input
                value={it.texto}
                onChange={(e) => setItems(gi, g.items.map((x, k) => (k === ii ? { ...x, texto: e.target.value } : x)))}
                className={`py-2 text-[13.5px] ${it.hecho ? "text-ink-muted line-through" : ""}`}
              />
              <button
                type="button"
                onClick={() => setItems(gi, g.items.filter((_, k) => k !== ii))}
                className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
                title="Quitar paso"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <PasoNuevo onAdd={(texto) => setItems(gi, [...g.items, { texto, hecho: false }])} />
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={() => onChange([...grupos, { titulo: "", items: [] }])}
      >
        <Plus size={13} /> Añadir lista
      </Button>
    </div>
  );
}

// Campo "añadir paso" (Enter para añadir). Aislado para no re-teclear.
function PasoNuevo({ onAdd }: { onAdd: (texto: string) => void }) {
  const [texto, setTexto] = React.useState("");
  function add() {
    const t = texto.trim();
    if (!t) return;
    onAdd(t);
    setTexto("");
  }
  return (
    <div className="flex gap-2 pl-1">
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        placeholder="Añadir un paso y pulsar Enter…"
        className="py-2 text-[13.5px]"
      />
      <Button size="sm" variant="ghost" type="button" onClick={add} disabled={!texto.trim()}>
        <Plus size={13} /> Paso
      </Button>
    </div>
  );
}

export function TareasClient({
  tareas,
  oportunidades,
  personas,
  equipoInfo = [],
  hoy,
}: {
  tareas: Tarea[];
  oportunidades: OpLite[];
  personas: string[];
  equipoInfo?: EquipoInfo[];
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

  const visiblesPersona = tareas.filter((t) => !filtroPersona || perteneceA(t, filtroPersona));
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

  const pendientesDeYo = yo ? tareas.filter((t) => perteneceA(t, yo) && t.estado !== "hecha").length : 0;

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

      <div className="flex flex-wrap items-start gap-2">
        <NuevaTarea personas={personas} oportunidades={oportunidades} yo={yo} onDone={r} />
        <PlantillaTareas personas={personas} oportunidades={oportunidades} yo={yo} onDone={r} />
      </div>

      {vista === "tablero" ? (
        <Tablero tareas={visiblesPersona} hoy={hoy} personas={personas} oportunidades={oportunidades} equipoInfo={equipoInfo} onOrdenar={ordenar} onDone={r} />
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
              <TarjetaTarea key={t.id} t={t} hoy={hoy} personas={personas} oportunidades={oportunidades} equipoInfo={equipoInfo} onDone={r} />
            ))}
          </div>

          {/* Hechas */}
          {filtroEstado !== "abiertas" && hechas.length > 0 && (
            <div className="space-y-2.5">
              <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Hechas recientemente
              </p>
              {hechas.map((t) => (
                <TarjetaTarea key={t.id} t={t} hoy={hoy} personas={personas} oportunidades={oportunidades} equipoInfo={equipoInfo} onDone={r} />
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
  oportunidades,
  equipoInfo,
  onOrdenar,
  onDone,
}: {
  tareas: Tarea[];
  hoy: string;
  personas: string[];
  oportunidades: OpLite[];
  equipoInfo: EquipoInfo[];
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
                  <TarjetaTarea t={t} hoy={hoy} personas={personas} oportunidades={oportunidades} equipoInfo={equipoInfo} onDone={onDone} compacta />
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
  const [para, setPara] = React.useState<string[]>([]);
  const [de, setDe] = React.useState(yo);
  const [prioridad, setPrioridad] = React.useState("normal");
  const [fechaLimite, setFechaLimite] = React.useState("");
  const [horas, setHoras] = React.useState("");
  const [opId, setOpId] = React.useState("");
  const [checklist, setChecklist] = React.useState<ChecklistGrupo[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setDe(yo), [yo]);

  async function guardar() {
    if (!titulo.trim() || para.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await crearTarea({
        titulo,
        descripcion: descripcion || null,
        asignadaA: para[0],
        asignados: para,
        creadaPor: de || null,
        prioridad,
        fechaLimite: fechaLimite || null,
        oportunidadId: opId || null,
        horasEstimadas: horas ? Number(horas.replace(",", ".")) : null,
        checklist,
      });
      setOpen(false);
      setTitulo(""); setDescripcion(""); setPara([]); setPrioridad("normal"); setFechaLimite(""); setHoras(""); setOpId(""); setChecklist([]);
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
    <div className="w-full space-y-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4">
      <Field label="Tarea *">
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Preparar los centros de la boda…" autoFocus />
      </Field>
      <Field label="Descripción">
        <Textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={"Explica la tarea: cómo, dónde, con qué…\nPuedes usar varias líneas o viñetas (- …)."}
          rows={3}
        />
      </Field>
      <Field label="Pasos (checklist)">
        <ChecklistEditor grupos={checklist} onChange={setChecklist} />
      </Field>
      <Field label="Para * (puedes elegir varias personas)">
        <AsignadosPicker personas={personas} valor={para} onChange={setPara} />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <Button size="sm" onClick={guardar} disabled={busy || !titulo.trim() || para.length === 0}>
          {busy ? "Guardando…" : "Asignar tarea"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

// ---------- Generar tareas desde plantilla (por tipo de evento) ----------
function PlantillaTareas({
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
  const [opId, setOpId] = React.useState("");
  const [tipo, setTipo] = React.useState("boda");
  const [para, setPara] = React.useState(yo);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setPara(yo), [yo]);

  const op = oportunidades.find((o) => o.id === opId);
  // Al elegir un evento, se usa su tipo (y su fecha para las fechas límite).
  const tipoEfectivo = op?.tipoEvento || tipo;
  const items = plantillaPara(tipoEfectivo);

  // Tipos de evento ofrecidos (los que tienen plantilla propia + genérico).
  const tiposEvento = ["boda", "comunion", "corporativo", "cumpleanos", "bautizo", "navidad", "alquiler_encargo", "otro"];

  async function generar() {
    if (!para) return;
    setBusy(true);
    setError(null);
    try {
      const n = await crearTareasPlantilla({
        items,
        asignadaA: para,
        creadaPor: yo || null,
        oportunidadId: opId || null,
        fechaEvento: op?.fechaEvento || null,
      });
      setOpen(false);
      setOpId("");
      onDone();
      // Pequeño aviso visual: no bloqueamos, el refresco muestra las tareas.
      void n;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus size={14} /> Plantilla de evento
      </Button>
    );
  }
  return (
    <div className="w-full space-y-3 rounded-md border-hair border-clay/40 bg-clay-tint/30 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Para un evento (opcional)">
          <Select value={opId} onChange={(e) => setOpId(e.target.value)}>
            <option value="">— Sin vincular —</option>
            {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
          </Select>
        </Field>
        <Field label="Tipo de evento">
          <Select value={tipoEfectivo} onChange={(e) => setTipo(e.target.value)} disabled={Boolean(op?.tipoEvento)}>
            {tiposEvento.map((t) => <option key={t} value={t}>{TIPO_EVENTO_LABEL[t] ?? t}</option>)}
          </Select>
        </Field>
        <Field label="Asignar todas a *">
          <Select value={para} onChange={(e) => setPara(e.target.value)}>
            <option value="">—</option>
            {personas.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
      </div>
      <div className="rounded-md bg-white/60 p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Se crearán {items.length} tareas
        </p>
        <ol className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-[12px] text-ink-secondary sm:grid-cols-2">
          {items.map((it, i) => (
            <li key={i} className="tabular">
              {i + 1}. {it.titulo}
              {it.horas ? <span className="ml-1 text-ink-muted">~{num(it.horas, 1)} h</span> : ""}
            </li>
          ))}
        </ol>
        {op?.fechaEvento && (
          <p className="mt-2 text-[11px] text-ink-muted">
            El montaje y la recogida cogen fecha a partir del {fmtFecha(op.fechaEvento)}.
          </p>
        )}
      </div>
      {error && <p className="text-caption text-error">{error}</p>}
      <div className="flex justify-end gap-1">
        <Button size="sm" onClick={generar} disabled={busy || !para}>
          {busy ? "Creando…" : `Crear ${items.length} tareas`}
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
  oportunidades,
  equipoInfo = [],
  onDone,
  compacta = false,
}: {
  t: Tarea;
  hoy: string;
  personas: string[];
  oportunidades: OpLite[];
  equipoInfo?: EquipoInfo[];
  onDone: () => void;
  compacta?: boolean;
}) {
  const [busy, setBusy] = React.useState(false);
  const [editando, setEditando] = React.useState(false);
  const [comentando, setComentando] = React.useState(false);
  const [comentario, setComentario] = React.useState(t.comentario ?? "");
  const [titulo, setTitulo] = React.useState(t.titulo);
  const [descripcion, setDescripcion] = React.useState(t.descripcion ?? "");
  const [para, setPara] = React.useState<string[]>(asignadosDe(t));
  const [de, setDe] = React.useState(t.creada_por ?? "");
  const [prioridad, setPrioridad] = React.useState<string>(t.prioridad);
  const [fechaLimite, setFechaLimite] = React.useState(t.fecha_limite ?? "");
  const [horas, setHoras] = React.useState(t.horas_estimadas != null ? String(t.horas_estimadas) : "");
  const [opId, setOpId] = React.useState(t.oportunidad?.id ?? "");
  const [checklistEdit, setChecklistEdit] = React.useState<ChecklistGrupo[]>(normalizarChecklist(t.checklist));

  const asignados = asignadosDe(t);
  const checklist = normalizarChecklist(t.checklist);
  const checklistCuenta = contarChecklist(checklist);

  // Al abrir el editor, refresca los campos con lo último de la tarea.
  function abrirEdicion() {
    setTitulo(t.titulo);
    setDescripcion(t.descripcion ?? "");
    setPara(asignadosDe(t));
    setDe(t.creada_por ?? "");
    setPrioridad(t.prioridad);
    setFechaLimite(t.fecha_limite ?? "");
    setHoras(t.horas_estimadas != null ? String(t.horas_estimadas) : "");
    setOpId(t.oportunidad?.id ?? "");
    setChecklistEdit(normalizarChecklist(t.checklist));
    setEditando(true);
  }

  async function guardarEdicion() {
    if (!titulo.trim() || para.length === 0) return;
    await act({
      titulo,
      descripcion: descripcion || null,
      asignadaA: para[0],
      asignados: para,
      creadaPor: de || null,
      prioridad,
      fechaLimite: fechaLimite || null,
      horasEstimadas: horas ? Number(horas.replace(",", ".")) : null,
      oportunidadId: opId || null,
      checklist: checklistEdit,
    });
    setEditando(false);
  }

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

  // Al marcar HECHA: si la tarea está vinculada a un evento, tiene horas
  // estimadas y quien la hizo es del equipo, ofrece imputar esas horas al
  // evento (cierra el círculo horas → sueldos sin volver a teclearlas).
  const persona = equipoInfo.find((e) => e.nombre === t.asignada_a);
  const puedeImputar = !hecha && Boolean(t.oportunidad) && Number(t.horas_estimadas ?? 0) > 0 && Boolean(persona);

  async function marcarHecha() {
    setBusy(true);
    try {
      await actualizarTarea(t.id, { estado: "hecha" });
      if (puedeImputar && persona && t.oportunidad) {
        const h = Number(t.horas_estimadas);
        if (
          window.confirm(
            `¿Imputar ~${num(h, 1)} h de "${t.titulo}" a ${t.asignada_a} en «${t.oportunidad.titulo}»?`,
          )
        ) {
          await crearParteHoras({
            oportunidadId: t.oportunidad.id,
            equipoId: persona.id,
            tarea: t.titulo,
            horas: h,
            precioHora: persona.precioHora,
            fecha: hoy,
            fase: "pre",
          });
        }
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className={`space-y-2 p-4 ${hecha ? "opacity-60" : ""} ${
        vencida ? "border-l-[3px] border-l-error" : t.estado === "no_puedo" ? "border-l-[3px] border-l-sage" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
              {/* En el Tablero (compacta) la tarjeta va limpia: la descripción
                  solo se ve en la vista Lista y al editar. Se respetan los
                  saltos de línea y viñetas del texto. */}
              {!compacta && t.descripcion && (
                <p className="mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-secondary">{t.descripcion}</p>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  {t.creada_por ? `${t.creada_por} → ` : ""}
                  {asignados.length > 1 && <Users size={12} className="text-sage" />}
                  <b className="text-ink-secondary">{asignados.join(" · ") || t.asignada_a}</b>
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
                {/* En el tablero, un contador compacto de pasos (la lista
                    completa solo en la vista Lista para no recargar la tarjeta). */}
                {compacta && checklistCuenta.total > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-[10.5px] font-semibold ${
                      checklistCuenta.completa ? "bg-ok-tint text-ok" : "bg-beige-warm text-ink-muted"
                    }`}
                  >
                    <ListChecks size={11} /> {checklistCuenta.hechos}/{checklistCuenta.total}
                  </span>
                )}
                {t.oportunidad && (
                  <Link href={`/oportunidades/${t.oportunidad.id}`} className="inline-flex items-center gap-1 text-sage hover:underline">
                    <Link2 size={12} /> {t.oportunidad.titulo}
                  </Link>
                )}
              </p>
            </>
        </div>

        <div className="flex items-center gap-1.5">
          {!compacta && (
            <select
              value={t.estado}
              disabled={busy}
              onChange={(e) => (e.target.value === "hecha" ? marcarHecha() : act({ estado: e.target.value }))}
              className={`rounded-sm border-hair border-border px-2 py-1.5 text-[12px] font-medium ${
                hecha ? "bg-ok-tint text-ok" : t.estado === "no_puedo" ? "bg-sage-tint text-sage" : "bg-beige-light"
              }`}
            >
              {(Object.keys(ESTADO) as TareaEstado[]).map((e) => (
                <option key={e} value={e}>{ESTADO[e]}</option>
              ))}
            </select>
          )}
          {!hecha && (
            <button
              title={puedeImputar ? "Marcar hecha e imputar sus horas al evento" : "Marcar como hecha"}
              disabled={busy}
              onClick={marcarHecha}
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
            onClick={abrirEdicion}
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

      {/* Checklists marcables (solo en la vista Lista; se guardan al momento) */}
      {!compacta && checklist.length > 0 && (
        <ChecklistTarjeta grupos={checklist} onToggle={(nuevos) => act({ checklist: nuevos })} disabled={busy} />
      )}

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

      {/* Editar tarea: misma vista que al crear una tarea */}
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent title="Editar tarea">
          <div className="space-y-3">
            <Field label="Tarea *">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Preparar los centros de la boda…" autoFocus />
            </Field>
            <Field label="Descripción">
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={"Explica la tarea: cómo, dónde, con qué…\nPuedes usar varias líneas o viñetas (- …)."}
                rows={3}
              />
            </Field>
            <Field label="Pasos (checklist)">
              <ChecklistEditor grupos={checklistEdit} onChange={setChecklistEdit} />
            </Field>
            <Field label="Para * (puedes elegir varias personas)">
              <AsignadosPicker personas={personas} valor={para} onChange={setPara} />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="De">
                <Select value={de} onChange={(e) => setDe(e.target.value)}>
                  <option value="">—</option>
                  {personas.map((pn) => <option key={pn} value={pn}>{pn}</option>)}
                </Select>
              </Field>
              <Field label="Prioridad">
                <Select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                  {ORDEN_PRIORIDAD.map((x) => <option key={x} value={x}>{PRIORIDAD[x].label}</option>)}
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
            <div className="flex justify-end gap-1">
              <Button size="sm" onClick={guardarEdicion} disabled={busy || !titulo.trim() || para.length === 0}>
                {busy ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
