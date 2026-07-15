"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Video, MapPin, ExternalLink, Check, FileText, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { crearReunion, toggleReunionRealizada, borrarReunion, guardarTranscripcionReunion, solicitarUnionReunion } from "@/app/actions";
import { fecha as fmtFecha } from "@/lib/format";
import type { Reunion } from "@/lib/types";

export function ReunionesTab({
  oportunidadId,
  reuniones,
  responsables,
}: {
  oportunidadId: string;
  reuniones: Reunion[];
  responsables: string[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = React.useState(false);
  const [fecha, setFecha] = React.useState("");
  const [hora, setHora] = React.useState("");
  const [modalidad, setModalidad] = React.useState<"presencial" | "online">("presencial");
  const [atiende, setAtiende] = React.useState("");
  const [enlace, setEnlace] = React.useState("");
  const [lugar, setLugar] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function guardar() {
    if (!fecha) return;
    setBusy("new");
    setError(null);
    try {
      await crearReunion({
        oportunidadId,
        fecha,
        hora: hora || null,
        modalidad,
        atendidaPor: atiende || null,
        enlace: modalidad === "online" ? enlace || null : null,
        lugar: modalidad === "presencial" ? lugar || null : null,
        notas: notas || null,
      });
      setAbierto(false);
      setFecha(""); setHora(""); setEnlace(""); setLugar(""); setNotas("");
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
        <span className="text-[12px] text-ink-muted">
          {reuniones.length === 0
            ? "Sin reuniones programadas"
            : `${reuniones.length} reunión${reuniones.length === 1 ? "" : "es"}`}
        </span>
        <Button size="sm" variant="outline" onClick={() => setAbierto((v) => !v)}>
          <Plus size={14} /> {abierto ? "Cerrar" : "Nueva reunión"}
        </Button>
      </div>

      {abierto && (
        <div className="space-y-3 rounded-md border-hair border-sage-tint-deep bg-sage-tint/40 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Fecha">
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} autoFocus />
            </Field>
            <Field label="Hora">
              {/* Desplegables propios: horas y minutos de 5 en 5 */}
              <div className="flex items-center gap-1.5">
                <select
                  value={hora ? hora.split(":")[0] : ""}
                  onChange={(e) => {
                    const h = e.target.value;
                    setHora(h ? `${h}:${hora ? hora.split(":")[1] : "00"}` : "");
                  }}
                  className="w-full rounded-sm border-med border-border bg-white px-2 py-2 text-center text-[14px] tabular focus:border-sage-300 focus:outline-none"
                >
                  <option value="">--</option>
                  {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-[14px] font-semibold text-ink-muted">:</span>
                <select
                  value={hora ? hora.split(":")[1] : ""}
                  disabled={!hora}
                  onChange={(e) => setHora(`${hora.split(":")[0]}:${e.target.value}`)}
                  className="w-full rounded-sm border-med border-border bg-white px-2 py-2 text-center text-[14px] tabular focus:border-sage-300 focus:outline-none disabled:opacity-50"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Modalidad">
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as "presencial" | "online")}
                className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[14px] focus:border-sage-300 focus:outline-none"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </Field>
            <Field label="La atiende">
              <select
                value={atiende}
                onChange={(e) => setAtiende(e.target.value)}
                className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[14px] focus:border-sage-300 focus:outline-none"
              >
                <option value="">—</option>
                {responsables.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          {modalidad === "online" ? (
            <Field label="Enlace de la videollamada (Teams, Meet, Zoom…)">
              <Input
                type="url"
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                placeholder="https://teams.microsoft.com/…"
              />
            </Field>
          ) : (
            <Field label="Dónde">
              <Input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Estudio, finca, cafetería…"
              />
            </Field>
          )}

          <Field label="Notas">
            <Input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Qué se va a tratar, qué llevar…"
            />
          </Field>

          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={guardar} disabled={busy === "new" || !fecha}>
              {busy === "new" ? "Guardando…" : "Guardar reunión"}
            </Button>
          </div>
        </div>
      )}

      {reuniones.length === 0 ? (
        <p className="py-2 text-small text-ink-muted">
          Programa aquí las reuniones con los novios: aparecerán también en el calendario.
        </p>
      ) : (
        <div className="space-y-2">
          {reuniones.map((r) => (
            <ReunionRow key={r.id} r={r} oportunidadId={oportunidadId} />
          ))}
        </div>
      )}
    </div>
  );
}

// Una reunión: cabecera con datos + acciones, y un panel plegable para la
// transcripción/acta de la llamada (se pega lo que genere Granola).
function ReunionRow({ r, oportunidadId }: { r: Reunion; oportunidadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [verTrans, setVerTrans] = React.useState(false);
  const [texto, setTexto] = React.useState(r.transcripcion ?? "");
  const [guardando, setGuardando] = React.useState(false);
  const [pidiendo, setPidiendo] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const tieneTrans = Boolean((r.transcripcion ?? "").trim());

  async function pedirUnion() {
    setPidiendo(true);
    try {
      const res = await solicitarUnionReunion(r.id, oportunidadId);
      if (res.ok) alert(`Aviso enviado a los socios (${res.destinatarios} destinatario${res.destinatarios === 1 ? "" : "s"}).`);
      else if (res.skipped) alert("El email aún no está configurado (falta la clave de envío o los correos de los socios). Avísame para activarlo.");
      else alert(`No se pudo enviar: ${res.error ?? "error desconocido"}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPidiendo(false);
    }
  }

  async function guardarTrans() {
    setGuardando(true);
    setError(null);
    try {
      await guardarTranscripcionReunion(r.id, oportunidadId, texto);
      setVerTrans(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={`rounded-md border-hair border-border bg-white ${r.realizada ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
            {r.modalidad === "online" ? (
              <Video size={14} className="shrink-0 text-[#7D6BA6]" />
            ) : (
              <MapPin size={14} className="shrink-0 text-clay" />
            )}
            <span>
              {fmtFecha(r.fecha)}
              {r.hora ? ` · ${r.hora.slice(0, 5)}h` : ""}
            </span>
            <span className="rounded-pill bg-beige-warm px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-secondary">
              {r.modalidad === "online" ? "Online" : "Presencial"}
            </span>
            {r.realizada && (
              <span className="rounded-pill bg-ok-tint px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ok">
                Hecha
              </span>
            )}
            {tieneTrans && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-sage-tint px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage">
                <FileText size={11} /> Acta
              </span>
            )}
          </div>
          <small className="text-[11.5px] text-ink-muted">
            {r.atendida_por ? `La atiende ${r.atendida_por}` : "Sin responsable asignado"}
            {r.modalidad === "presencial" && r.lugar ? ` · ${r.lugar}` : ""}
            {r.notas ? ` · ${r.notas}` : ""}
          </small>
        </div>

        <div className="flex items-center gap-1.5">
          {r.modalidad === "online" && r.enlace && (
            <a
              href={r.enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#7D6BA6] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:opacity-90"
            >
              <ExternalLink size={12} /> Unirse
            </a>
          )}
          <button
            title="Pedir a los socios que se unan (les llega un email con el enlace)"
            disabled={pidiendo}
            onClick={pedirUnion}
            className="inline-flex items-center gap-1.5 rounded-sm border-med border-border-strong px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-secondary hover:bg-beige-warm disabled:opacity-60"
          >
            <UserPlus size={13} /> {pidiendo ? "Enviando…" : "Pedir unión"}
          </button>
          <button
            title={tieneTrans ? "Ver / editar la transcripción" : "Añadir transcripción de la llamada"}
            onClick={() => setVerTrans((v) => !v)}
            className={`rounded-sm p-1.5 ${
              tieneTrans ? "bg-sage-tint text-sage" : "text-ink-muted hover:bg-sage-tint hover:text-sage"
            }`}
          >
            <FileText size={14} />
          </button>
          <button
            title={r.realizada ? "Marcar como pendiente" : "Marcar como hecha"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await toggleReunionRealizada(r.id, !r.realizada, oportunidadId);
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
            className={`rounded-sm p-1.5 ${
              r.realizada ? "bg-ok-tint text-ok" : "text-ink-muted hover:bg-ok-tint hover:text-ok"
            }`}
          >
            <Check size={14} />
          </button>
          <button
            title="Borrar reunión"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await borrarReunion(r.id, oportunidadId);
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-sm p-1.5 text-ink-muted hover:bg-error-tint hover:text-error"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {verTrans && (
        <div className="border-t border-border p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Transcripción / acta de la llamada
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pega aquí la transcripción de Granola (o el acta de la reunión)…"
            rows={8}
            className="w-full rounded-sm border-med border-border bg-white px-3 py-2 text-[12.5px] leading-relaxed focus:border-sage-300 focus:outline-none"
          />
          {error && <p className="mt-1.5 text-caption text-error">{error}</p>}
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setTexto(r.transcripcion ?? ""); setVerTrans(false); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={guardarTrans} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar transcripción"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
